const Promise = require('bluebird');
const args = require('optimist').argv;
const _ = require('lodash');
const moment = require('moment');
const fs = require('fs-extra');
const csv = require('neat-csv');
const path = require('path');

const PACKAGE_NDC_REGEX = /(\d{5}-\d{4}-\d{1})|(\d{4}-\d{4}-\d{2})|(\d{5}-\d{3}-\d{2})|(NDC \d{11})/g;
const { mongoConnect, insertOrReplaceDocByCondition } = require('../util/mongo');
const { downloadUsingWget } = require('../util/download');
const { camelCaseKeysDeep } = require('../util/object');
const { getNormalizedNDCByPackageNDC } = require('../util/ndc');
const { getDate } = require ('../util/date');
const { getWgetProxyParams } = require('../util/proxy');

const resCollectionName = args.resCollectionName || 'recallsRes';

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}
let destinationDir;

if (!_.isString(args.csvDestinationDir)) {
  destinationDir = path.resolve(__dirname, './resources');
} else {
  destinationDir = path.resolve(args.csvDestinationDir);
}

function getWeeklyCsvLinks() {
  const links = [];
  const from = moment('20120620');
  const now = moment();
  const to = now.isoWeekday() >= 3 ? now.day(3) : now.day(-4); // last Wednesday
  for (let m = moment(from); m.isSameOrBefore(to); m.add(1, 'weeks')) {
    links.push(getWeeklyCsvLink(m.date(), m.month() + 1, m.year()));
  }
  return links;
}

function getWeeklyCsvLink(d, m, y) {
  return `https://www.accessdata.fda.gov/scripts/ires/index.cfm?action=export.getWeeklyExportCSVResult&yearVal=${y}&monthVal=${m}&dayVal=${d}`;
}

function getPackageNdcsFromDrugRecall(drugRecall) {
  const { productDescription } = drugRecall;

  const match = productDescription.match(PACKAGE_NDC_REGEX) || [];
  const extractedNdc11s = _.uniq(match).map(ndc => {
    const clearedNdc = ndc.startsWith('NDC ') ? ndc.substr(4) : ndc;
    return getNormalizedNDCByPackageNDC(clearedNdc);
  });
  const invalidNdcs = extractedNdc11s.reduce((res, val, key) => {
    if (val === null) {
      res.push(match[key]);
    }
    return res;
  }, []);
  return { extractedNdc11s: extractedNdc11s.filter(n => n), invalidNdcs };
}

async function uploadCsv(csvPath, dbCon) {
  const srcData = await csv(fs.createReadStream(csvPath));
  const preparedRows = srcData
    .filter(row => {
      if (!row['Recall Number']) {
        console.warn(`Row with empty 'Recall Number' will be skipped: ${JSON.stringify(row)}`);
      }
      return row['Recall Number'];
    })
    .map(row => {
      const camelCasedRow = camelCaseKeysDeep(row);
      const { extractedNdc11s, invalidNdcs } = getPackageNdcsFromDrugRecall(camelCasedRow);
      const docDescription = `productDescription: '${camelCasedRow.productDescription}', eventId: ${camelCasedRow.eventId}`;
      if (invalidNdcs.length) {
        console.warn(`Found invalid NDC11s '${invalidNdcs.join(',')}' for ${docDescription}`);
      }
      if (!extractedNdc11s.length) {
        console.warn(`Found empty 'extractedNdc11s' for recall with ${docDescription}`);
      }
      camelCasedRow.extractedNdc11s = extractedNdc11s.map(extractedPackageNdc11 => ({extractedPackageNdc11}));
      camelCasedRow.reportDate = getDate(camelCasedRow.reportDate);
      camelCasedRow.terminationDate = getDate(camelCasedRow.terminationDate);
      camelCasedRow.recallInitiationDate = getDate(camelCasedRow.recallInitiationDate);
      camelCasedRow.centerClassificationDate = getDate(camelCasedRow.centerClassificationDate);
      camelCasedRow.productType = camelCasedRow.productType.toLowerCase();

      return camelCasedRow;
    });

  await Promise.map(preparedRows, row =>
    insertOrReplaceDocByCondition(row, dbCon.collection(resCollectionName), { recallNumber: row.recallNumber })
  );
}

function createIndexes(dbCon) {
  return Promise.all([
    dbCon.collection(resCollectionName).createIndex({ recallNumber: 1 }),
  ]);
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(dbCon);
    const weeklyCsvLinks = getWeeklyCsvLinks();
    const fileInfos = weeklyCsvLinks.map(u => ({ url: u, destDir: destinationDir }));
    const existingCsvPaths = [];
    const notExistsingFileInfos = _.filter(fileInfos, fi => {
      const urlEnd = fi.url.substr(fi.url.lastIndexOf('/') + 1);
      const csvPath = path.resolve(fi.destDir, urlEnd);
      const isExists = fs.pathExistsSync(csvPath);
      if (isExists) {
        existingCsvPaths.push(csvPath);
        return false;
      }
      return true;
    });
    const newCsvPaths = await downloadUsingWget(notExistsingFileInfos, true, getWgetProxyParams());
    const csvPaths = existingCsvPaths.concat(newCsvPaths);

    await Promise.mapSeries(csvPaths, csvPath => {
      console.log(`Handling csv ${csvPath}`);
      return uploadCsv(csvPath, dbCon);
    });

    console.log('\nDone pumping RES data');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while pumping RES data', e);
    process.exit(1);
  }
})();
