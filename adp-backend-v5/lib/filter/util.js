const { ValidationError } = require('../errors');

const typeToFilterName = {
  Date: 'date', // check https://jira.conceptant.com/browse/UNI-427
  Time: 'time',
  DateTime: 'dateTime',
  String: 'string',
  'String[]': 'stringMultiple',
  Number: 'number',
  Boolean: 'boolean',
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
};

function getDefaultFilterName(fieldScheme) {
  const { type, list } = fieldScheme;
  if (!type) {
    throw new ValidationError('Scheme type must be specified');
  }

  if (list) {
    if (list.isDynamicList) {
      return 'dynamicList';
    }

    if (type.endsWith('[]')) {
      return 'listMultiple';
    }
    return 'list';
  }
  return typeToFilterName[type];
}

module.exports = {
  getDefaultFilterName,
};
