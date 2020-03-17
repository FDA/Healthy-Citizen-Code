/**
 * Filters Where to be called by the BACKEND ONLY
 *
 * Each function is called with unified context.
 */

module.exports = () => {
  const m = {};

  m.number = require('./filters/number');
  m.decimal128 = require('./filters/decimal128');
  m.time = require('./filters/time');
  m.date = require('./filters/date');
  m.dateTime = require('./filters/dateTime');
  m.list = require('./filters/list');
  m.listMultiple = m.list;
  m.string = require('./filters/string');
  m.stringMultiple = m.string;
  m.password = require('./filters/password');
  m.boolean = require('./filters/boolean');
  m.none = require('./filters/none');
  m.file = require('./filters/file');
  m.fileMultiple = m.file;
  m.objectId = require('./filters/objectId');
  m.lookupObjectId = require('./filters/lookupObjectId');
  m.lookupObjectIdMultiple = m.lookupObjectId;
  m.treeSelector = require('./filters/treeSelector');
  m.location = require('./filters/location');
  m.imperialHeight = require('./filters/imperialHeight');
  m.imperialWeight = require('./filters/imperialWeight');
  m.imperialWeightWithOz = require('./filters/imperialWeightWithOz');

  return m;
};
