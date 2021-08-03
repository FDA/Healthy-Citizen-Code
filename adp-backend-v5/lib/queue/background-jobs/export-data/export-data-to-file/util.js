const _ = require('lodash');

const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/customParseFormat'));
dayjs.extend(require('dayjs/plugin/timezone'));
require('dayjs/locale/en');

function getFieldsToExport(scheme, projections) {
  const fieldNames = _.isEmpty(projections) ? _.keys(scheme.fields) : projections;
  return _.filter(fieldNames, (fieldName) => {
    const type = _.get(scheme, ['fields', fieldName, 'type']);
    return type && type !== 'Blank' && type !== 'Group';
  });
}

function getFieldsMeta(scheme, projections) {
  const fieldsToExport = getFieldsToExport(scheme, projections);
  const headers = [];
  const fieldsMeta = [];
  _.each(fieldsToExport, (fieldName) => {
    const fieldScheme = scheme.fields[fieldName];
    const { fullName } = fieldScheme;
    headers.push(fullName);
    fieldsMeta.push({ fieldName, header: fullName, fieldScheme, getValue: getValueFunc(fieldScheme.type) });
  });
  return { headers, fieldsMeta };
}

function defaultCsvValue({ value }) {
  return value ? value.toString() : '';
}

function dateTimeCsvValue({ value, options }) {
  const { timezone } = options;
  return value ? dayjs(value).tz(timezone, true).format('MM/DD/YYYY hh:mm a') : '';
}

function dateCsvValue({ value, options }) {
  const { timezone } = options;
  return value ? dayjs(value).tz(timezone, true).format('MM/DD/YYYY') : '';
}

function timeCsvValue({ value, options }) {
  const { timezone } = options;
  return value ? dayjs(value).tz(timezone, true).format('hh:mm a') : '';
}

function lookupObjectIdCsvValue({ value }) {
  return value ? value.label : '';
}

function objectCsvValue({ value, scheme, options }) {
  if (_.isEmpty(value)) {
    return '';
  }

  const objFields = [];
  _.each(value, (fieldValue, fieldKey) => {
    const nestedFieldScheme = _.get(scheme, ['fields', fieldKey]);
    const { type, fullName } = nestedFieldScheme;
    const csvValueFunc = getValueFunc(type);
    const csvValue = csvValueFunc({ value: fieldValue, scheme: nestedFieldScheme, options });
    objFields.push(`${fullName}: ${csvValue}`);
  });

  return `${scheme.fieldName}: { ${objFields.join('; ')} }`;
}

function getValueFunc(type) {
  if (type === 'Object') {
    return objectCsvValue;
  }
  if (type === 'LookupObjectID') {
    return lookupObjectIdCsvValue;
  }
  if (type === 'DateTime') {
    return dateTimeCsvValue;
  }
  if (type === 'Date') {
    return dateCsvValue;
  }
  if (type === 'Time') {
    return timeCsvValue;
  }
  return defaultCsvValue;
}

module.exports = {
  getFieldsMeta,
  lookupObjectIdCsvValue,
  dateTimeCsvValue,
  dateCsvValue,
  timeCsvValue,
  defaultCsvValue,
  getFieldsToExport,
};
