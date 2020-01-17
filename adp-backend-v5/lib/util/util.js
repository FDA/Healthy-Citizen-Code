/**
 * Implements various utilities used in the backend
 * @returns {{}}
 */

const _ = require('lodash');
const moment = require('moment');
const crypto = require('crypto');
const { ObjectID } = require('mongodb');
const hash = require('object-hash');

function getUrlParts(req) {
  return encodeURI(req.url)
    .replace(/^\//, '')
    .replace(/\.json.*$/, '')
    .replace(/\?.*$/, '')
    .split('/'); // TODO: .toLocaleLowerCase()
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
      // eslint-disable-next-line no-continue
      continue;
    }

    const trueCondition = isTrueCondition(c);
    if (trueCondition && operator === 'and') {
      // eslint-disable-next-line no-continue
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
    return obj.map(innerObj => mapValuesDeep(innerObj, handler));
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
  const valHandler = val => {
    if (isValidObjectId(val)) {
      return val.toString();
    }
    return val;
  };

  return mapValuesDeep(obj, valHandler);
}

function hashObject(obj) {
  const hashParamObj = stringifyObjectId(obj);
  return hash(hashParamObj, { algorithm: 'sha256', encoding: 'base64' });
}

/**
 * Gets error message if its mongo duplicate error.
 * Mongo duplicate error may be represented as:
 * - E11000 duplicate key error collection: rlog-mobile.refrigerantTypes index: refrigerantTypeName_1 dup key: { : "123" }
 * - E11000 duplicate key error collection: rlog-mobile.refrigerantTypes index: array.nestedArrayStr_1 dup key: { : "123" }
 * - E11000 duplicate key error collection: rlog-mobile.refrigerantTypes index: obj.nestedObjNumber_1 dup key: { : 11111111 }
 * NOTE: If many fields break index constraint then only one field is represented in error message.
 * @param err
 * @param appLib
 * @returns {*}
 */
function getMongoDuplicateErrorMessage(err, models) {
  if (!(err.name === 'MongoError' && err.code === 11000)) {
    return null;
  }
  // find out errorValue from error message because its not possible to get it from indexName if error occurred in array
  const [, collectionName, indexName, errorValue] = err.message.match(
    /E11000 duplicate key error collection: (?:.+)\.(.+) index: (.+) dup key: { : (.+) }/
  );
  const errorFieldPath = (indexName || '').replace(/_\d+$/, '');
  const schema = models[collectionName];
  const errorField = _.get(schema.fields, errorFieldPath.replace(/\./g, '.fields.'));
  const errorFieldName = _.get(errorField, 'fullName', errorFieldPath);
  const itemName = schema.fullName;
  if (errorValue === 'null') {
    return `Unable to create item. A ${itemName} with empty ${errorFieldName} already exists`;
  }
  return `Unable to create item. A ${itemName} with the ${errorFieldName} ${errorValue} already exists`;
}

const defaultArgsAndValuesForInlineCode = {
  args: `moment, _, ObjectID, and, or`,
  values: [moment, _, ObjectID, MONGO.and, MONGO.or],
};

function getDefaultArgsAndValuesForInlineCode() {
  return defaultArgsAndValuesForInlineCode;
}

function getDocValueForExpression(doc, expression) {
  const { args, values } = getDefaultArgsAndValuesForInlineCode();
  return new Function(args, `return ${expression}`).apply(doc, values);
}

function stringifyLog(obj, space) {
  const valHandler = value => {
    if (value instanceof RegExp) {
      return value.toString();
    }
    if (value instanceof ObjectID) {
      return `ObjectID(${value.toString()})`;
    }
    return value;
  };

  return JSON.stringify(mapValuesDeep(obj, valHandler), null, space);
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
  _.each(mPath, pathPart => {
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
  _.each(mPath, pathPart => {
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
    .filter(p => p !== 'fields')
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
  fields.forEach(field => {
    const condition = {};
    /* eslint-disable security/detect-non-literal-regexp */
    condition[field] = new RegExp(`${term || ''}.*`, 'i');
    searchConditions.push(condition);
  });
}
function isMongoReplicaSet(mongooseCon) {
  const isStandalone = [...mongooseCon.db.s.topology.s.description.servers.values()]
    .map(s => s.type)
    .includes('Standalone');
  return !isStandalone;
}

module.exports = {
  getUrlParts,
  generateId,
  generateObjectId,
  camelCase2CamelText,
  isValidObjectId,
  MONGO,
  mapValuesDeep,
  stringifyObjectId,
  hashObject,
  getMongoDuplicateErrorMessage,
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
  isMongoReplicaSet,
};
