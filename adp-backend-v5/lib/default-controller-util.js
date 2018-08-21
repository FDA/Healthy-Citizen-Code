const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-conditions-util');
const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;
const butil = require('./backend-util');
const async = require('async');
const uglify = require('uglify-js');

module.exports = function (appLib) {
  const m = {};

  /**
   * Utility method returning all searchable fields in a given collection based on appModel definition
   * TODO: extract utility method like this one into a separate file?
   * @param tableName the name of the table to find searchable fields in
   */
  m.getSearchableFields = (tableName) => {
    return _(appLib.appModel.models[tableName].fields).map((val, key) => {
      return val.searchable ? key : false;
    }).compact().value();
  };

  /**
   * Utility method returning mongodb-compatible query for full-text search in given fields
   * @param searchConditions the query to update with the search terms
   * @param fields the list of fields
   * @param term the term to search for
   */
  m.updateSearchConditions = (searchConditions, fields, term) => {
    fields.forEach((field) => {
      const condition = {};
      condition[field] = new RegExp(`${term || ''}.*`, 'i');
      searchConditions.push(condition);
    });
  };

  m.isModelSchema = (req) => {
    const urlParts = butil.getUrlParts(req);
    const pathInAppModel = _(urlParts).filter((val, idx) => !(idx % 2)).join('.fields.');
    return _.get(appLib.appModel, `models.${pathInAppModel}.type`) === 'Schema';
  };

  /**
   * Parses HTTP query and retrieves parameters like sorting order, search query, skip, limit and other
   * parameters required by select2, datatables and possibly other components in the future
   * TODO: reuse this in getLookupTableJson if possible
   * @param req
   * @param modelConditions object with field-value pairs
   * @param actionsToAdd responsible for actions to inject into document.
   * If true injects additional conditions and projections for every action.
   * If false - not injects actions at all.
   * If array - for actions specified in array.
   * @returns {*} {err, urlParts, schemaName, model, conditions, projections, order, skip, limit}
   */
  m.getQueryParams = (req, modelConditions, actionsToAdd) => {
    let mongoConditions = {}, conditions = [], mongoProjections = {}, order = {}, skip, limit;
    const urlParts = butil.getUrlParts(req);
    const schemaName = _.get(urlParts, 0);
    if (!schemaName) {
      return Promise.resolve({err: 'No schema name'});
    }
    let model = mongoose.model(schemaName);
    if (!model) {
      return Promise.resolve({err: 'Invalid model name'});
    }

    const pathInAppModel = _(urlParts).filter((val, idx) => !(idx % 2)).join('.fields.');
    const defaultRecordLimit = appLib.appModel.metaschema.limitReturnedRecords.default || 0;
    limit = _.get(appLib.appModel, `models.${pathInAppModel}.limitReturnedRecords`, defaultRecordLimit);
    limit = Math.min(limit, req.params.length || limit);

    skip = req.params.start ? parseInt(req.params.start) : 0;
    if (req.params.order && (req.params.visible_columns || req.params.columns)) {
      // supporting sorting in datatables format
      // it's not quite right way singe maps are not ordered, but this is the best we can do based on just order and visible_columns
      // TODO: refactor schema so that fields are stored in an array, not assoc array
      let shownColumns;
      if (req.params.visible_columns) {
        shownColumns = _(req.params.visible_columns).map((v, k) => {
          return v === 'true' ? k : null;
        }).compact().value();
      } else { // using req.params.columns, format used by angular datatables
        shownColumns = _.map(req.params.columns, 'data');
      }
      if (Array.isArray(req.params.order)) {
        _.forEach(req.params.order, (val) => {
          if (val.column) {
            order[shownColumns[val.column]] = val.dir === 'asc' ? 1 : -1;
          } else {
            return Promise.resolve({err: 'Incorrect order format (should be an array in datatables format)'});
          }
        });
      } else {
        return Promise.resolve({err: 'Incorrect order format (should be an array)'});
      }
    } else {
      // TODO: in the future support less weird formats for sorting
      order = _.get(appLib.appModel, `models.${pathInAppModel}.defaultSortBy`, appLib.appModel.metaschema.defaultSortBy.default);
    }
    let searchConditions = [];
    if (req.params.search && req.params.search.value || req.params.q) { // search[value] (or q) is supported with or without datatables, just in case
      let searchableFields = m.getSearchableFields(schemaName);
      m.updateSearchConditions(searchConditions, searchableFields, req.params.search.value || req.params.q);
    }
    if (!_.isEmpty(modelConditions)) {
      mongoConditions = modelConditions;
      conditions = searchConditions;
    } else { // i.e. need to apply search to mongo only, not the array
      mongoConditions = searchConditions.length > 0 ? {$or: searchConditions} : {};
    }

    // Set all the fields projections to handle 'validate', 'transform' and 'synthesize' stages
    for (const path of _.keys(model.schema.paths)) {
      mongoProjections[path] = 1;
    }

    const modelConditionsKeysNum = _.keys(modelConditions).length;
    const isEmptyModelConditions = modelConditionsKeysNum === 0;
    return handleActionsToAdd()
      .then(() => ({
        urlParts,
        schemaName,
        model,
        mongoConditions,
        conditions,
        mongoProjections,
        projections: {}, // currently always {}, but still in the interface for the future use (see getElement comments)
        mongoOrder: isEmptyModelConditions ? order : {},
        order: !isEmptyModelConditions ? order : {},
        mongoSkip: isEmptyModelConditions ? skip : 0,
        skip: !isEmptyModelConditions ? skip : 0,
        mongoLimit: isEmptyModelConditions ? limit : 0,
        limit: !isEmptyModelConditions ? limit : 0,
      }));

    function handleActionsToAdd () {
      const actionPromises = [];
      if (actionsToAdd) {
        if (appLib.getAuthSettings().enablePermissions) {
          const updateMongoConditionsPromise = appLib.accessUtil.getScopeConditionsForModel(req, actionsToAdd)
            .then((scopeConditions) => {
              mongoConditions = {$and: [mongoConditions, scopeConditions]};
            });
          actionPromises.push(updateMongoConditionsPromise);
        }

        if (req.action === 'datatables') {
          // add action projections to document
          // for example: {_actions: {view: true, update: true, clone: false, 'SOME_CUSTOM_ACTION': true}}
          const updateActionProjectionsPromise = appLib.accessUtil.getActionProjections(req, actionsToAdd)
            .then((actionProjections) => {
              _.merge(mongoProjections, actionProjections);
            });
          actionPromises.push(updateActionProjectionsPromise);
        }

      }
      return Promise.all(actionPromises);
    }
  };

  m.filterArray = (data, conditions, projections, order = {}, skip = 0, limit = 0) => {
    if (Array.isArray(data)) {
      let pipeline = _(data);
      pipeline = pipeline.filter((el) => {
        return conditions.length == 0 || _.some(conditions, (condition) => {
          return _.every(condition, (val, key) => {
            return el.hasOwnProperty(key) && el[key] != '' && el[key].match(val);
          });
        });
      });
      if (Object.keys(order).length > 0) {
        pipeline = pipeline.orderBy(_.map(order, (v, k) => k), _.map(order, (v, k) => v > 0 ? 'asc' : 'desc'));
      }
      return pipeline.slice(skip, Math.min((limit || data.length) + skip, data.length)).value();
    } else {
      return data;
    }
  };

  m.getElements = (req, actionsToAdd = false, modelConditions, ignoreNonexistant = false, runPostprocessing = true) => {
    if (!modelConditions) {
      modelConditions = {};
      const urlParts = butil.getUrlParts(req);
      if (urlParts.length >= 2) {
        try {
          const objectID = new ObjectID(urlParts[1]);
          modelConditions = {'_id': objectID};
        } catch (e) {
          return Promise.resolve({err: `Invalid object id; ${req.params.id}`});
        }
      }
    }
    return m.getQueryParams(req, modelConditions, actionsToAdd)
      .then((params) => {
        if (params.err) {
          return Promise.reject(params.err);
        }
        const userContext = appLib.accessUtil.getUserContext(req);
        return m.getElementsWithMetaInfo(params, userContext, ignoreNonexistant, runPostprocessing);
      });
  };

  /**
   * Returns array containing changesPath (not compatible with lodash or appModel since it contains both path and _id for subschema elements)
   * The resulting path does NOT contain the model name
   * @param req
   */
  m.getAppModelPath = (req) => {
    // NOTE: ?params are not removed from the URL, maybe will need to do it later
    return req.url.split('/').slice(2);
  };

  /**
   * Helper method finding the data element according to the params based on user request.
   * Used in all CRUD methods.
   * TODO: keep an eye on mongodb, hopefully they will implement good functions for working with nested arrays, so this function can be simplified
   * // TODO: combine this with lookup method. They now have the same features and sombining will allow lookups in subschemas
   * The query itself supports the following parameters:
   * order[i][column] and order[i][order] - defines the order of sorting asc or desc for the output result
   * length - how many records to return
   * start - how many records to skip (i.e. from what record to start returning values)
   * search (or q) - return only records matching this search term (search is based on appModel searchable attribute)
   * All these parameters are compatible with datatables (both regular and angular)
   * TODO: add ability to exclude certain parts of the data (like large iHealth datasets) or include only specified parts
   * TODO: should I add limit to lookup definition? Or give one ability to override, make it smaller than the one defined on table?
   * TODO: wait for mongodb to support projection on nested arrays
   *       for now retireve all records that need to be retrieved with all attributes
   *       as of 3.4 mongodb doesn't support projection on nested arrays, hence this mess and waste of memory,
   *       using cursor streaming to reduce the memory consumption
   * @param params
   * @param userContext
   * @param ignoreNonexistant if thue then the processor will be called even if the element doesn't exist, otherwise error 400 will be returned
   * @param runPostprocessing
   * @returns {
   *  part - the element found
   *  data - entire collection document
   *  parent - parent of the element found
   *  parentKey - the key in the parent element the part is associated with. I.e. part == parent[parentKey]
   *  model - mongoose model the element was found in
   *  conditions - the conditions used to find the element
   * }
   */
  m.getElementsWithMetaInfo = (params, userContext, ignoreNonexistant = false, runPostprocessing = true) => {
    return appLib.dba.aggregateItems(
      params.model, userContext,
      params.mongoConditions, params.mongoProjections, params.mongoOrder, params.mongoSkip, params.mongoLimit,
      runPostprocessing,
      )
      .catch(err => {
        throw new Error(`Unable to find items: ${err}`);
      })
      .then(data => {
        let parent = null;
        let parentKey = null;
        data = params.urlParts.length >= 2 ? data[0] : data;
        let part = data;
        let advancePart = (idx) => { // goes deeper into the object and keeps track of the parent
          parent = part;
          parentKey = idx;
          if (part && part[idx]) {
            part = part[idx];
          } else {
            part = false;
          }
        };
        for (let i = 1; i < ~~((params.urlParts.length + 1) / 2); i++) {
          advancePart(params.urlParts[i * 2]);
          if (params.urlParts.hasOwnProperty(i * 2 + 1)) {
            let idx = _.findIndex(part, (o) => {
              return '' + o._id == params.urlParts[i * 2 + 1];
            });
            advancePart(idx);
          }
        }
        if (!part && !ignoreNonexistant) {
          throw new Error('Unable to find any data of this type');
        }
        let filteredPart = m.filterArray(part, params.conditions, params.projections, params.order, params.skip, params.limit);
        return {
          part: filteredPart,
          data,
          parent,
          parentKey,
          model: params.model,
          mongoConditions: params.mongoConditions,
          conditions: params.conditions,
          mongoProjections: params.mongoProjections,
        };
      });
  };

  return m;
};
