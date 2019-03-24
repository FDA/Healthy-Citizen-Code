const args = require('optimist').argv;
const PumpDeviceRecallsWithEnforcements = require('./pump_device_recall_with_enforcements');

const settings = {};
try {
  settings.mongoUrl = args.mongoUrl;
  settings.destCollectionName = args.destCollectionName;
  settings.zipDestinationDir = args.zipDestinationDir;
  settings.resourcePath = args.resourcePath;
  settings.transformer = args.transformer;
  settings.fileFilter = args.fileFilter ? new Function('file, _', args.fileFilter) : null;
  settings.getDocId = args.getDocId ? new Function('doc, _', args.getDocId) : null;
} catch (e) {
  console.log(`Error occurred while parsing args.`, e);
  process.exit(-1);
}

try {
  const pumpOpenFda = new PumpDeviceRecallsWithEnforcements(settings);
  pumpOpenFda.pump()
    .then(() => {
      console.log(`All files are downloaded, pumped and linked.`);
      process.exit(0);
    });
} catch (e) {
  console.log(e);
  process.exit(-1);
}
