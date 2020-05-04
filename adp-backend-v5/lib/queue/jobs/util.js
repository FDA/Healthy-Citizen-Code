const _ = require('lodash');
const Promise = require('bluebird');
const { ObjectID } = require('mongodb');
const { getDocValueForExpression } = require('../../util/util');
const { ValidationError } = require('../../errors');
const { PERMISSIONS } = require('../../../lib/access/access-config');

function getCreator(appLib, user) {
  const userLabel = _.get(appLib.appModel.models.backgroundJobs, 'creator.lookup.table.users.label');
  const creatorId = user._id;
  return {
    _id: creatorId, // it's passed as string to redis job
    table: 'users',
    label: userLabel ? getDocValueForExpression(user, userLabel) : user.login,
  };
}

function flattenObject(obj, prefix = '', delimiter = '_') {
  if (!obj) {
    return {};
  }

  const result = {};
  _.each(obj, (val, key) => {
    key = prefix ? `${prefix}${delimiter}${key}` : key;
    if (_.isObject(val)) {
      const flatObject = flattenObject(val, null, delimiter);
      _.each(flatObject, (nestedObjVal, nestedObjKey) => {
        result[`${key}${delimiter}${nestedObjKey}`] = nestedObjVal;
      });
    } else {
      result[key] = val;
    }
  });
  return result;
}

function handleJobError({ error, defaultMessage, log }) {
  if (error instanceof ValidationError) {
    log.error(defaultMessage, error.message);
    return { success: false, message: error.message };
  }

  log.error(defaultMessage, error.stack);
  return { success: false, message: defaultMessage };
}

function getPercentage(processedCount, overallCount) {
  const ratio = Math.floor((processedCount / overallCount) * 100) / 100;
  return ratio * 100;
}

function processDataMapping({ input, dataMapping, response }) {
  const context = { input, response };

  const fieldsMapping = _.get(dataMapping, 'fieldsMapping', []);
  const basicMapping = {};
  _.each(fieldsMapping, (fieldMapping) => {
    const { inputFieldName, outputFieldName } = fieldMapping;
    basicMapping[inputFieldName] = outputFieldName;
  });
  context.basicMapping = basicMapping;

  let output;
  if (!_.isPlainObject(input) || _.isEmpty(context.basicMapping)) {
    output = input;
  } else {
    output = {};
    _.each(context.basicMapping, (outputFieldName, inputFieldName) => {
      const inputValue = _.get(input, inputFieldName);
      _.set(output, outputFieldName, inputValue);
    });
  }
  context.output = output;

  const postProcessingCode = _.get(dataMapping, 'postProcessingCode');
  if (!postProcessingCode) {
    return output;
  }
  const values = [flattenObject, _, ObjectID];
  return new Function(`flattenObject, _, ObjectID`, postProcessingCode).apply(context, values);
}

function getSchemeFieldsByOutputs(outputs, prefix = '', delimiter = '_') {
  const fields = {};

  _.each(outputs, ({ name, type }) => {
    let fieldType;
    if (type === 'number') {
      fieldType = 'Number';
    } else if (type === 'string') {
      fieldType = 'String';
    } else if (type === 'boolean') {
      fieldType = 'Boolean';
    }

    if (fieldType) {
      const fieldName = prefix ? `${prefix}${delimiter}${name}` : name;
      const { accessAsAnyone } = PERMISSIONS;
      fields[fieldName] = {
        type: fieldType,
        fieldName,
        filter: fieldType.toLowerCase(),
        showInDatatable: true,
        showInViewDetails: true,
        showInGraphql: true,
        showInColumnChooser: true,
        width: 80,
        permissions: {
          view: accessAsAnyone,
          create: accessAsAnyone,
          update: accessAsAnyone,
          upsert: accessAsAnyone,
        },
      };
    }
  });

  return fields;
}

function upsertResultRecords({ db, collection, resultRecords, $setOnInsert, concurrency = 50 }) {
  return Promise.map(
    resultRecords,
    (resultRecord) => {
      const { _id } = resultRecord;
      return db.collection(collection).updateOne({ _id }, { $set: resultRecord, $setOnInsert }, { upsert: true });
    },
    { concurrency }
  );
}

function getLookupDoc(appLib, lookup, projections = {}) {
  if (!_.isPlainObject(lookup)) {
    return null;
  }

  const { _id, table } = lookup;
  if (!_id || !table) {
    return null;
  }
  return appLib.db
    .collection(table)
    .findOne({ _id: ObjectID(_id), ...appLib.dba.getConditionForActualRecord() }, projections);
}

module.exports = {
  getCreator,
  flattenObject,
  handleJobError,
  getPercentage,
  processDataMapping,
  getSchemeFieldsByOutputs,
  upsertResultRecords,
  getLookupDoc,
};
