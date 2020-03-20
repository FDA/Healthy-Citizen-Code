const fs = require('fs-extra');
const Promise = require('bluebird');
const _ = require('lodash');
const { getSiftFilteringFunc } = require('../../util/sift');
const { ValidationError } = require('../../errors');
const { getResponseWithErrors, getOverallErrorResponse, getSuccessfulResponse } = require('./util');

async function importItems({ items, context, log }) {
  const { appLib, inlineContext, modelName, appModel, userContext, model, mongoParams, userPermissions } = context;
  context.userContext.action = 'create';
  const { action } = context.userContext;

  const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
    appModel,
    userPermissions,
    inlineContext,
    action
  );
  const { MONGO } = appLib.butil;
  const scopeConditions = scopeConditionsMeta.overallConditions;
  const mongoConditions = MONGO.and(mongoParams.conditions, scopeConditions);

  const errors = {};

  if (mongoConditions === false) {
    return getOverallErrorResponse(`Not enough permissions to create items.`);
  }

  const filteringFunc = getSiftFilteringFunc(mongoConditions);
  const fieldNames = _.keys(appModel.fields);
  const preparedItems = [];

  await Promise.map(items, async (doc, index) => {
    try {
      const nonExistingFields = _.difference(_.keys(doc), fieldNames);
      if (nonExistingFields.length) {
        errors[index] = `Item contains unknown fields: ${nonExistingFields.map(f => `'${f}'`).join(', ')}`;
        return;
      }

      await appLib.validation.validateNewItem(context, doc);
      const filteredItem = appLib.accessUtil.filterDocFields(appModel, doc, action, userPermissions);

      await appLib.transformers.preSaveTransformData(modelName, userContext, filteredItem, []);
      // eslint-disable-next-line new-cap
      const record = new model(filteredItem);

      if (record.errors) {
        errors[index] = _.values(record.errors)
          .map(v => v.message)
          .join(' | ');
        return;
      }

      const preparedItem = record.toObject();
      if (!filteringFunc(preparedItem)) {
        errors[index] = `Not enough permissions to create the item`;
      } else {
        preparedItems.push(preparedItem);
      }
    } catch (e) {
      errors[index] = e.message;
    }
  });

  if (!_.isEmpty(errors)) {
    return getResponseWithErrors(errors);
  }

  const { getMongoDuplicateErrorMessage } = appLib.butil;
  try {
    const res = await appLib.dba.withTransaction(session =>
      model.collection.insertMany(preparedItems, {
        session,
        checkKeys: false,
      })
    );
    await appLib.cache.clearCacheForModel(model.modelName);
    return getSuccessfulResponse(res.insertedCount);
  } catch (e) {
    const mongoDuplicateErrorMessage = getMongoDuplicateErrorMessage(e, appLib.appModel.models);
    const errorKey = e.index || 'overall';
    if (mongoDuplicateErrorMessage) {
      errors[errorKey] = mongoDuplicateErrorMessage;
    } else {
      const errorMessage = `Error occurred while importing data`;
      log.error(errorMessage, e.stack);
      errors[errorKey] = errorMessage;
    }
    return getResponseWithErrors(errors);
  }
}

async function getItemsFromJson(filePath, log) {
  try {
    // rework to use JSONStream for large files of size 100mb+
    const file = await fs.readFile(filePath);
    return JSON.parse(file);
  } catch (e) {
    log.error(e.stack);
    throw new ValidationError(`Invalid json file specified`);
  }
}

async function importJson({ filePath, context, log }) {
  try {
    const items = await getItemsFromJson(filePath, log);
    return importItems({ items, context, log });
  } catch (e) {
    const errorMessage = e instanceof ValidationError ? e.message : 'Unable to import json file';
    return getOverallErrorResponse(errorMessage);
  }
}

module.exports = {
  importItems,
  importJson,
};
