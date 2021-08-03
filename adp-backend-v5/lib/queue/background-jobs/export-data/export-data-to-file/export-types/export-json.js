const fs = require('fs-extra');
const _ = require('lodash');
const { getFieldsToExport } = require('../util');

module.exports = ({ filePath, scheme, projections }) => {
  const indent = '  ';
  const fieldsToExport = getFieldsToExport(scheme, projections);
  return {
    async init() {
      await fs.ensureFile(filePath);
      await fs.writeFile(filePath, `[\n${indent}`);
    },
    async add(items) {
      const stringifiedItems = items.map((item) => {
        const preparedItem = _.pick(item, fieldsToExport);
        return JSON.stringify(preparedItem);
      });
      const itemsPart = stringifiedItems.join(`,\n${indent}`);
      await fs.appendFile(filePath, itemsPart);
    },
    async finish() {
      await fs.appendFile(filePath, '\n]');
    },
    mimeType: 'application/json',
    ext: 'json',
  };
};
