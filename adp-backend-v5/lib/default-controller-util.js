const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-conditions-util');
const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const butil = require('./backend-util');

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
    const urlParts = butil.getUrlParts(req);
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
    const limit = Math.min(modelLimit, req.params.length || modelLimit);

    const skip = req.params.start ? parseInt(req.params.start, 10) : 0;
    if (req.params.order && (req.params.visible_columns || req.params.columns)) {
      // supporting sorting in datatables format
      // it's not quite right way singe maps are not ordered, but this is the best we can do based on just order and visible_columns
      // TODO: refactor schema so that fields are stored in an array, not assoc array
      let shownColumns;
      if (req.params.visible_columns) {
        shownColumns = _(req.params.visible_columns)
          .map((v, k) => (v === 'true' ? k : null))
          .compact()
          .value();
      } else {
        // using req.params.columns, format used by angular datatables
        shownColumns = _.map(req.params.columns, 'data');
      }
      if (Array.isArray(req.params.order)) {
        _.forEach(req.params.order, val => {
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
    const searchValue = _.get(req, 'params.search.value');
    const { q } = req.params;
    if (searchValue || q) {
      // search[value] (or q) is supported with or without datatables, just in case
      const searchableFields = m.getSearchableFields(schemaName);
      m.updateSearchConditions(searchConditions, searchableFields, searchValue || q);
    }

    mongoConditions =
      searchConditions.length > 0
        ? { $and: [mongoConditions, { $or: searchConditions }] }
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
              mongoConditions = { $and: [mongoConditions, scopeConditions] };
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

  m.getElements = (req, actionsToAdd = false, modelConditions = {}, runPostprocessing = true) =>
    Promise.resolve(m.getQueryParams(req, actionsToAdd))
      .bind({})
      .then(params => {
        if (params.err) {
          throw params.err;
        }
        this.params = params;

        if (!_.isEmpty(modelConditions)) {
          this.params.mongoConditions = { $and: [params.mongoConditions, modelConditions] };
        }

        return appLib.dba.aggregateItems(
          params.model,
          params.mongoConditions,
          params.mongoProjections,
          params.mongoOrder,
          params.mongoSkip,
          params.mongoLimit
        );
      })
      .then(data => {
        const userContext = appLib.accessUtil.getUserContext(req);
        return appLib.dba.postProcess(
          data,
          this.params.model.modelName,
          userContext,
          runPostprocessing
        );
      })
      .then(items => {
        const data = this.params.urlParts.length >= 2 ? items[0] : items;
        if (!data) {
          throw new Error('Unable to find any data of this type');
        }
        return { data, params: this.params };
      })
      .catch(err => {
        throw new Error(`Unable to find items: ${err}`);
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

    const appModel = appLib.appModel.models[modelName];
    const filteredDoc = appLib.accessUtil.filterDocFields(appModel, data, action, userPermissions);
    return appLib.dba.createItemCheckingConditions(
      model,
      mongoConditions,
      userContext,
      filteredDoc
    );
  };
  /**
   * Returns array containing changesPath (not compatible with lodash or appModel since it contains both path and _id for subschema elements)
   * The resulting path does NOT contain the model name
   * NOTE: ?params are not removed from the URL, maybe will need to do it later
   * @param req
   */
  m.getAppModelPath = req => req.url.split('/').slice(2);

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
          transformLookupObj(lookupObj);
        });
      } else {
        transformLookupObj(lookupVal);
      }

      function transformLookupObj(lookupObj) {
        const lookupTableMeta = lookupMeta[lookupObj.table];
        if (!lookupTableMeta) {
          return log.warn(
            `No 'table' field found in lookupObj : ${JSON.stringify(
              lookupObj
            )}\nModel: ${modelName}, lookupMeta: ${JSON.stringify(lookupMeta)}`
          );
        }
        if (_.get(lookupTableMeta, 'foreignKeyType') === 'ObjectID') {
          lookupObj._id = new ObjectID(lookupObj._id);
        }
      }
    });
  };

  m.getUpdateLinkedLabelsPromise = (newItem, oldItem, modelName) => {
    // check whether label or foreign key fields in item is changed
    // if yes - update corresponding docs in other models
    const promises = [];
    const labelFieldsMeta = _.get(appLib.labelFieldsMeta, modelName);
    _.each(labelFieldsMeta, (labelMeta, labelName) => {
      const labelReferences = labelFieldsMeta[labelName];
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

  m.getDeleteLinkedLabelsInfo = (itemToDelete, modelName) => {
    const promises = [];
    const conditionForActualRecord = appLib.dba.getConditionForActualRecord();

    const labelFieldsMeta = _.get(appLib.labelFieldsMeta, modelName);
    _.each(labelFieldsMeta, (labelMeta, labelName) => {
      const labelReferences = labelFieldsMeta[labelName];
      _.each(labelReferences, labelReference => {
        promises.push(getDeleteInfoPromise(itemToDelete, modelName, labelReference));
      });
    });

    return Promise.all(promises);

    function getDeleteInfoPromise(dItemToDelete, dModelName, labelReference) {
      const { scheme, path, isMultiple, foreignKey } = labelReference;
      const itemFKey = _.get(dItemToDelete, foreignKey);
      const model = appLib.db.model(scheme);

      // TODO: handle only condition and deleteFunc in if block, use it in constructing promise (DRY)
      if (isMultiple) {
        const multipleLookupCondition = {
          $and: [
            { [path]: { $elemMatch: { _id: itemFKey, table: dModelName } } },
            conditionForActualRecord,
          ],
        };
        const findLinkedRecordsPromise = model
          .find(multipleLookupCondition)
          .lean()
          .exec();

        return findLinkedRecordsPromise.then(docs =>
          // condition to allow performing deleteFunc
          // for now its not allowed to delete anything if there are linked records
          ({
            isValidDelete: docs.length === 0,
            linkedCollection: scheme,
            linkedLabel: path,
            linkedRecords: docs,
            deleteFunc: () =>
              model.update(
                { _id: { $in: docs.map(doc => doc._id) } },
                { $pull: { [path]: { _id: itemFKey, table: dModelName } } }
              ),
          })
        );
      }

      const singleLookupCondition = {
        $and: [
          { [`${path}._id`]: itemFKey },
          { [`${path}.table`]: dModelName },
          conditionForActualRecord,
        ],
      };
      const findLinkedRecordsPromise = model
        .find(singleLookupCondition)
        .lean()
        .exec();

      return findLinkedRecordsPromise.then(docs =>
        // condition to allow performing deleteFunc
        // for now its not allowed to delete anything if there are linked records
        ({
          isValidDelete: docs.length === 0,
          linkedCollection: scheme,
          linkedLabel: path,
          linkedRecords: docs,
          deleteFunc: () => model.remove({ _id: { $in: docs.map(doc => doc._id) } }),
        })
      );
    }
  };

  /**
   * For every model checks docs with at least one not empty lookup field and updates it
   * This is universal function that can be used in any other prototype
   * @param appLib
   */
  m.normalizeLookupObjectIds = () => {
    const modelPromises = [];

    _.each(appLib.lookupFieldsMeta, (lookup, modelName) => {
      const lookupFields = Object.keys(lookup);
      const condition = {
        $or: lookupFields.map(f => ({ [f]: { $ne: null } })),
      };
      const model = appLib.db.model(modelName);

      const updateModelDocsPromise = model
        .find(condition)
        .lean()
        .exec()
        .then(docs =>
          // update each doc
          Promise.map(docs, doc => {
            const newDoc = _.clone(doc);
            appLib.controllerUtil.transformLookupKeys(newDoc, modelName);
            return model.update({ _id: doc._id }, newDoc);
          })
        );
      modelPromises.push(updateModelDocsPromise);
    });

    return Promise.all(modelPromises);
  };

  return m;
};
