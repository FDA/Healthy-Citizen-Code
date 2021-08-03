const args = require('optimist').argv;
const path = require('path');
const { getSchemeInCsv } = require('./get_scheme_in_csv');

// Example 'https://login:password@rlog-prototype-backend.conceptant.com/schemas';
const { schemeUrl } = args;
const outputSchemePath = args.outputSchemePath
  ? path.resolve(__dirname, args.outputSchemePath)
  : path.resolve(__dirname, './generated', 'generated.csv');

getSchemeInCsv(schemeUrl, outputSchemePath)
  .then(() => {
    console.log(`Scheme in CSV is written to: ${outputSchemePath}`);
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
