const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const stream = require('stream');
const glob = require('glob');
const args = require('optimist').argv;
const _ = require('lodash');
const unzipper = require('unzipper');
const uuidv4 = require('uuid/v4');
const $ = require('cheerio');
const { mongoConnect, setUpdateAtIfRecordChanged, conditionForActualRecord } = require('../util/mongo');
const { downloadUsingWget } = require('../util/download');
const SplDataParser = require('./spl_data_parser');

const { getAxiosProxySettings, getWgetProxyParams } = require('../util/proxy');
// eslint-disable-next-line import/order
const axios = require('axios').create(getAxiosProxySettings());

const FILE_INFOS_URL = 'https://dailymed.nlm.nih.gov/dailymed/spl-resources-all-drug-labels.cfm';

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const splCollectionName = args.splCollectionName || 'spl';
// For now we handle all dirs (add as param?)
const DIRS_TO_HANDLE = ['animal', 'homeopathic', 'otc', 'other', 'prescription'];
const RELEASE_TYPES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  FULL: 'full',
};
const releaseType = args.releaseType || 'weekly';
const releaseFrom = args.from;
const releaseTo = args.to;

let zipDestinationDir;
if (!_.isString(args.zipDestinationDir)) {
  zipDestinationDir = path.join(__dirname, './resources', 'zip');
} else {
  zipDestinationDir = path.resolve(args.zipDestinationDir);
}

if (!_.isString(args.uploadDir)) {
  console.log(`Please specify 'uploadDir' param. It must be a full path.`);
  process.exit(1);
}
const { uploadDir, relativePath = '/assets/img/spl' } = args;

async function handleSplZipUnpackingWholeZip(tempZipPath, dbCon, pathToRealZip) {
  const tempExtractZipPath = `/tmp/${uuidv4()}`;
  // fs.readdir sometimes misses .xml if extract with streamToPromise, but its ok with creating new Promise
  // const extractStream = fs.createReadStream(tempZipPath)
  //   .pipe(unzipper.Extract({ path: tempExtractZipPath }));
  // await streamToPromise(extractStream);

  await new Promise(resolve => {
    fs.createReadStream(tempZipPath)
      .pipe(unzipper.Extract({ path: tempExtractZipPath }))
      .on('finish', () => resolve());
  });

  try {
    const files = await fs.readdir(tempExtractZipPath);
    const xmlFile = files.filter(f => f.endsWith('.xml'))[0];
    if (!xmlFile) {
      throw new Error(`Unable to find xml file in ${pathToRealZip}: ${JSON.stringify(files)}`);
    }

    const xmlFilePath = path.join(tempExtractZipPath, xmlFile);
    const splDataParser = new SplDataParser(xmlFilePath, uploadDir, relativePath);
    const splDoc = await splDataParser.getData();

    const pathToXml = path.join(pathToRealZip, xmlFile);
    const dbCollection = dbCon.collection(splCollectionName);

    return upsertSplDoc(splDoc, dbCollection, pathToXml);
  } catch (e) {
    console.error(`Error occurred while handling ${pathToRealZip}`, e.stack);
  } finally {
    await fs.remove(tempExtractZipPath);
  }
}

function writeFile(fileStream, filePath) {
  return new Promise((resolve, reject) => {
    fileStream
      .pipe(fs.createWriteStream(filePath))
      .on('finish', () => resolve())
      .on('error', err => reject(err));
  });
}

async function handleZipWithZips(zipPath, dirsToHandle, dbCon) {
  const zipStream = fs.createReadStream(zipPath).pipe(unzipper.Parse());
  const fileToHandleReg = new RegExp(`^(${dirsToHandle.join('|')}).+\.zip$`);

  return new Promise(resolve => {
    zipStream
      .pipe(
        stream.Transform({
          objectMode: true,
          async transform(entry, e, cb) {
            try {
              const { type, path: filePath } = entry;
              if (type === 'File' && fileToHandleReg.test(filePath)) {
                const pathToRealZip = path.join(zipPath, filePath);
                const tempZipPath = `/tmp/${uuidv4()}`;
                console.log(`Handling ${pathToRealZip}`);
                // await streamToPromise(entry.pipe(fs.createWriteStream(tempZipPath)));
                await writeFile(entry, tempZipPath);
                await handleSplZipUnpackingWholeZip(tempZipPath, dbCon, pathToRealZip);
                await fs.unlink(tempZipPath);
              } else {
                console.log(`Skipping file ${filePath}`);
                entry.autodrain();
              }
            } catch (err) {
              console.log(`Error occurred while handling ${zipPath}`, err.stack);
              entry.autodrain();
            } finally {
              cb();
            }
          },
        })
      )
      .on('finish', () => resolve())
      .on('error', e => {
        console.log(`Error while extracting zip files from zip ${zipPath}. ${e.stack}`);
        resolve();
      });
  });
}

function getSelectorForType(type) {
  return `li[data-ddfilter="${type}"] a`;
}

function getLinksForType(html, type) {
  return $(getSelectorForType(type), html)
    .map((i, e) => $(e).attr('href'))
    .toArray();
}

function getFileLinks() {
  if (releaseType === RELEASE_TYPES.WEEKLY) {
    return getWeeklyRelease();
  }
  if (releaseType === RELEASE_TYPES.MONTHLY) {
    return getMonthlyReleaseFileInfos(releaseFrom, releaseTo);
  }
  if (releaseType === RELEASE_TYPES.FULL) {
    return getFullReleasesFileInfos();
  }
  throw new Error(`Unknown releaseType ${releaseType}. Choose on of ${_.values(RELEASE_TYPES)}`);
}

async function getFullReleasesFileInfos() {
  const FULL_RELEASE_LABEL_TYPES = [
    'human prescription labels',
    'human otc labels',
    'homeopathic labels',
    'animal labels',
    'remainder labels',
  ];
  const html = await getPageWithFileLinks(FILE_INFOS_URL);
  const allFullReleaseLinks = _.reduce(
    FULL_RELEASE_LABEL_TYPES,
    (res, type) => {
      res.push(...getLinksForType(html, type));
      return res;
    },
    []
  );
  return allFullReleaseLinks;
}

/**
 * Get release links from specified 'from'.
 * For from='nov2018' releases 'nov2018', 'dec2018' and so on will be retrieved.
 * If from is not specified - gets latest available monthly release.
 * If from is not found - sets from to earliest monthly release
 * If to is not found - sets to to latest monthly release
 * @param from - in format 3-char month+year, i.e 'feb2018' or 'nov2017'
 * @param to - in format 3-char month+year, i.e 'feb2018' or 'nov2017'. Should be later than or equal 'from'.
 * @returns {Promise<*>}
 */
async function getMonthlyReleaseFileInfos(from, to) {
  const html = await getPageWithFileLinks(FILE_INFOS_URL);
  // its already sorted in desc format
  const linksToDownload = getLinksForType(html, 'monthly');
  if (_.isEmpty(linksToDownload)) {
    throw new Error(`There is no any link for monthly releases found by url: ${FILE_INFOS_URL}`);
  }
  if (!from) {
    return linksToDownload.slice(0, 1);
  }

  const linksToDownloadAsc = linksToDownload.reverse();
  const fromLc = from.toLowerCase();
  const toLc = to.toLowerCase();
  let fromI = 0;
  let toI = linksToDownloadAsc.length - 1;
  for (let i = 0; i < linksToDownloadAsc.length; i++) {
    const link = linksToDownloadAsc[i];
    if (link.endsWith(`dm_spl_monthly_update_${fromLc}.zip`)) {
      fromI = i;
    }
    if (link.endsWith(`dm_spl_monthly_update_${toLc}.zip`)) {
      toI = i + 1;
    }
  }
  return linksToDownloadAsc.slice(fromI, toI);
}

async function getWeeklyRelease() {
  const html = await getPageWithFileLinks(FILE_INFOS_URL);
  // usually its a single link
  return getLinksForType(html, 'weekly');
}

async function getPageWithFileLinks(link) {
  let html;
  try {
    const { data } = await axios.get(link);
    html = data;
  } catch (e) {
    throw new Error(`Unable to load weekly releases page by '${link}'. ${e}`);
  }
  return html;
}

function createIndexes(collection, indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

async function upsertSplDoc(splDoc, dbCollection, pathToXml) {
  const { splId, version } = splDoc;
  const versionMsg = `splId-version: '${splId}-${version}'`;
  try {
    const res = await dbCollection.findOne({ splId });
    const now = new Date();
    if (!res) {
      await dbCollection.insertOne({ ...conditionForActualRecord, ...splDoc, createdAt: now, updatedAt: now });
      return; // console.log(`Inserted entry with ${versionMsg}`);
    }
    if (+res.version === +version) {
      return; // console.log(`Current version doc is actual, nothing to do. ${versionMsg}`);
    }

    const history = res.history || [];
    const historyItem = _.omit(res, 'history');
    if (+res.version < +version) {
      // prev element becomes a part of history
      history.push(historyItem);
      history.sort((a, b) => +a.version > +b.version);

      const newDoc = {
        ...conditionForActualRecord,
        ...splDoc,
        history,
        createdAt: splDoc.createdAt || now,
        updatedAt: now,
      };
      await dbCollection.replaceOne({ _id: res._id }, newDoc);
      return; // console.log(`Added newest elem with ${versionMsg}`);
    }
    // check if history contains old element
    if (!history.find(d => d.version === res.version)) {
      history.push(historyItem);
      history.sort((a, b) => +a.version > +b.version);
      await setUpdateAtIfRecordChanged(dbCollection, 'updateOne', { _id: res._id }, { $set: { history } });
      return; // console.log(`Added old elem to history, ${versionMsg}`);
    }
    // console.log(`Skipped entry with not latest version, ${versionMsg}`);
  } catch (e) {
    console.error(`Error by path ${pathToXml} for spl ${JSON.stringify(splDoc)}`, e.stack);
  }
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const splIndexes = ['splId'];
    await createIndexes(splCollectionName, splIndexes, dbCon);
    console.log(`DB Indexes created on '${splCollectionName}': ${splIndexes.join(', ')}`);
    const fileIndexes = ['hash'];
    await createIndexes('files', fileIndexes, dbCon);
    console.log(`DB Indexes created on 'files': ${fileIndexes.join(', ')}`);

    let zipPaths;
    if (args.noDownload) {
      zipPaths = glob.sync(`${zipDestinationDir}/**/*.zip`);
    } else {
      console.log(`Getting file links...`);
      const fileLinks = await getFileLinks();
      console.log(`Found files:\n${fileLinks.join('\n')}\n`);

      const fileInfos = fileLinks.map(u => ({ url: u, destDir: zipDestinationDir }));
      console.log('Downloading...');
      zipPaths = await downloadUsingWget(
        fileInfos,
        false,
        `--no-passive-ftp --retry-connrefused --wait=30 --waitretry=30 ${getWgetProxyParams()}`
      );
    }


    await Promise.mapSeries(zipPaths, zipPath => {
      console.log(`Handling zip ${zipPath}`);
      return handleZipWithZips(zipPath, DIRS_TO_HANDLE, dbCon);
    });

    console.log('\nDone pumping SPL data');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while pumping SPL data', e);
    process.exit(1);
  }
})();
