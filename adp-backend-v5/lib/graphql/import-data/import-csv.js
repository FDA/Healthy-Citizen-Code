const { ObjectID } = require('mongodb');
const csv = require('csv-parser');
const stripBom = require('strip-bom-stream');
const Promise = require('bluebird');
const fs = require('fs-extra');
const mem = require('mem');
const _ = require('lodash');
const { getDateFromAmPmTime } = require('../../util/date');
const { importItems } = require('./import-json');
const { getResponseWithErrors } = require('./util');
const { getLookup, getTableSpecParams } = require('../../util/lookups');

const CSV_MULTIPLE_TYPE_SEPARATOR = '; ';

async function getLookupByLabel({ appLib, csvLabelValue, tableSpecs }) {
  const {
    db,
    appModel: { models },
  } = appLib;
  const isMultiple = _.keys(tableSpecs).length > 1;

  let tableSpec;
  let label;
  if (isMultiple) {
    const [collection, labelVal] = csvLabelValue.split(' | ');
    tableSpec = tableSpecs[collection];
    label = labelVal;
  } else {
    // eslint-disable-next-line prefer-destructuring
    tableSpec = _.values(tableSpecs)[0];
    label = csvLabelValue;
  }

  const { foreignKeyFieldName, labelField, table } = tableSpec;
  if (!/this\.\w+/.test(labelField)) {
    throw new Error(`Complicated lookup labels are not supported. '${labelField}' is not a single field.`);
  }

  const labelFieldSimplified = labelField.replace('this.', '');
  const type = _.get(models, `${table}.fields.${labelFieldSimplified}.type`);
  if (type === 'Date') {
    label = new Date(label);
    if (label === 'Invalid Date') {
      throw new Error(`Invalid label value ${label} for 'Date' label type`);
    }
  }

  const docs = await db
    .collection(table)
    .find(
      { [labelFieldSimplified]: label, ...appLib.dba.getConditionForActualRecord(table) },
      { [foreignKeyFieldName]: 1 }
    )
    .toArray();
  if (!docs.length) {
    throw new Error(`Unable to find referenced document by label '${csvLabelValue}'`);
  }
  if (docs.length > 1) {
    throw new Error(
      `Found multiple lookup documents(${docs.length}) by label '${csvLabelValue}'. It must be a single document.`
    );
  }

  const doc = docs[0];
  return getLookup(doc, tableSpec);
}

function getTableSpecs(schemeSpec) {
  return _.mapValues(schemeSpec.lookup.table, (tableSpec) => getTableSpecParams(tableSpec));
}

async function parseCsvToJsonValue({ appLib, scheme, val, fieldName, getListValuesMem }) {
  const schemeSpec = scheme.fields[fieldName];
  const { type, list } = schemeSpec;

  const stringTypes = ['String', 'Email', 'Phone', 'Url', 'Text', 'Barcode', 'Decimal128', 'Html', 'CronExpression'];
  const stringArrayTypes = ['String[]', 'Decimal128[]'];
  const numberTypes = ['Number', 'Double', 'Int32', 'Int64'];
  const numberArrayTypes = ['Number[]', 'Double[]', 'Int32[]', 'Int64[]'];
  const isListType = !_.isNil(list);

  if (!val) {
    return null;
  }

  if (isListType) {
    try {
      const listValues = await getListValuesMem(schemeSpec.list);
      const labelsToKeys = _.zipObject(_.values(listValues), _.keys(listValues));
      const listLabels = _.unescape(val).split(', ');

      const invalidLabels = [];
      const listKeys = [];
      _.each(listLabels, (label) => {
        const listKey = labelsToKeys[label];
        if (!listKey) {
          invalidLabels.push(label);
        } else {
          listKeys.push(listKey);
        }
      });

      if (!_.isEmpty(invalidLabels)) {
        throw new Error(`Invalid list values: ${invalidLabels.join(', ')}`);
      }

      const isMultipleList = type.endsWith('[]');
      if (isMultipleList) {
        return listKeys;
      }

      return listKeys[0];
    } catch (e) {
      throw new Error(`Unable to get list values.`);
    }
  }

  if (stringTypes.includes(type)) {
    return _.unescape(val);
  }

  if (stringArrayTypes.includes(type)) {
    return _.unescape(val).split(', ');
  }

  if (numberTypes.includes(type)) {
    const number = Number(val);
    if (Number.isNaN(number)) {
      throw new Error(`Invalid ${type} value ${val}`);
    }
    return number;
  }

  if (numberArrayTypes.includes(type)) {
    const numberStrings = val.split(', ');
    const resultNumbers = [];
    for (let i = 0; i < numberStrings.length; i++) {
      const numberString = numberStrings[i];
      const number = Number(numberString);
      if (Number.isNaN(number)) {
        throw new Error(`Invalid ${type} value '${numberString}'`);
      }
      resultNumbers.push(number);
    }
    return resultNumbers;
  }

  if (type === 'Boolean') {
    const lowerCasedVal = val.toLowerCase();
    if (lowerCasedVal === 'true') {
      return true;
    }
    if (lowerCasedVal === 'false') {
      return false;
    }
    throw new Error(`Invalid Boolean value ${val}`);
  }

  // dates appears in client timezone which is not available for server, parse it ignoring timezone
  if (type === 'Date') {
    return new Date(val);
  }
  if (type === 'DateTime') {
    return new Date(val);
  }
  if (type === 'Time') {
    return getDateFromAmPmTime(val);
  }

  if (type === 'ObjectID') {
    if (!ObjectID.isValid(val)) {
      throw new Error(`Invalid ObjectId value ${val}`);
    }
    return ObjectID(val);
  }

  if (type === 'Currency') {
    // negative value "-$125" is presented as "($125)"
    const isNegativeCurrency = val.startsWith('(') && val.endsWith(')');
    const trimmedVal = _.trim(val, '()$');
    const number = Number(trimmedVal);
    if (Number.isNaN(number)) {
      throw new Error(`Invalid Currency value ${val}, cannot convert to number`);
    }
    return isNegativeCurrency ? number * -1 : number;
  }

  if (type === 'LookupObjectID') {
    const tableSpecs = getTableSpecs(schemeSpec);
    return getLookupByLabel({ appLib, csvLabelValue: val, tableSpecs });
  }

  if (type === 'LookupObjectID[]') {
    const tableSpecs = getTableSpecs(schemeSpec);
    const labelValues = val.split(CSV_MULTIPLE_TYPE_SEPARATOR);
    return Promise.map(labelValues, (csvLabelValue) => getLookupByLabel({ appLib, csvLabelValue, tableSpecs }));
  }

  if (type === 'TreeSelector') {
    throw new Error(`Treeselector type is not supported`);
  }

  if (['Location', 'Image', 'Video', 'Audio', 'File', 'Image[]', 'Video[]', 'Audio[]', 'File[]'].includes(type)) {
    throw new Error(`Location and Media types are not supported ('${type}')`);
  }

  if (type === 'Password') {
    return null;
  }
  throw new Error(`Type '${type}' is not supported for CSV export.`);
}

let getListValuesMem;
async function getItemsFromCsv({ filePath, context }) {
  const { modelName, appLib } = context;
  const scheme = appLib.appModel.models[modelName];
  const fieldFullNameToFieldName = {};
  _.each(scheme.fields, ({ fullName }, fieldName) => {
    fieldFullNameToFieldName[fullName] = fieldName;
  });

  const nonExistingFields = [];
  const stream = fs
    .createReadStream(filePath)
    .pipe(stripBom())
    .pipe(
      csv({
        mapHeaders: ({ header }) => {
          const fieldName = fieldFullNameToFieldName[header];
          if (fieldName) {
            return fieldName;
          }
          if (scheme.fields[header]) {
            return header;
          }

          nonExistingFields.push(header);
          return null;
        },
      })
    );

  const items = [];
  const errors = {};
  let csvRowIndex = 0;

  await new Promise((resolve) => {
    stream.on('headers', () => {
      try {
        if (nonExistingFields.length) {
          stream.destroy();
          errors.overall = `File contains invalid column names: ${nonExistingFields.map((f) => `'${f}'`).join(', ')}`;
        }
      } finally {
        resolve();
      }
    });
  });
  if (!_.isEmpty(errors)) {
    return { errors };
  }

  if (!getListValuesMem) {
    // create mem function for getting dynamic lists
    const oneMin = 60 * 1000;
    getListValuesMem = mem(context.appLib.accessUtil.getListValues, { maxAge: oneMin });
  }

  for await (const csvRowData of stream) {
    const item = {};
    for (const [fieldName, val] of _.entries(csvRowData)) {
      try {
        item[fieldName] = await parseCsvToJsonValue({ appLib, scheme, val, fieldName, getListValuesMem });
      } catch (e) {
        _.set(errors, `${csvRowIndex}.${fieldName}`, e.message);
      }
    }
    items.push(item);
    csvRowIndex++;
  }
  return { items, errors };
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
