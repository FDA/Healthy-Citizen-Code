const _ = require('lodash');
const { toRegExp } = require('../../../lib/util/regexp');
const { ValidationError } = require('../../../lib/errors');

function construct(fieldName, operator, compValue) {
  return { [fieldName]: { [operator]: compValue } };
}

function constructRegex(fieldName, regex) {
  return { [fieldName]: { $regex: regex } };
}

function createFilter(context, operationsMap) {
  const { fieldPath, operation, value } = context.data;
  const handler = operationsMap[operation];
  if (!handler) {
    const supportedOperations = getSupportedOperationsFromMap(operationsMap);
    throw new ValidationError(
      `Invalid operation '${operation}' for filter by path '${fieldPath}'. Supported operations: ${supportedOperations}.`
    );
  }
  if (_.isString(handler)) {
    // handler is mongo operator
    return construct(fieldPath, handler, value);
  }
  if (_.isFunction(handler)) {
    const argumentsNum = handler.length;
    if (argumentsNum === 0) {
      return handler();
    }
    return handler(fieldPath, value);
  }
  throw new ValidationError(`Invalid specification for operation '${operation}', filter by path '${fieldPath}'.`);
}

function getSupportedOperationsFromMap(map) {
  return Object.keys(map)
    .map(op => `'${op}'`)
    .join(', ');
}

const safe = { safe: true };
const stringOperations = {
  contains: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, safe)),
  notcontains: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, { ...safe, negate: true })),
  startswith: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, { ...safe, startsWith: true })),
  endswith: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, { ...safe, endsWith: true })),
  regex: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, safe)),
  notRegex: (fieldPath, value) => constructRegex(fieldPath, toRegExp(value, { ...safe, negate: true })),
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
  undefined: fieldPath => ({ [fieldPath]: { $exists: false } }),
};

module.exports = {
  construct,
  constructRegex,
  createFilter,
  getSupportedOperationsFromMap,
  stringOperations,
};
