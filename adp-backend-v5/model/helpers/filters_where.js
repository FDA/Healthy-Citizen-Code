/**
 * Filters Where to be called by the BACKEND ONLY
 *
 * Each function is called with unified context.
 */

module.exports = () => {
  const m = {};

  m.number = require('./filters/number');
  const { decimal128, decimal128ForSift } = require('./filters/decimal128');
  m.decimal128 = decimal128;
  m.decimal128ForSift = decimal128ForSift;

  m.time = require('./filters/time');
  m.date = require('./filters/date');
  m.dateTime = require('./filters/dateTime');

  m.list = require('./filters/list');
  m.listMultiple = require('./filters/listMultiple');
  m.string = require('./filters/string');
  m.stringMultiple = m.string;
  m.password = require('./filters/password');
  m.boolean = require('./filters/boolean');
  m.none = require('./filters/none');
  m.file = require('./filters/file');
  m.fileMultiple = m.file;

  const { objectIdForSift, objectId } = require('./filters/objectId');
  m.objectId = objectId;
  m.objectIdForSift = objectIdForSift;
  const { lookupObjectId, lookupObjectIdForSift } = require('./filters/lookupObjectId');
  m.lookupObjectId = lookupObjectId;
  m.lookupObjectIdMultiple = m.lookupObjectId;
  m.lookupObjectIdForSift = lookupObjectIdForSift;
  m.lookupObjectIdMultipleForSift = lookupObjectIdForSift;
  const { treeSelector, treeSelectorForSift } = require('./filters/treeSelector');
  m.treeSelector = treeSelector;
  m.treeSelectorForSift = treeSelectorForSift;

  const { imperialHeight, imperialHeightForSift } = require('./filters/imperialHeight');
  m.imperialHeight = imperialHeight;
  m.imperialHeightForSift = imperialHeightForSift;
  const { imperialWeight, imperialWeightForSift } = require('./filters/imperialWeight');
  m.imperialWeight = imperialWeight;
  m.imperialWeightForSift = imperialWeightForSift;
  const { imperialWeightWithOz, imperialWeightWithOzForSift } = require('./filters/imperialWeightWithOz');
  m.imperialWeightWithOz = imperialWeightWithOz;
  m.imperialWeightWithOzForSift = imperialWeightWithOzForSift;

  m.location = require('./filters/location');

  return m;
};
