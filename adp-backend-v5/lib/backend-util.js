/**
 * Implements various utilities used in the backend
 * @returns {{}}
 */

const _ = require('lodash');
const crypto = require('crypto');
const { ObjectID } = require('mongodb');

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

const MONGO_CONST = {
  QUERY: {
    FALSE: { _id: { $exists: false } },
    TRUE: { _id: { $exists: true } },
  },
  EXPR: {
    FALSE: { $eq: [true, false] },
    TRUE: { $eq: [true, true] },
  },
};

const getModelNameByReq = req => {
  const urlParts = getUrlParts(req);
  return _.get(urlParts, 0);
};

module.exports = {
  getUrlParts,
  generateId,
  generateObjectId,
  camelCase2CamelText,
  isValidObjectId,
  getModelNameByReq,
  MONGO_CONST,
};
