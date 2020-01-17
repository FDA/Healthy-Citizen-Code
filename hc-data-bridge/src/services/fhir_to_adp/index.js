const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const csv = require('csv-parser');
const _ = require('lodash');
const args = require('optimist').argv;
const path = require('path');

const FhirToAdpPumper = require('./fhir_to_adp_pumper');

function readDataFromXls (xlsPath) {
  const xlsData = xlsx.parse(xlsPath, {raw: false});
  const sheetData = xlsData[0].data;
  const headers = new Map();
  const rows = [];
  _.forEach(sheetData[0], (header, index) => {
    headers.set(index, header);
  });
  for (let i = 1; i < sheetData.length; i++) {
    const sheetRow = sheetData[i];
    const row = {};
    _.forEach(sheetRow, (val, index) => {
      row[headers.get(index)] = val;
    });
    rows.push(row);
  }
  return Promise.resolve(rows);
}

function readDataFromCsv (csvPath) {
  const rows = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      });
  });
}

const inputFile = path.resolve(__dirname, args.inputFile);
let readFunc = readDataFromXls;
if (inputFile.endsWith('.csv') || inputFile.endsWith('.txt')) {
  readFunc = readDataFromCsv;
}

readFunc(inputFile)
  .then((rows) => {
    const preparedRows = rows.map((row) => {
      const [srcFhirId, login, password, email] = row.users.split(':');
      return {
        src: row.src,
        dest: row.dest,
        srcFhirId,
        login,
        password,
        email,
      };
    });

    const fhirToAdpPumper = new FhirToAdpPumper(preparedRows);
    return fhirToAdpPumper.pump();
  })
  .then(() => console.log(`Finished pumping`))
  .catch(err => console.log(err));
