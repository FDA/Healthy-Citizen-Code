const readline = require('readline');
const zlib = require('zlib');
const fs = require('fs-extra');
const Promise = require('bluebird');
const args = require('optimist').argv;
const path = require('path');
const { mongoConnect } = require('../util/mongo');

async function upsertGsrsDoc(doc, dbCon, gsrsCollectionName) {
  const response = await dbCon
    .collection(gsrsCollectionName)
    .findOneAndReplace({ uuid: doc.uuid }, doc, { upsert: true });

  if (response.lastErrorObject.updatedExisting) {
    console.log(`Updated entry with uuid: '${doc.uuid}'`);
  } else {
    console.log(`Inserted entry with uuid: '${doc.uuid}'`);
  }
}

(async () => {
  // gsrsFile is downloaded from "Public Data Releases" - https://gsrs.ncats.nih.gov/#/archive
  const { mongoUrl, gsrsFile, gsrsCollectionName = 'gsrs' } = args;
  if (!mongoUrl || !gsrsFile) {
    console.log('Please specify mongoUrl and gsrsFile params');
    process.exit(1);
  }
  const gsrsFilePath = path.resolve(gsrsFile);
  const isGsrsFileExists = await fs.exists(gsrsFilePath);
  if (!isGsrsFileExists) {
    console.log(`Resolved path for gsrsFile does not exist ${gsrsFilePath}`);
    process.exit(1);
  }

  const dbCon = await mongoConnect(mongoUrl);
  const lineReader = readline.createInterface({
    input: fs.createReadStream(gsrsFilePath).pipe(zlib.createGunzip()),
  });

  let promises = [];
  return new Promise(resolve => {
    lineReader.on('line', async (stringifiedDoc) => {
      try {
        const doc = JSON.parse(stringifiedDoc);
        promises.push(upsertGsrsDoc(doc, dbCon, gsrsCollectionName));

        if (promises.length >= 500) {
          lineReader.pause();
          await Promise.all(promises);
          promises = [];
          lineReader.resume();
        }
      } catch (e) {
        console.log(`Unable to process string: ${stringifiedDoc}`);
      }
    });

    lineReader.on('close', () => {
      console.log(`Finished.`);
      resolve(Promise.all(promises));
    });
  });
})();
