const fs = require('fs-extra');
const Promise = require('bluebird');
const { ExcelWriter } = require('node-excel-stream');
const _ = require('lodash');
const { getFieldsMeta } = require('../util');

const sheetName = 'Sheet';

module.exports = ({ filePath, scheme, projections, options }) => {
  const { headers, fieldsMeta } = getFieldsMeta(scheme, projections);
  let excelWriter;

  return {
    async init() {
      await fs.ensureFile(filePath);
      excelWriter = new ExcelWriter({
        sheets: [
          { name: sheetName, key: sheetName, headers: headers.map((header) => ({ name: header, key: header })) },
        ],
      });
    },
    async add(items) {
      const rows = [];
      _.each(items, async (item) => {
        const row = {};
        _.each(fieldsMeta, async (fieldMeta) => {
          const { fieldName, header, fieldScheme, getValue } = fieldMeta;
          const value = item[fieldName];
          row[header] = getValue({ value, scheme: fieldScheme, options });
        });
        rows.push(row);
      });

      await Promise.map(rows, (row) => excelWriter.addData(sheetName, row));
    },
    async finish() {
      const stream = await excelWriter.save();
      return new Promise((resolve, reject) => {
        const fileWriteStream = fs.createWriteStream(filePath);
        stream.pipe(fileWriteStream).on('finish', resolve).on('error', reject);
      });
    },
    mimeType: 'application/vnd.ms-excel',
    ext: 'xlsx',
  };
};
