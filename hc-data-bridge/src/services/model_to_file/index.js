const args = require('optimist').argv;
const fs = require('fs');
const { transformModelToXls } = require('./model_to_xls');

if (!fs.existsSync(args.modelSrcPath)) {
  console.log(`Argument 'modelSrcPath' must be a valid path to dir with models or to json model.`);
  process.exit(-1);
}

const xlsFullPath = transformModelToXls(args.modelSrcPath, args.xlsOutputPath);
console.log(`Written to '${xlsFullPath}'`);
