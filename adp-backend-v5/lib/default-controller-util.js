const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-conditions-util');
const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const Promise = require('bluebird');
const { getUrlParts, MONGO } = require('./backend-util');
const { ValidationError } = require('./errors');

module.exports = appLib => {
  const m = {};

  /**
   * Utility method returning all searchable fields in a given collection based on appModel definition
   * TODO: extract utility method like this one into a separate file?
   * @param tableName the name of the table to find searchable fields in
   */
  m.getSearchableFields = tableName =>
    _(appLib.appModel.models[tableName].fields)
      .map((val, key) => (val.searchable ? key : false))
      .compact()
      .value();

  /**
   * Utility method returning mongodb-compatible query for full-text search in given fields
   * @param searchConditions the query to update with the search terms
   * @param fields the list of fields
   * @param term the term to search for
   */
  m.updateSearchConditions = (searchConditions, fields, term) => {
    if (!_.isString(term) || !term.length) {
      return;
    }
    fields.forEach(field => {
      const condition = {};
      /* eslint-disable security/detect-non-literal-regexp */
      condition[field] = new RegExp(`${term || ''}.*`, 'i');
      searchConditions.push(condition);
    });
  };

  /**
   * Parses HTTP query and retrieves parameters like sorting order, search query, skip, limit and other
   * parameters required by select2, datatables and possibly other components in the future
   * TODO: reuse this in getLookupTableJson if possible
   * @param req
   * @param modelConditions object with field-value pairs
   * @param actionsToAdd responsible for actions to inject into document.
   * If true injects additional conditions and projections for every action.
   * If false does not inject actions at all.
   * If array injects for actions specified in array.
   * @returns {*} {err, urlParts, schemaName, model, conditions, projections, order, skip, limit}
   */
  m.getQueryParams = (req, actionsToAdd) => {
    const urlParts = getUrlParts(req);
    const schemaName = _.get(urlParts, 0);
    if (!schemaName) {
      return Promise.resolve({ err: 'No schema name' });
    }
    const model = mongoose.model(schemaName);
    if (!model) {
      return Promise.resolve({ err: 'Invalid model name' });
    }

    let mongoConditions = {};
    const mongoProjections = {};
    let order = {};
    const urlPartsLen = urlParts.length;
    if (urlPartsLen >= 2) {
      const itemId = urlParts[urlPartsLen - 1];
      if (!ObjectID.isValid(itemId)) {
        return Promise.resolve({ err: `Invalid object id: ${itemId}` });
      }
      mongoConditions._id = new ObjectID(itemId);
    }

    const defaultRecordLimit = appLib.appModel.metaschema.limitReturnedRecords.default || 0;
    const modelLimit = _.get(
      appLib.appModel,
      `models.${schemaName}.limitReturnedRecords`,
      defaultRecordLimit
    );
    const limit = Math.min(modelLimit, req.query.length || modelLimit);

    const skip = req.query.start ? parseInt(req.query.start, 10) : 0;
    if (req.query.order && (req.query.visible_columns || req.query.columns)) {
      // supporting sorting in datatables format
      // it's not quite right way singe maps are not ordered, but this is the best we can do based on just order and visible_columns
      // TODO: refactor schema so that fields are stored in an array, not assoc array
      let shownColumns;
      if (req.query.visible_columns) {
        shownColumns = _(req.query.visible_columns)
          .map((v, k) => (v === 'true' ? k : null))
          .compact()
          .value();
      } else {
        // using req.query.columns, format used by angular datatables
        shownColumns = _.map(req.query.columns, 'data');
      }
      if (Array.isArray(req.query.order)) {
        _.forEach(req.query.order, val => {
          if (val.column) {
            order[shownColumns[val.column]] = val.dir === 'asc' ? 1 : -1;
          } else {
            return Promise.resolve({
              err: 'Incorrect order format (should be an array in datatables format)',
            });
          }
        });
      } else {
        return Promise.resolve({ err: 'Incorrect order format (should be an array)' });
      }
    } else {
      // TODO: in the future support less weird formats for sorting
      order = _.get(
        appLib.appModel,
        `models.${schemaName}.defaultSortBy`,
        appLib.appModel.metaschema.defaultSortBy.default
      );
    }
    const searchConditions = [];
    const searchValue = _.get(req, 'query.search.value');
    const { q } = req.query;
    if (searchValue || q) {
      // search[value] (or q) is supported with or without datatables, just in case
      const searchableFields = m.getSearchableFields(schemaName);
      m.updateSearchConditions(searchConditions, searchableFields, searchValue || q);
    }

    mongoConditions =
      searchConditions.length > 0
        ? MONGO.and(mongoConditions, MONGO.or(...searchConditions))
        : mongoConditions;

    // Set all the fields projections to handle 'validate', 'transform' and 'synthesize' stages
    for (const path of _.keys(model.schema.paths)) {
      mongoProjections[path] = 1;
    }

    // const modelConditionsKeysNum = _.keys(modelConditions).length;
    // const isEmptyModelConditions = modelConditionsKeysNum === 0;
    return handleActionsToAdd().then(() => ({
      urlParts,
      schemaName,
      model,
      mongoConditions,
      mongoProjections,
      // mongoOrder: isEmptyModelConditions ? order : {},
      // mongoSkip: isEmptyModelConditions ? skip : 0,
      // mongoLimit: isEmptyModelConditions ? limit : 0,
      mongoOrder: order,
      mongoSkip: skip,
      mongoLimit: limit,
    }));

    function handleActionsToAdd() {
      const actionPromises = [];
      if (actionsToAdd) {
        if (appLib.getAuthSettings().enablePermissions) {
          const updateMongoConditionsPromise = appLib.accessUtil
            .getScopeConditionsForModel(req, actionsToAdd)
            .then(scopeConditions => {
              mongoConditions = MONGO.and(mongoConditions, scopeConditions);
            });
          actionPromises.push(updateMongoConditionsPromise);
        }

        if (req.action === 'datatables') {
          // add action projections to document
          // for example: {_actions: {view: true, update: true, clone: false, 'SOME_CUSTOM_ACTION': true}}
          const updateActionProjectionsPromise = appLib.accessUtil
            .getModelActionProjections(req, actionsToAdd)
            .then(actionProjections => {
              _.merge(mongoProjections, actionProjections);
            });
          actionPromises.push(updateActionProjectionsPromise);
        }
      }
      return Promise.all(actionPromises);
    }
  };

  m.getElements = (req, actionsToAdd = false, modelConditions = {}) =>
    Promise.resolve(m.getQueryParams(req, actionsToAdd))
      .bind({})
      .then(params => {
        if (params.err) {
          throw params.err;
        }
        this.params = params;

        if (!_.isEmpty(modelConditions)) {
          this.params.mongoConditions = MONGO.and(params.mongoConditions, modelConditions);
        }
        const userContext = appLib.accessUtil.getUserContext(req);
        return appLib.dba.getItemsUsingCache({
          model: params.model,
          userContext,
          conditions: params.mongoConditions,
          projections: params.mongoProjections,
          sort: params.mongoOrder,
          skip: params.mongoSkip,
          limit: params.mongoLimit,
        });
      })
      .catch(err => {
        throw new Error(`Error occurred during getting data: ${err}`);
      })
      .then(items => {
        const data = this.params.urlParts.length >= 2 ? items[0] : items;
        if (!data) {
          throw new Error('Unable to find any data');
        }
        return { data, params: this.params };
      });

  m.createItemWithCheckAndFilter = ({
    action,
    data,
    model,
    mongoConditions,
    userPermissions,
    userContext,
  }) => {
    const { modelName } = model;
    m.transformLookupKeys(data, modelName);

    return m.checkLookupExistence(data, modelName).then(() => {
      const appModel = appLib.appModel.models[modelName];
      const filteredDoc = appLib.accessUtil.filterDocFields(
        appModel,
        data,
        action,
        userPermissions
      );
      return appLib.dba.createItemCheckingConditions(
        model,
        mongoConditions,
        userContext,
        filteredDoc
      );
    });
  };
  /**
   * Returns array containing changesPath (not compatible with lodash or appModel since it contains both path and _id for subschema elements)
   * The resulting path does NOT contain the model name
   * NOTE: ?params are not removed from the URL, maybe will need to do it later
   * @param req
   */
  m.getAppModelPath = req => req.url.split('/').slice(2);

  /**
   * Transforms string representation of lookups to ObjectID.
   * Goes through appLib.lookupFieldsMeta which includes LookupObjectID, LookupObjectID[], TreeSelector types.
   * @param item
   * @param modelName
   */
  m.transformLookupKeys = (item, modelName) => {
    const lookupFieldsMeta = _.get(appLib.lookupFieldsMeta, modelName);
    _.each(lookupFieldsMeta, (lookupMeta, fieldName) => {
      const lookupVal = item[fieldName];
      if (!lookupVal) {
        return;
      }

      const isMultiple = _.isArray(lookupVal);
      if (isMultiple) {
        _.each(lookupVal, lookupObj => {
          transformLookupKeysObj(lookupObj);
        });
      } else {
        transformLookupKeysObj(lookupVal);
      }

      function transformLookupKeysObj(lookupObj) {
        const lookupTableMeta = lookupMeta[lookupObj.table];
        if (!lookupTableMeta) {
          return log.warn(
            `No 'table' field found in lookupObj : ${JSON.stringify(
              lookupObj
            )}\nModel: ${modelName}, lookupMeta: ${JSON.stringify(lookupMeta)}`
          );
        }
        const id = _.get(lookupObj, '_id');
        if (_.get(lookupTableMeta, 'foreignKeyType') === 'ObjectID' && !(id instanceof ObjectID)) {
          lookupObj._id = new ObjectID(id);
        }
      }
    });
  };

  /**
   * Checks lookup existence for LookupObjectID. LookupObjectID[], TreeSelector fields inside item.
   * Throws ValidationError if there are errors.
   * @param item
   * @param modelName
   * @returns {Promise}
   */
  m.checkLookupExistence = (item, modelName) => {
    const lookupFieldsMeta = _.get(appLib.lookupFieldsMeta, modelName);
    const checkLookupPromises = [];
    const conditionForActualRecord = appLib.dba.getConditionForActualRecord();

    _.each(lookupFieldsMeta, (lookupMeta, fieldName) => {
      const lookupVal = item[fieldName];
      if (!lookupVal) {
        return;
      }

      const isMultiple = _.isArray(lookupVal);
      if (isMultiple) {
        const promise = Promise.map(lookupVal, lookupObj => {
          const { table, _id } = lookupObj;
          const lookupTableMeta = lookupMeta[table];
          if (!lookupTableMeta) {
            return `Lookup for collection ${table} does not exist.`;
          }
          const condition = MONGO.and(conditionForActualRecord, {
            [lookupTableMeta.foreignKey]: _id,
          });

          return appLib.db
            .collection(table)
            .findOne(condition)
            .then(doc => {
              if (!doc) {
                return `Lookup with _id '${_id.toString()}' in collection ${table} does not exist.`;
              }
            });
        }).then(errors => {
          const errMessages = errors.filter(msg => msg);
          if (errMessages.length) {
            return { [fieldName]: errMessages };
          }
        });

        checkLookupPromises.push(promise);
      } else {
        const { table, _id } = lookupVal;
        const lookupTableMeta = lookupMeta[table];
        if (!lookupTableMeta) {
          return checkLookupPromises.push(
            Promise.resolve({ [fieldName]: `Lookup for collection ${table} does not exist.` })
          );
        }
        const condition = MONGO.and(conditionForActualRecord, {
          [lookupTableMeta.foreignKey]: _id,
        });

        const promise = appLib.db
          .collection(table)
          .findOne(condition)
          .then(doc => {
            if (!doc) {
              return {
                [fieldName]: `Lookup with _id '${_id.toString()}' in collection ${table} does not exist.`,
              };
            }
          });

        checkLookupPromises.push(promise);
      }
    });

    if (!checkLookupPromises.length) {
      return Promise.resolve();
    }

    return Promise.all(checkLookupPromises).then(errors => {
      const fieldToErrorMap = _.merge(...errors);
      if (!_.isEmpty(fieldToErrorMap)) {
        const errorFields = _.keys(fieldToErrorMap).join(', ');
        throw new ValidationError(
          `Found non-existing references in fields: ${errorFields}`,
          fieldToErrorMap
        );
      }
    });
  };

  m.getUpdateLinkedLabelsPromise = (newItem, oldItem, modelName) => {
    // check whether label or foreign key fields in item is changed
    // if yes - update corresponding docs in other models
    const promises = [];
    const labelFieldsMeta = _.get(appLib.labelFieldsMeta, modelName);
    _.each(labelFieldsMeta, (labelReferences, labelName) => {
      _.each(labelReferences, labelReference => {
        const { scheme, path, isMultiple, foreignKey } = labelReference;

        const newItemLabel = _.get(newItem, labelName);
        const oldItemLabel = _.get(oldItem, labelName);
        const isLabelChanged = !_.isEqual(newItemLabel, oldItemLabel);

        const newItemFKey = _.get(newItem, foreignKey);
        const oldItemFKey = _.get(oldItem, foreignKey);
        const isForeignKeyValChange = !_.isEqual(newItemFKey, oldItemFKey);

        if (isLabelChanged || isForeignKeyValChange) {
          const model = appLib.db.model(scheme);
          let updatePromise;
          if (isMultiple) {
            updatePromise = model.update(
              { [path]: { $elemMatch: { _id: oldItemFKey, table: modelName } } },
              { $set: { [`${path}.$._id`]: newItemFKey, [`${path}.$.label`]: newItemLabel } }
            );
          } else {
            updatePromise = model.update(
              { $and: [{ [`${path}._id`]: oldItemFKey }, { [`${path}.table`]: modelName }] },
              { $set: { [`${path}._id`]: newItemFKey, [`${path}.label`]: newItemLabel } }
            );
          }
          promises.push(updatePromise);
        }
      });
    });

    return Promise.all(promises);
  };

  /**
   * Checks whether itemToDelete is referenced by other items and return info about that.
   * References may be of following types: LookupObjectID, LookupObjectID[], TreeSelector
   * @param itemToDelete - item to delete
   * @param lookupTableName - name of collection containing itemToDelete
   * @returns [{
   *  isValidDelete - specifies whether deletion of linked docs is valid
   *  linkedCollection - collection containing reference(-s) to itemToDelete
   *  linkedLabel - label in reference
   *  linkedRecords - docs from linkedCollection containing references to itemDelete
   *  deleteFunc - evaluating deleteFunc() deletes all references to itemToDelete from linkedRecords
   * }]
   */
  m.getLinkedRecordsInfoOnDelete = (itemToDelete, lookupTableName) => {
    const promises = [];
    const conditionForActualRecord = appLib.dba.getConditionForActualRecord();

    const labelFieldsMeta = _.get(appLib.labelFieldsMeta, lookupTableName);
    _.each(labelFieldsMeta, labelReferences => {
      _.each(labelReferences, labelReference => {
        promises.push(getLabelReferenceInfoPromise(labelReference));
      });
    });

    return Promise.all(promises);

    function getHandleDocsPromise(labelReference) {
      const {
        scheme,
        path,
        isMultiple,
        foreignKey,
        fieldType,
        requireLeafSelection,
        required,
      } = labelReference;
      const itemFKey = _.get(itemToDelete, foreignKey);
      const linkedModel = appLib.db.model(scheme);

      if (isMultiple && fieldType === 'LookupObjectID[]') {
        return docs =>
          linkedModel.update(
            { _id: { $in: docs.map(doc => doc._id) } },
            { $pull: { [path]: { _id: itemFKey, table: lookupTableName } } }
          );
      }
      if (!isMultiple && fieldType === 'LookupObjectID') {
        return docs =>
          linkedModel.update(
            { _id: { $in: docs.map(doc => doc._id) } },
            { $set: { [path]: null } }
          );
      }

      if (isMultiple && fieldType === 'TreeSelector') {
        const allowedToSelectNodes = !requireLeafSelection;

        if (required && !allowedToSelectNodes) {
          // cannot set null to required field so leave it as is
          // but when the user will need to edit it, it won't save without user providing the required value first
          return () => {};
        }

        return docs => {
          Promise.map(docs, doc => {
            let treeSelectors;
            if (allowedToSelectNodes) {
              const deletedLookupIndex = doc[path].findIndex(
                lookup => lookup.table === lookupTableName && lookup._id === itemFKey
              );
              treeSelectors = doc[path].slice(0, deletedLookupIndex);
            } else {
              treeSelectors = null;
            }

            return linkedModel.update({ _id: doc._id }, { $set: { [path]: treeSelectors } });
          });
        };
      }

      log.warn(
        `Unable to find handler while removing item ${JSON.stringify(
          itemToDelete
        )} for labelReference ${JSON.stringify(labelReference)}. Resolved as empty handler`
      );
      return () => {};
    }

    function getFindLinkedRecordsCondition(_labelReference) {
      const { path, isMultiple, foreignKey } = _labelReference;
      const itemFKey = _.get(itemToDelete, foreignKey);
      if (isMultiple) {
        return MONGO.and(
          { [path]: { $elemMatch: { _id: itemFKey, table: lookupTableName } } },
          conditionForActualRecord
        );
      }

      return MONGO.and(
        { [`${path}._id`]: itemFKey },
        { [`${path}.table`]: lookupTableName },
        conditionForActualRecord
      );
    }

    function getLabelReferenceInfoPromise(_labelReference) {
      const { scheme, path, fieldType } = _labelReference;
      const linkedModel = appLib.db.model(scheme);

      const findLinkedRecordsCondition = getFindLinkedRecordsCondition(_labelReference);
      const handleDocsPromise = getHandleDocsPromise(_labelReference);

      const findLinkedRecordsPromise = linkedModel
        .find(findLinkedRecordsCondition, { _id: 1, [path]: 1 })
        .lean()
        .exec();

      return findLinkedRecordsPromise.then(docs => {
        // condition to allow performing deleteFunc
        // for now its:
        // - not allowed to delete docs if there are linked records in LookupObjectID/LookupObjectID[]
        // - allowed to delete docs referenced in TreeSelector
        const isValidDelete = fieldType === 'TreeSelector' || docs.length === 0;

        return {
          isValidDelete,
          linkedCollection: scheme,
          linkedLabel: path,
          linkedRecords: docs.map(doc => ({ _id: doc._id })),
          handleDeletePromise: () => handleDocsPromise(docs),
        };
      });
    }
  };

  /**
   * Used as preStart script.
   * For every model checks docs with at least one not empty lookup field and updates String _id to Mongo _id
   * This is universal function that can be used in any other prototype
   */
  m.normalizeLookupObjectIds = () => {
    const modelPromises = [];

    _.each(appLib.lookupFieldsMeta, (lookup, modelName) => {
      const lookupFields = Object.keys(lookup);
      const allExistsConditions = lookupFields.map(f =>
        MONGO.and({ [f]: { $exists: true } }, { [f]: { $ne: [] } }, { [f]: { $ne: {} } })
      );
      const condition = MONGO.or(...allExistsConditions);
      const model = appLib.db.model(modelName);

      const updateModelDocsPromise = model
        .find(condition)
        .lean()
        .exec()
        .then(docs =>
          // update each doc
          Promise.map(docs, doc => {
            appLib.controllerUtil.transformLookupKeys(doc, modelName);
            return model.update({ _id: doc._id }, doc);
          })
        );
      modelPromises.push(updateModelDocsPromise);
    });

    return Promise.all(modelPromises);
  };

  return m;
};
