const Promise = require('bluebird');
const parseString = Promise.promisify(require('xml2js').parseString);
const fs = require('fs-extra');

async function parseFile(xmlFilePath) {
  const xmlString = await fs.readFile(xmlFilePath);
  return parseString(xmlString);
}

module.exports = {
  parseFile,
  parseString,
};
