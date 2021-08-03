const fs = require('fs-extra');
const _ = require('lodash');
const csv = require('fast-csv');
const { getFieldsMeta } = require('../util');

module.exports = ({ filePath, scheme, projections, options }) => {
  const { headers, fieldsMeta } = getFieldsMeta(scheme, projections);

  return {
    async init() {
      await fs.ensureFile(filePath);
      await csv.writeToStream(fs.createWriteStream(filePath), [headers], { includeEndRowDelimiter: true });
    },
    async add(items) {
      const csvRows = [];
      _.each(items, async (item) => {
        const rowData = [];
        _.each(fieldsMeta, async (fieldMeta) => {
          const { fieldName, fieldScheme, getValue } = fieldMeta;
          const value = item[fieldName];
          rowData.push(getValue({ value, scheme: fieldScheme, options }));
        });
        csvRows.push(rowData);
      });

      const appendFileStream = fs.createWriteStream(filePath, { flags: 'a' });
      await csv.writeToStream(appendFileStream, csvRows, { includeEndRowDelimiter: true });
    },
    finish: _.noop,
    mimeType: 'text/csv',
    ext: 'csv',
  };
};
