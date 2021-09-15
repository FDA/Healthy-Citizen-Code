const _ = require('lodash');
const chrono = require('chrono-node');
const { toRegExp } = require('../util/regexp');
const { ValidationError } = require('../errors');

const typeToFilterName = {
  Date: 'date', // check https://jira.conceptant.com/browse/UNI-427
  Time: 'time',
  DateTime: 'dateTime',
  String: 'string',
  'String[]': 'stringMultiple',
  Number: 'number',
  Double: 'number',
  Int32: 'number',
  Int64: 'number',
  Decimal128: 'decimal128',
  'Number[]': 'number',
  'Double[]': 'number',
  'Int32[]': 'number',
  'Int64[]': 'number',
  'Decimal128[]': 'decimal128',
  Boolean: 'boolean',
  TriStateBoolean: 'triStateBoolean',
  Array: 'none',
  Object: 'none',
  Mixed: 'none',
  File: 'file',
  Image: 'file',
  Video: 'file',
  Audio: 'file',
  'File[]': 'fileMultiple',
  'Image[]': 'fileMultiple',
  'Video[]': 'fileMultiple',
  'Audio[]': 'fileMultiple',
  ObjectID: 'objectId',
  LookupObjectID: 'lookupObjectId',
  'LookupObjectID[]': 'lookupObjectIdMultiple',
  TreeSelector: 'treeSelector',
  Location: 'location',
  Password: 'none',
  Email: 'string',
  Phone: 'string',
  Url: 'string',
  Text: 'string',
  ImperialHeight: 'imperialHeight',
  ImperialWeight: 'imperialWeight',
  ImperialWeightWithOz: 'imperialWeightWithOz',
  BloodPressure: 'none',
  Barcode: 'string',
  Currency: 'currency',
  Html: 'html',
  Code: 'string',
  FormSeparator: 'none',
};

function getDefaultFilterName(fieldScheme) {
  const { type, list } = fieldScheme;
  if (!type) {
    throw new ValidationError('Scheme type must be specified');
  }

  if (list) {
    const isMultiple = type.endsWith('[]');
    const { isDynamicList } = list;

    if (!isMultiple && !isDynamicList) {
      return 'list';
    }
    if (isMultiple && !isDynamicList) {
      return 'listMultiple';
    }
    if (!isMultiple && isDynamicList) {
      return 'dynamicList';
    }
    if (isMultiple && isDynamicList) {
      return 'dynamicListMultiple';
    }
  }
  return typeToFilterName[type];
}

function construct(fieldName, operator, compValue) {
  return { [fieldName]: { [operator]: compValue } };
}

function constructRegex(fieldName, regex, negate = false) {
  return negate ? { [fieldName]: { $not: { $regex: regex } } } : { [fieldName]: { $regex: regex } };
}

function createFilter(context, operationsMap) {
  const { fieldPath, operation, value } = context.data;
  const operationValue = operationsMap[operation];
  if (!operationValue) {
    const supportedOperations = getSupportedOperationsFromMap(operationsMap);
    throw new ValidationError(
      `Invalid operation '${operation}' for filter by path '${fieldPath}'. Supported operations: ${supportedOperations}.`
    );
  }
  if (_.isString(operationValue)) {
    // operationValue is mongo operator
    return construct(fieldPath, operationValue, value);
  }
  if (_.isPlainObject(operationValue)) {
    return operationValue;
  }
  if (_.isFunction(operationValue)) {
    const argumentsNum = operationValue.length;
    if (argumentsNum === 0) {
      return operationValue();
    }
    return operationValue(fieldPath, value);
  }
  throw new ValidationError(`Invalid specification for operation '${operation}', filter by path '${fieldPath}'.`);
}

function getSupportedOperationsFromMap(map) {
  return Object.keys(map)
    .map((op) => `'${op}'`)
    .join(', ');
}

const flags = { safe: true, insensitive: true };
const stringOperations = {
  contains: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, flags)),
  notcontains: (fieldPath, value) => {
    const regex = toRegExp(value, flags);
    if (!regex) {
      return {};
    }
    const regexCondition = constructRegex(fieldPath, regex, true);
    // adding null fields as they do not contain any chars thus fit the filter
    const nullCondition = { [fieldPath]: null };
    return { $or: [regexCondition, nullCondition] };
  },
  startswith: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, { ...flags, startsWith: true })),
  endswith: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, { ...flags, endsWith: true })),
  regex: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, flags)),
  notRegex: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, flags), true),
  '=': (fieldPath, value) => {
    if (!value) {
      return { $or: [{ [fieldPath]: '' }, { [fieldPath]: { $exists: false } }] };
    }
    return construct(fieldPath, '$eq', value);
  },
  '<>': (fieldPath, value) => construct(fieldPath, '$ne', value),
  '<': (fieldPath, value) => construct(fieldPath, '$lt', value),
  '<=': (fieldPath, value) => construct(fieldPath, '$lte', value),
  '>': (fieldPath, value) => construct(fieldPath, '$gt', value),
  '>=': (fieldPath, value) => construct(fieldPath, '$gte', value),
  any: () => {},
  empty: (fieldPath) => ({ [fieldPath]: '' }),
  notEmpty: (fieldPath) => ({ $and: [{ [fieldPath]: { $ne: null } }, { [fieldPath]: { $ne: '' } }] }),
};

function parseRelativeDateValue(value) {
  return chrono.parseDate(value);
}

module.exports = {
  getDefaultFilterName,
  construct,
  createFilter,
  stringOperations,
  parseRelativeDateValue,
};
