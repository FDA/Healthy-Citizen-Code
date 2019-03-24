/**
 * Implements various utilities used in the backend
 * @returns {{}}
 */

const _ = require('lodash');
const moment = require('moment');
const crypto = require('crypto');
const { ObjectID } = require('mongodb');
const hash = require('object-hash');

const getUrlParts = req =>
  encodeURI(req.url)
    .replace(/^\//, '')
    .replace(/\.json.*$/, '')
    .replace(/\?.*$/, '')
    .split('/'); // TODO: .toLocaleLowerCase()

const generateId = base =>
  crypto
    .createHash('md5')
    .update(base || `${Date.now()}${Math.random() * 1000}`)
    .digest('hex')
    .substr(4, 24);

/**
 * Generates unique ID for an element
 * @param base the seed for the ID. Generated IDs for the same seed are the same
 */
const generateObjectId = base => new ObjectID(generateId(base));

const camelCase2CamelText = key =>
  _.capitalize(key.replace(/([A-Z](?=[A-Z][a-z])|[^A-Z](?=[A-Z])|[a-zA-Z](?=[^a-zA-Z]))/g, '$1 '));

const isValidObjectId = str => /^[a-fA-F0-9]{24}$/.test(str);

const MONGO = {
  QUERY: {
    FALSE: { _id: { $exists: false } },
    TRUE: { _id: { $exists: true } },
  },
  EXPR: {
    FALSE: { $eq: [true, false] },
    TRUE: { $eq: [true, true] },
  },
  expr(expression) {
    return { $expr: expression };
  },
  and(...conditions) {
    return getConditionForQueryOperator('and', ...conditions);
  },
  or(...conditions) {
    return getConditionForQueryOperator('or', ...conditions);
  },
  nor(...conditions) {
    return getConditionForQueryOperator('nor', ...conditions);
  },
};

function getConditionForQueryOperator(operator, ...conditions) {
  const filtered = conditions.filter(c => !_.isEmpty(c));
  if (filtered.length > 1) {
    return { [`$${operator}`]: [...filtered] };
  }
  if (filtered.length === 1) {
    return filtered[0];
  }
  return {};
}

const getModelNameByReq = req => {
  const urlParts = getUrlParts(req);
  return _.get(urlParts, 0);
};

const mapValuesDeep = (obj, handler) => {
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
};

const stringifyObjectId = obj => {
  const valHandler = val => {
    if (ObjectID.isValid(val)) {
      return val.toString();
    }
    return val;
  };

  return mapValuesDeep(obj, valHandler);
};

const hashObject = obj => {
  const hashParamObj = stringifyObjectId(obj);
  return hash(hashParamObj, { algorithm: 'sha256', encoding: 'base64' });
};

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
const getMongoDuplicateErrorMessage = (err, appLib) => {
  if (!(err.name === 'MongoError' && err.code === 11000)) {
    return null;
  }
  // find out errorValue from error message because its not possible to get it from indexName if error occurred in array
  const [, collectionName, indexName, errorValue] = err.message.match(
    /E11000 duplicate key error collection: (?:.+)\.(.+) index: (.+) dup key: { : (.+) }/
  );
  const errorFieldPath = (indexName || '').replace(/_\d+$/, '');
  const schema = appLib.appModel.models[collectionName];
  const errorField = _.get(schema.fields, errorFieldPath.replace(/\./g, '.fields.'));
  const errorFieldName = errorField.fullName;
  const itemName = schema.fullName;
  if (errorValue === 'null') {
    return `Unable to create item. A ${itemName} with empty ${errorFieldName} already exists`;
  }
  return `Unable to create item. A ${itemName} with the ${errorFieldName} ${errorValue} already exists`;
};

const getDefaultArgsAndValuesForInlineCode = () => ({
  args: `moment, _, ObjectID`,
  values: [moment, _, ObjectID],
});

module.exports = {
  getUrlParts,
  generateId,
  generateObjectId,
  camelCase2CamelText,
  isValidObjectId,
  getModelNameByReq,
  MONGO,
  mapValuesDeep,
  stringifyObjectId,
  hashObject,
  getMongoDuplicateErrorMessage,
  getDefaultArgsAndValuesForInlineCode,
};
