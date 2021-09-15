const { ObjectId } = require('bson');
const _ = require('lodash');

// Inspired by https://github.com/variety/variety and adopted to ADP types
function getVarietyResults(docs, opts) {
  const { maxDepth, arrayEscape } = opts;

  const getType = function (value) {
    const valueType = typeof value;
    if (value === null) {
      return 'null';
    }
    if (_.isArray(value)) {
      return 'Array';
    }

    const bsontype = _.get(value, '_bsontype');
    if (ObjectId.isValid(value) && bsontype === 'ObjectID') {
      return 'ObjectID';
    }
    if (valueType === 'boolean') {
      return 'Boolean';
    }
    if (valueType === 'string') {
      return 'String';
    }

    if (valueType === 'number') {
      const INT32_MAX = 0x7fffffff;
      const INT32_MIN = -0x80000000;
      if (Number.isInteger(value) && value >= INT32_MIN && value <= INT32_MAX) {
        return 'Int32';
      }
      return 'Number';
    }
    if (bsontype === 'Long') {
      return 'Int64';
    }
    if (bsontype === 'Decimal128') {
      return 'Decimal128';
    }

    if (value instanceof Date) {
      // Epoch used for deletedAt
      const isEpoch = value.getTime() === new Date(0).getTime();
      if (isEpoch) {
        return 'DateTime';
      }

      const isoDate = value.toISOString();
      if (/1970-01-01T\d{2}:\d{2}:00.000Z/.test(isoDate)) {
        return 'Time';
      }
      if (/\d{4}-\d{2}-\d{2}T00:00:00\.000Z/.test(isoDate)) {
        return 'Date';
      }
      return 'DateTime';
    }

    if (_.isPlainObject(value)) {
      if (value._id && value.table) {
        return 'LookupObjectID';
      }

      const fileFields = ['name', 'size', 'type', 'id', 'cropped'];
      const hasAllFileFields = !fileFields.find((f) => !_.has(value, f));
      const isFile = hasAllFileFields && _.isString(value.type);
      if (isFile) {
        if (value.type.startsWith('audio')) {
          return 'Audio';
        }
        if (value.type.startsWith('video')) {
          return 'Video';
        }
        if (value.type.startsWith('image')) {
          return 'Image';
        }
        return 'File';
      }

      if (_.isArray(value.coordinates) && value.coordinates.length === 2 && _.isString(value.label)) {
        return 'Location';
      }

      return 'Object';
    }

    return 'String';
  };

  // Flattens object keys. i.e. {'key1':1,{'key2':{'key3':2}}} becomes {'key1':1,'key2.key3':2}
  // We assume no '.' characters in the keys, which is an OK assumption for MongoDB
  const serializeDoc = function (doc) {
    const result = {};

    function serialize(document, parentKey, _maxDepth) {
      _.each(document, (value, key) => {
        if (Array.isArray(document)) {
          key = arrayEscape + key + arrayEscape;
        }
        result[parentKey + key] = value;

        if ((_.isArray(value) || _.isPlainObject(value)) && _maxDepth > 1) {
          serialize(value, `${parentKey + key}.`, _maxDepth - 1);
        }
      });
    }
    serialize(doc, '', maxDepth);
    return result;
  };

  // Convert document to key-value map with types
  const analyzeDocument = function (document) {
    const result = {};
    const arrayRegex = new RegExp(`\\.${arrayEscape}\\d+${arrayEscape}`, 'g');
    _.each(document, (value, key) => {
      key = key.replace(arrayRegex, `.${arrayEscape}`);
      if (typeof result[key] === 'undefined') {
        result[key] = {};
      }
      const type = getType(value);
      if (type) {
        result[key][type] = null;
      }
    });

    return result;
  };

  const mergeDocument = function (docResult, interimResults) {
    _.each(docResult, (docResultValue, key) => {
      const keyTypes = _.keys(docResultValue);
      if (!_.has(interimResults, key)) {
        const types = {};
        _.each(keyTypes, (newType) => {
          types[newType] = 1;
        });
        interimResults[key] = { types, totalOccurrences: 1 };
      } else {
        const existing = interimResults[key];
        _.each(keyTypes, (type) => {
          existing.types[type] = _.has(existing.types, type) ? existing.types[type] + 1 : 1;
        });
        existing.totalOccurrences += 1;
      }
    });
  };

  const convertResults = function (interimResults, documentsCount) {
    const varietyResults = [];

    _.each(interimResults, (entry, key) => {
      const types = _.clone(entry.types);
      const result = {
        key,
        types,
        totalOccurrences: entry.totalOccurrences,
        percentContaining: (entry.totalOccurrences * 100) / documentsCount,
      };
      const [mostUsedType] = _.maxBy(_.entries(types), ([, occurences]) => occurences);
      if (mostUsedType === 'Boolean' && types.null) {
        result.resolvedType = 'TriStateBoolean';
      } else {
        result.resolvedType = mostUsedType;
      }
      result.isFieldOfSingleType = _.keys(types).length === 1;

      varietyResults.push(result);
    });

    return varietyResults;
  };

  const interimResults = {};
  _.each(docs, (doc) => {
    const serializedDoc = serializeDoc(doc);
    const analyzedDoc = analyzeDocument(serializedDoc);
    mergeDocument(analyzedDoc, interimResults);
  });
  const varietyResults = convertResults(interimResults, docs.length);
  return varietyResults;
}

function guessSchema(docs) {
  const varietyOpts = { maxDepth: 50, arrayEscape: '_XX_' };
  const varietyResults = getVarietyResults(docs, varietyOpts);

  const objectTypes = ['LookupObjectID', 'Audio', 'Video', 'Image', 'File', 'Location'];
  for (let i = 0; i < varietyResults.length; i++) {
    const v = varietyResults[i];

    let deleteCurElement = false;
    const isArrayElementResult = v.key.endsWith(`.${varietyOpts.arrayEscape}`);
    if (isArrayElementResult) {
      // Handle array elements since ADP has '${type}[]' types and 'Array' type which implies array of objects
      deleteCurElement = true;
      if (v.resolvedType !== 'Object') {
        // Change Array type of previous field to specific type
        const arrayResult = varietyResults[i - 1];
        arrayResult.resolvedType = v.isFieldOfSingleType ? `${v.resolvedType}[]` : `Mixed`;
      }
    }

    const isIdInsideArray = v.key.endsWith(`.${varietyOpts.arrayEscape}._id`);
    if (isIdInsideArray) {
      // Remove automatically added mongo _id inside array since it's not part of ADP schema
      deleteCurElement = true;
    }

    if (objectTypes.includes(v.resolvedType)) {
      let lastIndexOfObjectTypeField = i + 1;
      while (
        lastIndexOfObjectTypeField < varietyResults.length &&
        varietyResults[lastIndexOfObjectTypeField].key.startsWith(v.key)
      ) {
        lastIndexOfObjectTypeField++;
      }
      const deleteCount = lastIndexOfObjectTypeField - i - 1;
      varietyResults.splice(i + 1, deleteCount);
    }

    if (deleteCurElement) {
      varietyResults.splice(i, 1);
      i--;
    }
  }

  const adpSchema = {};
  _.each(varietyResults, (v) => {
    const fieldPath = v.key.replace(`.${varietyOpts.arrayEscape}`, '');
    const fieldPathIncludingFields = `fields.${fieldPath.split('.').join('.fields.')}`;
    _.set(adpSchema, fieldPathIncludingFields, { type: v.resolvedType });
  });
  return adpSchema;
}

module.exports = {
  getVarietyResults,
  guessSchema,
};
