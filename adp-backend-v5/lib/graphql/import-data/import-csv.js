const { ObjectID } = require('mongodb');
const csv = require('csv-parser');
const Promise = require('bluebird');
const fs = require('fs-extra');
const _ = require('lodash');
const { getDateFromAmPmTime } = require('../../util/date');
const { importItems } = require('./import-json');
const { getResponseWithErrors } = require('./util');

function parseCsvToJsonValue(csvValue, type) {
  const stringTypes = ['String', 'Email', 'Phone', 'Url', 'Text', 'Barcode', 'Decimal128'];
  const numberTypes = ['Number', 'Double', 'Int32', 'Int64'];

  if (!csvValue || csvValue === '-') {
    return null;
  }

  if (stringTypes.includes(type)) {
    return _.unescape(csvValue);
  }

  if (type === 'String[]') {
    return _.unescape(csvValue).split(', ');
  }

  if (numberTypes.includes(type)) {
    return Number(csvValue);
  }

  if (type === 'Boolean') {
    if (csvValue === 'true') {
      return true;
    }
    if (csvValue === 'false') {
      return false;
    }
    throw new Error(`Invalid Boolean value ${csvValue}`);
  }

  // dates appears in client timezone which is not available for server, parse it ignoring timezone
  if (type === 'Date') {
    return new Date(csvValue);
  }
  if (type === 'DateTime') {
    return new Date(csvValue);
  }
  if (type === 'Time') {
    return getDateFromAmPmTime(csvValue);
  }

  if (type === 'ObjectID') {
    if (!ObjectID.isValid(csvValue)) {
      throw new Error(`Invalid ObjectId value ${csvValue}`);
    }
    return ObjectID(csvValue);
  }

  if (['TreeSelector', 'LookupObjectID', 'LookupObjectID[]'].includes(type)) {
    throw new Error(`LookupObjectID and Treeselector are not supported ('${type}')`);
  }

  if (['Location', 'Image', 'Video', 'Audio', 'File', 'Image[]', 'Video[]', 'Audio[]', 'File[]'].includes(type)) {
    throw new Error(`Location and Media types are not supported ('${type}')`);
  }

  if (type === 'Password') {
    return null;
  }
  throw new Error(`Unknown field type ('${type}')`);
}

async function getItemsFromCsv({ filePath, context, log }) {
  const { modelName, appLib } = context;
  const scheme = appLib.appModel.models[modelName];
  const fieldFullNameToFieldName = {};
  _.each(scheme.fields, ({ fullName }, fieldName) => {
    fieldFullNameToFieldName[fullName] = fieldName;
  });

  const nonExistingFields = [];
  const stream = fs.createReadStream(filePath).pipe(
    csv({
      mapHeaders: ({ header: fieldFullName }) => {
        const fieldName = fieldFullNameToFieldName[fieldFullName];
        if (!fieldName) {
          nonExistingFields.push(fieldFullName);
          return null;
        }
        return fieldName;
      },
    })
  );

  const items = [];
  const errors = {};
  let csvRowIndex = 0;

  return new Promise(resolve => {
    stream
      .on('headers', () => {
        if (nonExistingFields.length) {
          stream.destroy();
          errors.overall = `File contains invalid column names: ${nonExistingFields.map(f => `'${f}'`).join(', ')}`;
          resolve({ items, errors });
        }
      })
      .on('data', async csvRowData => {
        const item = {};
        _.each(csvRowData, (val, key) => {
          const { type } = scheme.fields[key];
          try {
            item[key] = parseCsvToJsonValue(val, type);
          } catch (e) {
            _.set(errors, `${csvRowIndex}.${key}`, e.message);
          }
        });
        items.push(item);
        csvRowIndex++;
      })
      .on('end', async () => {
        resolve({ items, errors });
      })
      .on('error', e => {
        log.error(e.stack);
        errors.overall = `Unable to parse csv file.`;
        resolve({ items, errors });
      });
  });
}

async function importCsv({ filePath, context, log }) {
  const { items, errors } = await getItemsFromCsv({ filePath, context });
  if (!_.isEmpty(errors)) {
    return getResponseWithErrors(errors);
  }
  return importItems({ items, context, log });
}

module.exports = {
  importCsv,
};
