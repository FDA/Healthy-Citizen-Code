/**
 * Implements various utilities used in the backend
 * @returns {{}}
 */

const _ = require('lodash');
const crypto = require('crypto');
const ObjectID = require('mongodb').ObjectID;

const getUrlParts = (req) => {
  return encodeURI(req.url).replace(/^\//, '').replace(/\.json.*$/, '').replace(/\?.*$/, '').split('/'); // TODO: .toLocaleLowerCase()
};

const generateId = (base) => {
  return crypto.createHash('md5').update(base || ("" + Date.now() + Math.random() * 1000)).digest("hex").substr(4, 24);
};

/**
 * Generates unique ID for an element
 * @param base the seed for the ID. Generated IDs for the same seed are the same
 */
const generateObjectId = (base) => {
  return new ObjectID(generateId(base));
};

const camelCase2CamelText = (key) => {
  return _.capitalize(key.replace(/([A-Z](?=[A-Z][a-z])|[^A-Z](?=[A-Z])|[a-zA-Z](?=[^a-zA-Z]))/g, '$1 '));
};

const isValidObjectId = (str) => {
  return /^[a-fA-F0-9]{24}$/.test(str);
};

const evalWithContext = (jsCode, context) => {
  return function() {
    let result;
    eval(`result=${jsCode}`);
    return result;
  }.call(context);
};

const MONGO_CONST = {
  QUERY: {
    FALSE: {'_id': {$exists: false}},
    TRUE: {'_id': {$exists: true}},
  },
  EXPR: {
    FALSE: { $eq: [true, false] },
    TRUE: { $eq: [true, true] },
  }
};

module.exports = {
  getUrlParts,
  generateId,
  generateObjectId,
  camelCase2CamelText,
  evalWithContext,
  isValidObjectId,
  MONGO_CONST
};
