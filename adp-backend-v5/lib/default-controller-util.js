const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-conditions-util');
const { ObjectID } = require('mongodb');
const Promise = require('bluebird');
const { JSONPath } = require('jsonpath-plus');
const { MONGO, getDocValueForExpression, isValidObjectId } = require('./util/util');
const { buildLookupsFromDocs } = require('./util/lookups');
const { buildTreeSelectorsFromDocs } = require('./util/treeselectors');
const { ValidationError, AccessError, LinkedRecordError } = require('./errors');

module.exports = (appLib) => {
  const m = {};
  const { getRequestMeta } = appLib.butil;

  m.getItems = async (context, actionsToPut) => {
    context.userContext.action = 'view';
    const { appModel, userContext } = context;
    await appLib.hooks.preHook(appModel, userContext);
    const { items, meta } = await m.getElementsWithFilteredFields({ context, actionsToPut });
    await appLib.hooks.postHook(appModel, userContext);
    return { items, meta };
  };

  m.deleteItem = async (context, session) => {
    context.userContext.action = 'delete';
    const { appModel, modelName, userContext, mongoParams } = context;

    await appLib.hooks.preHook(appModel, userContext);
    const { items, meta } = await m.getElements({ context });
    const data = items[0];
    if (!data) {
      log.info(`Unable to delete requested element. Meta: ${getRequestMeta(context, meta)}`);
      throw new AccessError(`Unable to delete requested element`);
    }

    const deleteInfo = await m.getLinkedRecordsInfoOnDelete(data, modelName, session);
    const isAllDeletionsValid = deleteInfo.every((info) => info.isValidDelete);
    if (!isAllDeletionsValid) {
      const message =
        'ERROR: Unable to delete this record because there are other records referring. ' +
        'Please update the referring records and remove reference to this record.';
      throw new LinkedRecordError(message, deleteInfo);
    }
    const handleLinkedRecordsOnDeletePromises = Promise.map(deleteInfo, (info) => info.handleDeletePromise());
    const [deletedItem] = await Promise.all([
      appLib.dba.removeItem(modelName, mongoParams.conditions, session),
      handleLinkedRecordsOnDeletePromises,
    ]);
    await appLib.hooks.postHook(appModel, userContext);
    return deletedItem;
  };

  m.deleteItems = async (context, session) => {
    context.userContext.action = 'delete';
    const { appModel, modelName, userContext, mongoParams } = context;

    await appLib.hooks.preHook(appModel, userContext);
    const { items, meta } = await m.getElements({ context });
    if (!items.length) {
      log.info(`Unable to delete requested elements. Meta: ${getRequestMeta(context, meta)}`);
      throw new AccessError(`Unable to delete requested elements`);
    }

    const deleteInfos = await Promise.map(items, (item) => m.getLinkedRecordsInfoOnDelete(item, modelName, session));
    const flatDeleteInfos = _.flatMap(deleteInfos);
    const isAllDeletionsValid = flatDeleteInfos.every((info) => info.isValidDelete);
    if (!isAllDeletionsValid) {
      const message =
        'ERROR: Unable to delete these records because there are other records referring. ' +
        'Please update the referring records and remove reference to this record.';
      throw new LinkedRecordError(message, flatDeleteInfos);
    }
    const handleLinkedRecordsOnDeletePromises = Promise.map(flatDeleteInfos, (info) => info.handleDeletePromise());
    const [deletedCount] = await Promise.all([
      appLib.dba.removeItems(modelName, mongoParams.conditions, session),
      handleLinkedRecordsOnDeletePromises,
    ]);
    await appLib.hooks.postHook(appModel, userContext);
    return deletedCount;
  };

  m.putItem = async (context, newItem, session) => {
    await appLib.validation.validateNewItem(context, newItem);
    const { appModel, modelName, userContext, mongoParams, userPermissions } = context;
    context.userContext.action = 'update';
    const { action } = context.userContext;

    await appLib.hooks.preHook(appModel, userContext);

    const { items, meta } = await m.getElements({ context });
    const data = items[0];
    if (!data) {
      log.error(`Unable to update requested element. Meta: ${getRequestMeta(context, meta)}`);
      throw new ValidationError(`Unable to update requested element`);
    }
    const newData = appLib.accessUtil.mergeDocs({
      appModel,
      dbDoc: data,
      userData: newItem,
      action,
      userPermissions,
    });
    const updatedItem = await appLib.dba.updateItem({
      modelName,
      userContext,
      mongoConditions: mongoParams.conditions,
      data: newData,
      session,
    });
    await m.updateLinkedRecords(newData, data, modelName, session);

    await appLib.hooks.postHook(appModel, userContext);
    return updatedItem;
  };

  m.putItems = async (context, newItems, session) => {
    await Promise.map(newItems, (newItem) => appLib.validation.validateNewItem(context, newItem));
    const { appModel, modelName, userContext, userPermissions } = context;
    context.userContext.action = 'update';
    const { action } = context.userContext;

    await appLib.hooks.preHook(appModel, userContext);

    const { items, meta } = await m.getElements({ context });
    if (!items.length) {
      log.error(`Unable to update requested elements. Meta: ${getRequestMeta(context, meta)}`);
      throw new ValidationError(`Unable to update requested elements`);
    }
    const itemPairsToMerge = [];
    const notExistingItemIds = [];
    _.each(newItems, (newItem) => {
      const newItemId = newItem._id.toString();
      const item = items.find((i) => i._id.toString() === newItemId);
      if (!item) {
        notExistingItemIds.push(newItemId);
      } else {
        itemPairsToMerge.push({ item, newItem });
      }
    });
    if (notExistingItemIds.length) {
      const errors = {};
      _.each(notExistingItemIds, (id) => {
        errors[id] = `Invalid id`;
      });
      return errors;
    }

    const mergedItems = [];
    _.each(itemPairsToMerge, (itemPair) => {
      const mergedItem = appLib.accessUtil.mergeDocUsingFieldActions({
        appModel,
        dbDoc: itemPair.item,
        userData: itemPair.newItem,
        action,
        userPermissions,
      });
      mergedItems.push(mergedItem);
    });

    const errors = await appLib.dba.updateItems({
      modelName,
      userContext,
      items: mergedItems,
      session,
    });

    if (!_.isEmpty(errors)) {
      return errors;
    }

    await Promise.map(mergedItems, (mergedItem, index) => {
      const item = items[index];
      return m.updateLinkedRecords(mergedItem, item, modelName, session);
    });

    await appLib.hooks.postHook(appModel, userContext);

    return errors;
  };

  m.cloneItem = async (context, newItem, session) => m.postItem(context, newItem, session, 'clone');

  m.postItem = async (context, newItem, session, action = 'create') => {
    await appLib.validation.validateNewItem(context, newItem);
    const { inlineContext, appModel, userContext, mongoParams, userPermissions, modelName } = context;
    context.userContext.action = action;

    await appLib.hooks.preHook(appModel, userContext);
    const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
      appModel,
      userPermissions,
      inlineContext,
      action
    );
    const scopeConditions = scopeConditionsMeta.overallConditions;
    const mongoConditions = MONGO.and(mongoParams.conditions, scopeConditions);
    const item = await appLib.controllerUtil.createItemWithCheckAndFilter({
      action,
      data: newItem,
      modelName,
      mongoConditions,
      userPermissions,
      userContext,
      session,
    });
    await appLib.hooks.postHook(appModel, userContext);
    return item;
  };

  m.upsertItem = async (context, newItem, session) => {
    await appLib.validation.validateNewItem(context, newItem);
    const { inlineContext, appModelPath, appModel, userContext, modelName, mongoParams, userPermissions } = context;
    context.userContext.action = 'upsert';
    const { action } = context.userContext;
    await appLib.hooks.preHook(appModel, userContext);

    const { items } = await m.getElements({ context, session });
    const data = items[0];
    let upsertedItem;
    if (data) {
      // update item
      const newData = appLib.accessUtil.mergeDocs({
        appModel,
        dbDoc: data,
        userData: newItem,
        action,
        userPermissions,
      });
      upsertedItem = await appLib.dba.updateItem({
        modelName,
        userContext,
        mongoConditions: mongoParams.conditions,
        data: newData,
        path: appModelPath,
        session,
      });
      await m.updateLinkedRecords(newData, data, modelName, session);
    } else {
      // create item
      const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
        appModel,
        userPermissions,
        inlineContext,
        action
      );
      const scopeConditions = scopeConditionsMeta.overallConditions;
      upsertedItem = await appLib.controllerUtil.createItemWithCheckAndFilter({
        action,
        data: newItem,
        modelName,
        mongoConditions: MONGO.and(mongoParams.conditions, scopeConditions),
        userPermissions,
        userContext,
        session,
      });
    }

    await appLib.hooks.postHook(appModel, userContext);
    return upsertedItem;
  };

  m.getElementsCount = async ({
    context: { action, appModel, userPermissions, inlineContext, modelName, mongoParams },
  }) => {
    const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
      appModel,
      userPermissions,
      inlineContext,
      action
    );
    const scopeConditions = scopeConditionsMeta.overallConditions;
    const conditions = MONGO.and(mongoParams.conditions, scopeConditions);
    return appLib.dba.getDocumentsCountUsingCache(modelName, conditions);
  };

  m.getElements = async ({
    context: { appModel, userPermissions, userContext, inlineContext, modelName, collectionName, mongoParams },
    actionsToPut = false,
  }) => {
    const { action } = userContext;
    const [scopeConditionsMeta, actionFuncsMeta] = await Promise.all([
      appLib.accessUtil.getScopeConditionsMeta(appModel, userPermissions, inlineContext, action),
      appLib.accessUtil.getActionFuncsMeta(appModel, userPermissions, inlineContext, actionsToPut),
    ]);

    const modelConditions = mongoParams.conditions;
    const scopeConditions = scopeConditionsMeta.overallConditions;
    mongoParams.conditions = MONGO.and(modelConditions, scopeConditions);
    const items = await appLib.dba.getItemsUsingCache({
      modelName,
      collectionName,
      userContext,
      mongoParams,
      actionFuncs: actionFuncsMeta.actionFuncs,
    });

    const meta = {
      combinedConditions: mongoParams.conditions,
      modelConditions,
      scope: scopeConditionsMeta,
    };
    if (!_.isEmpty(actionFuncsMeta.actionFuncs)) {
      meta.actions = actionFuncsMeta.meta;
    }

    return { items, meta };
  };

  m.getElementsWithFilteredFields = async ({ context, actionsToPut = false }) => {
    const { items, meta } = await m.getElements({ context, actionsToPut });
    const { appModel, userPermissions, userContext } = context;
    appLib.accessUtil.filterDocFields(appModel, items, userContext.action, userPermissions);
    return { items, meta };
  };

  m.getTreeSelectorConditions = async (treeSelectorSpec, modelName, parentLookup) => {
    if (!parentLookup) {
      return treeSelectorSpec.roots;
    }

    // get children condition
    const { foreignKey, parent: parentSpec } = treeSelectorSpec;
    const [parentRefKey, fieldContainingRef] = Object.entries(parentSpec)[0];

    if (foreignKey === fieldContainingRef) {
      // optimization: not necessary to find doc by foreignKey then find value of parent's fieldContainingRef
      return { [parentRefKey]: parentLookup._id };
    }

    const { record: parentDoc } = await appLib.db
      .collection(modelName)
      .hookQuery('findOne', { [foreignKey]: parentLookup._id }, { [fieldContainingRef]: 1 });
    return { [parentRefKey]: _.get(parentDoc, fieldContainingRef) };
  };

  m.getTreeSelectorParentLookup = (foreignKeyVal, treeSelectorSpec) => {
    if (!foreignKeyVal) {
      return null;
    }

    // label is not necessary
    // TODO: transform string mongo id to ObjectID considering type of foreignKey instead of using isValid
    return {
      table: treeSelectorSpec.table,
      _id: ObjectID.isValid(foreignKeyVal) ? new ObjectID(foreignKeyVal) : foreignKeyVal,
    };
  };

  m.getSchemaLookups = async (lookupCtx) => {
    const { modelName, userContext, userPermissions, inlineContext, tableSpec, mongoParams } = lookupCtx;
    const { limit, skip, sort, conditions } = mongoParams;
    const lookupWholeConditions = await appLib.accessUtil.getViewConditionsByPermissionsForLookup(
      userPermissions,
      inlineContext,
      tableSpec,
      conditions
    );
    const docs = await appLib.dba.getItemsUsingCache({
      modelName,
      userContext,
      mongoParams: {
        conditions: lookupWholeConditions,
        sort,
        skip,
        limit,
      },
    });
    const lookups = buildLookupsFromDocs(docs, tableSpec);

    return { lookups, more: lookups.length === limit };
  };

  m.getTreeSelectorLookups = async (treeSelectorCtx) => {
    const { modelName, userContext, userPermissions, inlineContext, tableSpec, mongoParams, foreignKeyVal } =
      treeSelectorCtx;
    const { limit, skip, sort, conditions } = mongoParams;
    const treeSelectorParentLookup = m.getTreeSelectorParentLookup(foreignKeyVal, tableSpec);

    const [viewCondition, treeSelectorCondition] = await Promise.all([
      appLib.accessUtil.getViewConditionsByPermissionsForLookup(userPermissions, inlineContext, tableSpec, conditions),
      m.getTreeSelectorConditions(tableSpec, modelName, treeSelectorParentLookup),
    ]);
    const docs = await appLib.dba.getItemsUsingCache({
      modelName,
      userContext,
      mongoParams: {
        conditions: MONGO.and(viewCondition, treeSelectorCondition),
        sort,
        skip,
        limit,
      },
    });
    const treeSelectors = buildTreeSelectorsFromDocs(docs, tableSpec);

    return { treeSelectors, more: treeSelectors.length === limit };
  };

  m.createItemWithCheckAndFilter = async ({
    action,
    data,
    modelName,
    mongoConditions,
    userPermissions,
    userContext,
    session,
  }) => {
    const appModel = appLib.appModel.models[modelName];
    const filteredDoc = appLib.accessUtil.filterDocFields(appModel, data, action, userPermissions);
    return appLib.dba.createItemCheckingConditions(modelName, mongoConditions, userContext, filteredDoc, session);
  };

  /**
   * Transforms string representation of lookups to ObjectID.
   * Goes through appLib.lookupFieldsMeta which includes LookupObjectID, LookupObjectID[], TreeSelector types.
   * @param item
   * @param modelName
   */
  m.transformLookupKeys = (item, modelName) => {
    const lookupFieldsMeta = _.get(appLib.lookupFieldsMeta, modelName);
    _.each(lookupFieldsMeta, (lookupMeta) => {
      const { jsonPath } = lookupMeta.paths;
      const lookupVals = JSONPath({ path: jsonPath, json: item });
      const lookups = _.flatten(lookupVals).filter((l) => l);
      _.each(lookups, (lookupObj) => {
        transformLookupKeysObj(lookupObj);
      });

      function transformLookupKeysObj(lookupObj) {
        const lookupTableMeta = lookupMeta.table[lookupObj.table];
        if (!lookupTableMeta) {
          return log.warn(
            `No 'table' field found in lookupObj : ${JSON.stringify(
              lookupObj
            )}\nModel: ${modelName}, lookupMeta: ${JSON.stringify(lookupMeta)}`
          );
        }
        const id = _.get(lookupObj, '_id');
        const isForeignKeyTypeObjectId = _.get(lookupTableMeta, 'foreignKeyType') === 'ObjectID';
        if (isForeignKeyTypeObjectId && !(id instanceof ObjectID)) {
          lookupObj._id = new ObjectID(id);
        }
      }
    });
  };

  m.updateLinkedRecords = async (newItem, oldItem, modelName, session) => {
    // check whether label, data or foreign key fields in item is changed
    // if yes - update corresponding docs in other models
    const updatePromises = [];

    // used for clearing cache for changed linked records
    const updatedModels = new Set();

    const labelFieldsMeta = _.get(appLib.labelFieldsMeta, modelName);
    // TODO: improve efficiency by decreasing number of update requests for same records
    // TODO: one record may be updated multiple times if it has multiple lookups/treeselector linked to same scheme.
    _.each(labelFieldsMeta, (labelReferences, label) => {
      _.each(labelReferences, (labelReference) => {
        const {
          scheme,
          paths: { itemPath, mongoPath, beforeArrPath, afterArrPath },
          isMultiple,
          foreignKey,
          data,
        } = labelReference;

        const newItemLabel = getDocValueForExpression(newItem, label);
        const oldItemLabel = getDocValueForExpression(oldItem, label);
        const isLabelChanged = !_.isEqual(newItemLabel, oldItemLabel);

        const newItemData = {};
        const oldItemData = {};
        _.each(data, (dataExpr, dataFieldName) => {
          newItemData[dataFieldName] = getDocValueForExpression(newItem, dataExpr);
          oldItemData[dataFieldName] = getDocValueForExpression(oldItem, dataExpr);
        });
        const isDataChanged = !_.isEqual(newItemData, oldItemData);

        const newItemFKey = _.get(newItem, foreignKey);
        const oldItemFKey = _.get(oldItem, foreignKey);
        const isForeignKeyValChanged = !_.isEqual(newItemFKey, oldItemFKey);

        if (isLabelChanged || isDataChanged || isForeignKeyValChanged) {
          updatedModels.add(scheme);
          const collection = appLib.db.collection(scheme);
          const conditionForActualRecord = appLib.dba.getConditionForActualRecord(scheme);
          let updatePromise;

          const hasArraysInPath = mongoPath.includes('$[]') || isMultiple;
          // for TreeSelector path to last array is itemPath
          const pathToArrayWithoutPosOperators = beforeArrPath ? beforeArrPath.replace(/\.\$\[\]/g, '') : itemPath;

          if (!hasArraysInPath) {
            const update = {
              [`${itemPath}._id`]: newItemFKey,
              [`${itemPath}.label`]: newItemLabel,
            };
            if (data) {
              update[`${itemPath}.data`] = newItemData;
            }
            updatePromise = collection.hookQuery(
              'updateMany',
              MONGO.and(conditionForActualRecord, {
                [`${itemPath}._id`]: oldItemFKey,
                [`${itemPath}.table`]: modelName,
              }),
              { $set: update },
              { session, checkKeys: false }
            );
          } else if (isMultiple) {
            const update = {
              [`${mongoPath}.$[elem]._id`]: newItemFKey,
              [`${mongoPath}.$[elem].label`]: newItemLabel,
            };
            if (data) {
              update[`${mongoPath}.$[elem].data`] = newItemData;
            }
            updatePromise = collection.hookQuery(
              'updateMany',
              MONGO.and({ [pathToArrayWithoutPosOperators]: { $exists: true } }, conditionForActualRecord),
              { $set: update },
              {
                arrayFilters: [{ 'elem._id': oldItemFKey, 'elem.table': modelName }],
                session,
                checkKeys: false,
              }
            );
          } else {
            const itemPathWithElem = `${beforeArrPath}.$[elem].${afterArrPath}`;
            const elemPath = `elem.${afterArrPath}`;
            const update = {
              [`${itemPathWithElem}._id`]: newItemFKey,
              [`${itemPathWithElem}.label`]: newItemLabel,
            };
            if (data) {
              update[`${itemPathWithElem}.data`] = newItemData;
            }
            updatePromise = collection.hookQuery(
              'updateMany',
              MONGO.and({ [pathToArrayWithoutPosOperators]: { $exists: true } }, conditionForActualRecord),
              { $set: update },
              {
                arrayFilters: [{ [`${elemPath}._id`]: oldItemFKey, [`${elemPath}.table`]: modelName }],
                session,
                checkKeys: false,
              }
            );
          }
          updatePromises.push(updatePromise);
        }
      });
    });

    await Promise.all(updatePromises);
    return Promise.map([...updatedModels], (model) => appLib.cache.clearCacheForModel(model));
  };

  /**
   * Checks whether itemToDelete is referenced by other items and return info about that.
   * References may be of following types: LookupObjectID, LookupObjectID[], TreeSelector
   * @param itemToDelete - item to delete
   * @param lookupTableName - name of collection containing itemToDelete
   * @param session
   * @returns [{
   *  isValidDelete - specifies whether deletion of linked docs is valid
   *  linkedCollection - collection containing reference(-s) to itemToDelete
   *  linkedLabel - label in reference
   *  linkedRecords - docs from linkedCollection containing references to itemDelete
   *  deleteFunc - evaluating deleteFunc() deletes all references to itemToDelete from linkedRecords
   * }]
   */
  m.getLinkedRecordsInfoOnDelete = (itemToDelete, lookupTableName, session) => {
    const promises = [];

    const labelFieldsMeta = _.get(appLib.labelFieldsMeta, lookupTableName);
    _.each(labelFieldsMeta, (labelReferences) => {
      _.each(labelReferences, (labelReference) => {
        promises.push(getLabelReferenceInfoPromise(labelReference, session));
      });
    });

    return Promise.all(promises);

    function getHandleDeletePromise(_labelReference, _session) {
      const {
        scheme,
        paths: { jsonPath, itemPath, mongoPath, beforeArrPath, afterArrPath },
        isMultiple,
        foreignKey,
        fieldType,
        requireLeafSelection,
        required,
      } = _labelReference;
      const itemFKey = _.get(itemToDelete, foreignKey);
      const collection = appLib.db.collection(scheme);
      const conditionForActualRecord = appLib.dba.getConditionForActualRecord(scheme);

      if (isMultiple && fieldType === 'LookupObjectID[]') {
        return (docs) =>
          collection.hookQuery(
            'updateMany',
            { _id: { $in: docs.map((doc) => doc._id) }, ...conditionForActualRecord },
            { $pull: { [mongoPath]: { _id: itemFKey, table: lookupTableName } } },
            { session: _session, checkKeys: false }
          );
      }
      if (!isMultiple && fieldType === 'LookupObjectID') {
        if (beforeArrPath) {
          return (docs) =>
            collection.hookQuery(
              'updateMany',
              { _id: { $in: docs.map((doc) => doc._id) }, ...conditionForActualRecord },
              {
                $set: {
                  [beforeArrPath]: {
                    [`${afterArrPath}._id`]: itemFKey,
                    [`${afterArrPath}.table`]: lookupTableName,
                  },
                },
              },
              { session: _session, checkKeys: false }
            );
        }
        return (docs) =>
          collection.hookQuery(
            'updateMany',
            { _id: { $in: docs.map((doc) => doc._id) }, ...conditionForActualRecord },
            { $set: { [itemPath]: null } },
            { session: _session, checkKeys: false }
          );
      }

      if (isMultiple && fieldType === 'TreeSelector') {
        // More info: https://confluence.conceptant.com/display/DEV/Tree+Selector+Control
        const allowedToSelectNodes = !requireLeafSelection;

        if (required && !allowedToSelectNodes) {
          // cannot set null to required field so leave it as is
          // but when the user will need to edit it, it won't save without user providing the required value first
          return () => {};
        }

        return (docs) => {
          Promise.map(docs, (doc) => {
            const changes = {};
            JSONPath({
              path: jsonPath,
              resultType: 'pointer',
              json: doc,
              callback(pointer, resType, payload) {
                let { value: treeSelector } = payload;
                if (allowedToSelectNodes) {
                  const deletedLookupIndex = treeSelector.findIndex(
                    (lookup) => lookup.table === lookupTableName && lookup._id.toString() === itemFKey.toString()
                  );
                  if (deletedLookupIndex !== -1) {
                    treeSelector.splice(deletedLookupIndex, treeSelector.length);
                  }
                } else {
                  treeSelector = null;
                }
                const lodashPath = pointer.substring(1).replace(/\//g, '.');
                changes[lodashPath] = treeSelector;
              },
            });

            return collection.hookQuery(
              'updateOne',
              { _id: doc._id, ...conditionForActualRecord },
              { $set: changes },
              { session: _session, checkKeys: false }
            );
          });
        };
      }

      log.warn(
        `Unable to find handler while removing item ${JSON.stringify(itemToDelete)} for labelReference ${JSON.stringify(
          _labelReference
        )}. Resolved as empty handler`
      );
      return () => {};
    }

    function getFindLinkedRecordsCondition(_labelReference) {
      const {
        scheme,
        paths: { itemPath },
        isMultiple,
        foreignKey,
      } = _labelReference;
      let itemFKey = _.get(itemToDelete, foreignKey);
      if (isValidObjectId(itemFKey)) {
        itemFKey = ObjectID(itemFKey);
      }

      const conditionForActualRecord = appLib.dba.getConditionForActualRecord(scheme);
      if (isMultiple) {
        return MONGO.and(
          { [itemPath]: { $elemMatch: { _id: itemFKey, table: lookupTableName } } },
          conditionForActualRecord
        );
      }

      return MONGO.and(
        { [`${itemPath}._id`]: itemFKey },
        { [`${itemPath}.table`]: lookupTableName },
        conditionForActualRecord
      );
    }

    async function getLabelReferenceInfoPromise(_labelReference, _session) {
      const {
        scheme,
        paths: { itemPath },
        fieldType,
      } = _labelReference;

      const findLinkedRecordsCondition = getFindLinkedRecordsCondition(_labelReference);
      const docs = await appLib.db.collection(scheme).find(findLinkedRecordsCondition, { session: _session }).toArray();

      // condition to allow performing deleteFunc
      // for now its:
      // - not allowed to delete docs if there are linked records in LookupObjectID/LookupObjectID[]
      // - allowed to delete docs referenced in TreeSelector
      const isValidDelete = fieldType === 'TreeSelector' || docs.length === 0;

      return {
        isValidDelete,
        linkedCollection: scheme,
        linkedLabel: itemPath,
        linkedRecords: docs.map((doc) => ({ _id: doc._id })),
        handleDeletePromise: () => {
          const handleDeletePromise = getHandleDeletePromise(_labelReference, _session);
          return handleDeletePromise(docs);
        },
      };
    }
  };

  /**
   * Used as preStart script.
   * For every model checks docs with at least one not empty lookup field and updates String _id to Mongo _id
   * This is universal function that can be used in any other prototype
   */
  m.normalizeLookupObjectIds = () =>
    Promise.map(appLib.lookupFieldsMeta, async (lookup, modelName) => {
      const lookupFields = Object.keys(lookup);
      const allExistsConditions = lookupFields.map((f) =>
        MONGO.and({ [f]: { $exists: true } }, { [f]: { $ne: [] } }, { [f]: { $ne: {} } })
      );
      const condition = MONGO.or(...allExistsConditions);
      const collection = appLib.db.collection(modelName);

      const docs = await collection.find(condition).toArray();

      // update each doc
      return Promise.map(docs, (doc) => {
        appLib.controllerUtil.transformLookupKeys(doc, modelName);
        return collection.hookQuery('updateOne', { _id: doc._id }, doc, { checkKeys: false });
      });
    });

  return m;
};
