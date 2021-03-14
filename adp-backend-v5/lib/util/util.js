/**
 * Implements various utilities used in the backend
 * @returns {{}}
 */

const _ = require('lodash');
const dayjs = require('dayjs');
const crypto = require('crypto');
const { ObjectID } = require('mongodb');
const stringifySafe = require('json-stringify-safe');
const { getFunction } = require('./memoize');

function getUrlParts(url) {
  return encodeURI(url)
    .replace(/^\//, '')
    .replace(/\.json.*$/, '')
    .replace(/\?.*$/, '')
    .split('/'); // TODO: .toLocaleLowerCase()
}

function getUrlWithoutPrefix(url, prefix) {
  return url.startsWith(prefix) ? url.substring(prefix.length) : url;
}

function generateId(base) {
  return crypto
    .createHash('md5')
    .update(base || `${Date.now()}${Math.random() * 1000}`)
    .digest('hex')
    .substr(4, 24);
}

/**
 * Generates unique ID for an element
 * @param base the seed for the ID. Generated IDs for the same seed are the same
 */
function generateObjectId(base) {
  return new ObjectID(generateId(base));
}

function camelCase2CamelText(key) {
  return _.capitalize(key.replace(/([A-Z](?=[A-Z][a-z])|[^A-Z](?=[A-Z])|[a-zA-Z](?=[^a-zA-Z]))/g, '$1 '));
}

const MONGO = {
  expr(expression) {
    if (expression === true || expression === false) {
      return expression;
    }
    return { $expr: expression };
  },
  and(...conditions) {
    return getCleanedConditions('and', ...conditions);
  },
  or(...conditions) {
    return getCleanedConditions('or', ...conditions);
  },
};

function getCleanedConditions(operator, ...conditions) {
  const filtered = [];
  for (const c of Object.values(conditions)) {
    const falseCondition = isFalseCondition(c);
    if (falseCondition && operator === 'and') {
      return false;
    }
    if (falseCondition && operator === 'or') {
      continue;
    }

    const trueCondition = isTrueCondition(c);
    if (trueCondition && operator === 'and') {
      continue;
    }
    if (trueCondition && operator === 'or') {
      return true;
    }

    if (!_.isEmpty(c)) {
      filtered.push(c);
    }
  }

  if (filtered.length > 1) {
    return { [`$${operator}`]: [...filtered] };
  }
  if (filtered.length === 1) {
    return filtered[0];
  }

  if (conditions.length && operator === 'or') {
    return false;
  }
  return true;
}

function isFalseCondition(c) {
  return c === false || _.isEqual(c, { $eq: [true, false] });
}

function isTrueCondition(c) {
  return c === true || _.isEqual(c, { $eq: [true, true] }) || _.isEqual(c, { $eq: [1, 1] });
}

function mapValuesDeep(obj, handler) {
  if (_.isArray(obj)) {
    return obj.map((innerObj) => mapValuesDeep(innerObj, handler));
  }
  if (_.isPlainObject(obj)) {
    return _.reduce(
      obj,
      (res, val, key) => {
        res[key] = mapValuesDeep(val, handler);
        return res;
      },
      {}
    );
  }
  return handler(obj);
}

const checkForHexRegExp = /^[0-9a-fA-F]{24}$/;
function isValidObjectId(id) {
  if (!id) {
    return false;
  }

  if (typeof id === 'string') {
    return id.length === 12 || (id.length === 24 && checkForHexRegExp.test(id));
  }

  if (id instanceof ObjectID) {
    return true;
  }

  // Duck-Typing detection of ObjectId like objects
  if (id.toHexString) {
    return id.id.length === 12 || (id.id.length === 24 && checkForHexRegExp.test(id.id));
  }

  return false;
}

function stringifyObjectId(obj) {
  const valHandler = (val) => {
    if (isValidObjectId(val)) {
      return val.toString();
    }
    return val;
  };

  return mapValuesDeep(obj, valHandler);
}

/**
 * Gets error message if its mongo duplicate error.
 * Mongo duplicate error may be represented as:
 * - E11000 duplicate key error collection: rlog-mobile.refrigerantTypes index: refrigerantTypeName_1 dup key: { : "123" }
 * - E11000 duplicate key error collection: rlog-mobile.refrigerantTypes index: array.nestedArrayStr_1 dup key: { : "123" }
 * - E11000 duplicate key error collection: rlog-mobile.refrigerantTypes index: obj.nestedObjNumber_1 dup key: { : 11111111 }
 * NOTE: If many fields break index constraint then only one field is represented in error message.
 * @param error
 * @param models
 * @returns {*}
 */
function getMongoDuplicateErrorMessage(error, models) {
  const isDuplicateError = ['BulkWriteError', 'MongoError'].includes(error.name) && error.code === 11000;
  if (!isDuplicateError) {
    return null;
  }
  // find out errorValue from error message because its not possible to get it from indexName if error occurred in array
  const match = error.message.match(
    /E11000 duplicate key error collection: (?:.+)\.(.+) index: (.+) dup key: { (.+): (.+) }/
  );

  if (!match) {
    return `Unable to process due to duplicate error.`;
  }

  const [, collectionName, , indexField, errorValue] = match;
  const schema = models[collectionName];
  const schemaField = _.get(schema.fields, indexField.replace(/\./g, '.fields.'));
  const schemaFieldFullName = _.get(schemaField, 'fullName', indexField);
  const schemaFullName = schema.fullName;
  if (errorValue === 'null') {
    return `Unable to process. '${schemaFullName}' record with empty '${schemaFieldFullName}' already exists`;
  }

  let formattedErrorValue = errorValue;
  if (_.get(schemaField, 'type') === 'String' && errorValue.startsWith('"') && errorValue.endsWith('"')) {
    formattedErrorValue = errorValue.slice(1, -1);
  }
  return `Unable to process. '${schemaFullName}' record with the '${schemaFieldFullName}' '${formattedErrorValue}' already exists`;
}

function getMongoSortParallelArrayErrorMessage(error) {
  if (error.name === 'MongoError' && error.message === 'cannot sort with keys that are parallel arrays') {
    return 'Unable to sort by more than 1 array fields';
  }
}

const defaultArgsAndValuesForInlineCode = {
  args: `dayjs, _, ObjectID, and, or`,
  values: [dayjs, _, ObjectID, MONGO.and, MONGO.or],
};

function getDefaultArgsAndValuesForInlineCode() {
  return defaultArgsAndValuesForInlineCode;
}

function getDocValueForExpression(doc, expression) {
  const { args, values } = getDefaultArgsAndValuesForInlineCode();
  return getFunction(args, `return ${expression}`).apply(doc, values);
}

function stringifyLog(obj, space) {
  const valHandler = (value) => {
    if (value instanceof RegExp) {
      return value.toString();
    }
    if (value instanceof ObjectID) {
      return `ObjectID(${value.toString()})`;
    }
    if (value instanceof ObjectID) {
      return `ObjectID(${value.toString()})`;
    }
    return value;
  };

  return stringifySafe(mapValuesDeep(obj, valHandler), null, space);
}

function stringifyObj(obj) {
  return stringifyLog(obj, 2);
}

function getRequestMeta(context, meta) {
  const { userPermissions, roles } = context;
  return stringifyLog({ userPermissions: [...userPermissions], roles: [...roles], ...meta });
}

function sortObjectByKeys(o) {
  return Object.keys(o)
    .sort()
    .reduce((result, key) => {
      result[key] = o[key];
      return result;
    }, {});
}

function getJsonPathByFullModelPath(models, modelPath) {
  const mPath = modelPath.slice();
  const schemeName = mPath.shift();
  let curScheme = models[schemeName];
  const jsonPath = [];
  _.each(mPath, (pathPart) => {
    curScheme = curScheme[pathPart];
    if (pathPart !== 'fields') {
      if (curScheme.type === 'Array') {
        jsonPath.push(`${pathPart}[*]`);
      } else {
        jsonPath.push(pathPart);
      }
    }
  });
  return { schemeName, jsonPath: jsonPath.join('.') };
}

function getMongoPathByFullModelPath(models, modelPath) {
  const mPath = modelPath.slice();
  const schemeName = mPath.shift();
  let curScheme = models[schemeName];
  const mongoPath = [];
  _.each(mPath, (pathPart) => {
    curScheme = curScheme[pathPart];
    if (pathPart !== 'fields') {
      if (curScheme.type === 'Array') {
        mongoPath.push(`${pathPart}.$[]`);
      } else {
        mongoPath.push(pathPart);
      }
    }
  });
  return { schemeName, mongoPath: mongoPath.join('.') };
}

function getItemPathByFullModelPath(modelPath) {
  return modelPath
    .slice(1)
    .filter((p) => p !== 'fields')
    .join('.');
}

function getBeforeAndAfterLastArrayPath(mongoPath) {
  // find last array in mongoPath
  const lastArrayIndex = mongoPath.lastIndexOf('.$[]');
  let beforeArrPath;
  let afterArrPath;
  if (lastArrayIndex === -1) {
    beforeArrPath = null;
    afterArrPath = null;
  } else {
    beforeArrPath = mongoPath.slice(0, lastArrayIndex);
    afterArrPath = mongoPath.slice(lastArrayIndex + 5);
  }
  return { beforeArrPath, afterArrPath };
}

/**
 * Utility method returning mongodb-compatible query for full-text search in given fields
 * @param searchConditions the query to update with the search terms
 * @param fields the list of fields
 * @param term the term to search for
 */
function updateSearchConditions(searchConditions, fields, term) {
  if (!_.isString(term) || !term.length) {
    return;
  }
  fields.forEach((field) => {
    const condition = {};
    /* eslint-disable security/detect-non-literal-regexp */
    condition[field] = new RegExp(`${term || ''}.*`, 'i');
    searchConditions.push(condition);
  });
}
function isMongoSupportsSessions(dbCon) {
  const isStandalone = [...dbCon.s.topology.s.description.servers.values()]
    .map((serverDescription) => serverDescription.type)
    .includes('Standalone');
  return !isStandalone;
}

function expandObjectAsKeyValueList(obj) {
  let string = '';
  _.each(obj, (val, key) => {
    string += `${key}: ${val}\n`;
  });
  return string;
}

function expandObjectAsNumberedList(obj) {
  let string = '';
  let itemNumber = 1;
  _.each(obj, (val, key) => {
    string += `${itemNumber}) ${key}: ${val}\n`;
    itemNumber++;
  });
  return string;
}

function showMemoryUsage(logger = console) {
  const used = process.memoryUsage();
  let message = '\n';
  Object.entries(used).forEach(([key, val]) => {
    message += `${key} ${Math.round((val / 1024 / 1024) * 100) / 100} MB\n`;
  });
  logger.info(message);
}

function handleResult(res, func = (r) => r) {
  const isPromise = !!res.then;
  if (isPromise) {
    return res.then((resolvedResult) => func.call(this, resolvedResult));
  }
  return func.call(this, res);
}

module.exports = {
  getUrlParts,
  getUrlWithoutPrefix,
  generateId,
  generateObjectId,
  camelCase2CamelText,
  isValidObjectId,
  MONGO,
  mapValuesDeep,
  stringifyObjectId,
  getMongoDuplicateErrorMessage,
  getMongoSortParallelArrayErrorMessage,
  getDefaultArgsAndValuesForInlineCode,
  getDocValueForExpression,
  stringifyLog,
  stringifyObj,
  getRequestMeta,
  sortObjectByKeys,
  getJsonPathByFullModelPath,
  getMongoPathByFullModelPath,
  getItemPathByFullModelPath,
  getBeforeAndAfterLastArrayPath,
  updateSearchConditions,
  isMongoSupportsSessions,
  expandObjectAsKeyValueList,
  expandObjectAsNumberedList,
  showMemoryUsage,
  handleResult,
};
