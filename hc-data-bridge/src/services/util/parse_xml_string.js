const fs = require('fs-extra');
const { parse: parseXml } = require('fast-xml-parser');

async function parseFile(xmlFilePath) {
  const xmlString = await fs.readFile(xmlFilePath, 'utf-8');
  return parseString(xmlString);
}
function parseString(xmlString) {
  return parseXml(xmlString, { ignoreAttributes: false, attributeNamePrefix: '' })
}

module.exports = {
  parseFile,
  parseString,
};
