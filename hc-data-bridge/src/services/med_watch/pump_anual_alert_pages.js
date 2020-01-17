const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect } = require('../util/mongo');

const {handleSafetyAlertsPages} = require('./pump_util');

const { mongoUrl, medWatchCollectionName } = args;
const collectionName = medWatchCollectionName || 'medWatch';

if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

// add alert annual report pages here (may include webarchive pages)
const safetyAlertsPages = [
  'https://www.fda.gov/Safety/MedWatch/SafetyInformation/SafetyAlertsforHumanMedicalProducts/ucm590808.htm',
];

function createIndexes(indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(collectionName).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const indexFieldNames = ['productName'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);
    await handleSafetyAlertsPages(safetyAlertsPages, dbCon, collectionName);

    console.log('\nDone pumping MedWatch data');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while MedWatch data', e);
    process.exit(1);
  }
})();
