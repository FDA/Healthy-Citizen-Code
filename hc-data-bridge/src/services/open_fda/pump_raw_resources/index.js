const args = require('optimist').argv;
const PumpRawResourceOpenFda = require('./open_fda_pump_raw_resources');

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
  const pumpOpenFda = new PumpRawResourceOpenFda(settings);
  pumpOpenFda.pump()
    .then(() => {
      console.log(`All files are downloaded and pumped.`);
      process.exit(0);
    });
} catch (e) {
  console.log(e);
  process.exit(-1);
}
