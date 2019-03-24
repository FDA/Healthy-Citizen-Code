const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-controller');
const mongoose = require('mongoose');
const uglify = require('uglify-js');
const Promise = require('bluebird');
const { ObjectID } = require('mongodb');

const {
  getUrlParts,
  getMongoDuplicateErrorMessage,
  getModelNameByReq,
  MONGO,
} = require('./backend-util');
const {
  ValidationError,
  AccessError,
  InvalidTokenError,
  ExpiredTokenError,
  LinkedRecordError,
} = require('./errors');

/**
 * Implements default processing for all data specified in the appModel
 * You can override default behavior with "controller" schema property (see the metaschema)
 * @returns {{}}
 */
module.exports = appLib => {
  const sendJsUtil = require('./send-js-util')(appLib);
  const controllerUtil = require('./default-controller-util')(appLib);
  const { accessUtil } = appLib;
  const m = {};

  /**
   * Sends error message with 400 HTTP code and returns next() (to make sure that the restify after callbacks fire)
   * message is the error message to return to the client
   * @param req
   * @param res
   * @param next
   * @param message
   * @param userMessage
   * @returns {*}
   */
  m.error = (req, res, next, message, userMessage) => {
    log.error(`URL: ${req.url}, ${message}`);
    res.status(400).json({ success: false, message: userMessage || message });
    return next();
  };

  /**
   * Returns status message indicating that the backend is up and running
   * Good for uptimerobot to verify the status
   * @param req
   * @param res
   * @param next
   */
  m.getRootJson = (req, res, next) => {
    res.json({
      success: true,
      message: `${process.env.APP_NAME || 'ADP'} Backend V5 is working correctly`,
    });
    next();
  };

  /**
   * Returns JSON containing the appModel metaschema
   * @param req
   * @param res
   * @param next
   */
  m.getMetaschemaJson = (req, res, next) => {
    res.json({ success: true, data: appLib.appModel.metaschema });
    next();
  };

  /**
   * Returns JSON containing all schemas in the app model
   * @param req
   * @param res
   * @param next
   */
  m.getSchemasJson = (req, res, next) => {
    res.json({ success: true, data: appLib.appModel.models });
    next();
  };

  /**
   * Returns JSON containing full application model
   * @param req
   * @param res
   * @param next
   */
  m.getAppModelJson = (req, res) => {
    const appModelForUser = accessUtil.getAuthorizedAppModel(req);
    res.json({ success: true, data: appModelForUser });
  };

  m.getBuildAppModelJson = (req, res, next) => {
    appLib
      .authenticationCheck(req, res, next)
      .then(({ user, permissions }) => {
        req.user = user;
        accessUtil.setUserPermissions(req, permissions);
        const appModelForUser = accessUtil.getAuthorizedAppModel(req);
        res.json({ success: true, data: appModelForUser });
      })
      .catch(InvalidTokenError, ExpiredTokenError, () => {
        const unauthorizedModel = accessUtil.getUnauthorizedAppModel(req);
        res.json({ success: true, data: unauthorizedModel });
      })
      .catch(err => {
        log.error(err);
        res.status(500).json({
          success: false,
          message: `Error occurred while retrieving prebuild app model`,
        });
      });
  };

  /**
   * Returns JSON containing definition of a specific dashboard
   * @param req
   * @param res
   * @param next
   */
  m.getDashboardJson = (req, res, next) => {
    res.json({
      success: true,
      data: _.get(appLib.appModel, `interface.${req.params.id}`, {}),
    });
    next();
  };

  /**
   * returns lists used both on front and backend as JSON
   * @param req
   * @param res
   * @param next
   */
  m.getListsJson = (req, res, next) => {
    res.json({ success: true, data: appLib.appModelHelpers.Lists });
    next();
  };

  m.getTypeDefaults = (req, res, next) => {
    res.json({ success: true, data: appLib.appModel.typeDefaults });
    next();
  };

  /**
   * Returns the interface definition (including sidebars, menus, dashboards etc)
   * @param req
   * @param res
   * @param next
   */
  m.getInterfaceJson = (req, res, next) => {
    res.json({
      success: true,
      data: appLib.appModel.interface || {},
    });
    next();
  };

  /**
   * Returns the interface definition (including sidebars, menus, dashboards etc)
   * @param req
   * @param res
   * @param next
   */
  m.getDashboardSubtypesJson = (req, res, next) => {
    res.json({
      success: true,
      data: _.get(appLib.appModel, 'interface.dashboardSubtypes', {}),
    });
    next();
  };

  /**
   * This method requires authentication, so it will only return status: true if the user is authenticated
   * @param req
   * @param res
   * @param next
   */
  m.getIsAuthenticated = (req, res, next) => {
    res.json({ success: true, data: 'This token is valid' });
    next();
  };

  /**
   * Returns RFC 2324 HTTP code 418
   * @param req
   * @param res
   * @param next
   */
  m.sendTeapot = (req, res, next) => {
    res.send(418, 'The requested entity body is short and stout. Tip me over and pour me out.');
    next();
  };

  /**
   * Returns JSON containing schema for specific schema
   * The path to schema is figured out from req.url. For instance /schema/phi/encounters/diagnoses
   * returns schema for phi.encounters.diagnosis
   * @param req
   * @param res
   * @param next
   */
  m.getSchema = (req, res, next) => {
    const path = req.url
      .replace(/^\/schema\//, '')
      .replace(/.json$/, '')
      .split('/');

    appLib
      .authenticationCheck(req, res, next)
      .then(({ user, permissions }) => {
        req.user = user;
        accessUtil.setUserPermissions(req, permissions);
        const model = _.clone(_.get(appLib.appModel.models, path.join('.fields.')));
        accessUtil.handleModelByPermissions(model, permissions);
        res.json({ success: true, data: model });
      })
      .catch(InvalidTokenError, ExpiredTokenError, () => {
        res.status(400).json({ success: false, message: 'Not authorized to get schema' });
      })
      .catch(err => {
        log.error(err);
        res.status(500).json({
          success: false,
          message: `Error occurred while retrieving schema`,
        });
      });

    // const schema = _.clone(_.get(appLib.appModel.models, path.join('.fields.')));
    // delete schema.scopes;
    // if (schema && schema.type === 'Schema') {
    //   // TODO: check why code 200 is not returned by default, getting 426 without explicit specification
    //   res.status(200).json({ success: true, data: schema });
    // } else {
    //   res.status(400).json({ success: false, message: `This schema doesn't exist` });
    // }
  };

  /**
   * Returns true if the backend is running in development mode (set it in .env file)
   * Good for chaining in the routes setup
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  m.isDevelopmentMode = (req, res, next) => {
    if (process.env.DEVELOPMENT === 'true') {
      return next();
    }
    res.status(403).json({
      success: false,
      message: 'This route is only available in development mode',
    });
  };

  function setFilteringConditionPromise(inlineContext, schemeLookup) {
    const { where, prepare } = schemeLookup;
    if (!where) {
      schemeLookup.filteringCondition = {};
      return Promise.resolve();
    }
    const filteringLookupConditionPromise = accessUtil.getWhereConditionPromise(
      where,
      prepare,
      inlineContext
    );
    return filteringLookupConditionPromise.then(condition => {
      schemeLookup.filteringCondition = MONGO.expr(condition);
    });
  }

  function getTreeSelectorConditions(treeSelectorSpec, model, parentLookup) {
    if (!parentLookup) {
      return MONGO.expr(treeSelectorSpec.roots);
    }

    // get children condition
    const { foreignKey, parent: parentSpec } = treeSelectorSpec;
    const [parentRefKey, fieldContainingRef] = Object.entries(parentSpec)[0];

    return model.findOne({ [foreignKey]: parentLookup._id }).then(parentDoc => ({
      [parentRefKey]: _.get(parentDoc, fieldContainingRef),
    }));
  }

  function getTreeSelectorParentLookup(req, treeSelectorSpec) {
    // label is not necessary
    // TODO: transform string mongo id to ObjectID considering type of foreignKey instead of using isValid
    const { foreignKeyVal } = req.query;
    if (!foreignKeyVal) {
      return null;
    }

    return {
      table: treeSelectorSpec.table,
      _id: ObjectID.isValid(foreignKeyVal) ? new ObjectID(foreignKeyVal) : foreignKeyVal,
    };
  }

  function schemaTreeSelector(req, res, next, treeSelectorSpec) {
    const collectionName = treeSelectorSpec.table;
    const model = mongoose.model(collectionName);
    if (!model) {
      return m.error(req, res, next, `Invalid model name in the URL: ${req.url}`);
    }
    // TODO: should I move limit to lookup definition? Or give one ability to override, make it smaller than the one defined on table?
    let limit = _.get(
      appLib.appModel,
      `models.${collectionName}.limitReturnedRecords`,
      _.get(appLib.appModel.metaschema, 'limitReturnedRecords.default', -1)
    );
    limit = _.toInteger(limit);
    const lookupFields = controllerUtil.getSearchableFields(collectionName);
    const skip =
      req.query.page && parseInt(req.query.page, 10) > 0
        ? (parseInt(req.query.page, 10) - 1) * limit
        : 0;
    const labelFieldName = _.get(treeSelectorSpec, 'label', '_id');
    const foreignKeyFieldName = _.get(treeSelectorSpec, 'foreignKey', '_id');

    const searchConditions = [];
    controllerUtil.updateSearchConditions(searchConditions, lookupFields, req.query.q);
    const overallSearchCondition = searchConditions.length > 0 ? MONGO.or(...searchConditions) : {};
    const lookupQuery = MONGO.and(overallSearchCondition, treeSelectorSpec.filteringCondition);
    const inlineCtx = accessUtil.getInlineContext(req);
    const permissions = accessUtil.getUserPermissions(req);
    const userContext = appLib.accessUtil.getUserContext(req);

    const treeSelectorParentLookup = getTreeSelectorParentLookup(req, treeSelectorSpec);

    Promise.all([
      accessUtil.getViewConditionsByPermissionsForLookup(
        permissions,
        inlineCtx,
        treeSelectorSpec,
        lookupQuery
      ),
      getTreeSelectorConditions(treeSelectorSpec, model, treeSelectorParentLookup),
    ])
      .then(([viewCondition, treeSelectorCondition]) =>
        // TODO: support regexps in lookups (check out git history) ?
        // TODO: call renderer for the label?
        appLib.dba.getItemsUsingCache({
          model,
          userContext,
          conditions: MONGO.and(viewCondition, treeSelectorCondition),
          sort: treeSelectorSpec.sortBy,
          skip,
          limit,
        })
      )
      .then(data => {
        const more = data.length === limit;
        const isLeafFunc = new Function('', `return ${treeSelectorSpec.leaves}`);
        const ret = _.map(data, row => ({
          id: _.get(row, foreignKeyFieldName),
          label: _.get(row, labelFieldName),
          isLeaf: isLeafFunc.call(row),
        }));
        res.json({ success: true, more, data: ret });
      })
      .catch(err => m.error(req, res, next, `Unable to return treeselector result: ${err}`));
  }

  function schemaLookup(req, res, next, schemeLookup) {
    const model = mongoose.model(schemeLookup.table);
    if (!model) {
      return m.error(req, res, next, `Invalid model name in the URL: ${req.url}`);
    }
    // TODO: should I move limit to lookup definition? Or give one ability to override, make it smaller than the one defined on table?
    let limit = _.get(
      appLib.appModel,
      `models.${schemeLookup.table}.limitReturnedRecords`,
      _.get(appLib.appModel.metaschema, 'limitReturnedRecords.default', -1)
    );
    limit = _.toInteger(limit);
    const lookupFields = controllerUtil.getSearchableFields(schemeLookup.table);
    const skip =
      req.query.page && parseInt(req.query.page, 10) > 0
        ? (parseInt(req.query.page, 10) - 1) * limit
        : 0;
    const labelFieldName = _.get(schemeLookup, 'label', '_id');
    const foreignKeyFieldName = _.get(schemeLookup, 'foreignKey', '_id');

    const searchConditions = [];
    controllerUtil.updateSearchConditions(searchConditions, lookupFields, req.query.q);
    const overallSearchCondition = searchConditions.length > 0 ? MONGO.or(...searchConditions) : {};
    const lookupQuery = MONGO.and(overallSearchCondition, schemeLookup.filteringCondition);
    const inlineCtx = accessUtil.getInlineContext(req);
    const permissions = accessUtil.getUserPermissions(req);
    const userContext = appLib.accessUtil.getUserContext(req);

    accessUtil
      .getViewConditionsByPermissionsForLookup(permissions, inlineCtx, schemeLookup, lookupQuery)
      .then(permLookup =>
        // TODO: support regexps in lookups (check out git history) ?
        // TODO: call renderer for the label?
        appLib.dba.getItemsUsingCache({
          model,
          userContext,
          conditions: permLookup,
          sort: schemeLookup.sortBy,
          skip,
          limit,
        })
      )
      .then(data => {
        const more = data.length === limit;
        const ret = _.map(data, row => ({
          id: _.get(row, foreignKeyFieldName),
          label: _.get(row, labelFieldName),
        }));
        res.json({ success: true, more, data: ret });
      })
      .catch(err => m.error(req, res, next, `Unable to return lookup result: ${err}`));
  }

  /**
   * This method returns limited number of entries from a lookup table that match search criteria.
   * It is to be used by UI elements similar to select2 to find appropriate records to display
   * The limit of returned record is defined per schema, see limitReturnedRecords in metaschema
   * The lookup URL should look like /lookup/<table name/<lookup id>.json?q=<lookup string>&page=<page number>
   * Page Number refers to select2 infinity window approach and returns specified batch of limitReturnedRecords records
   * @param req
   * @param res
   * @param next
   */
  m.getLookupTableJson = (req, res, next) => {
    const urlParts = getUrlParts(req);
    const [lookupId, tableName] = urlParts.slice(-2);
    if (!lookupId) {
      return m.error(req, res, next, `No lookup ID in the URL: ${req.url}`);
    }
    const lookup = _.get(appLib.appLookups, lookupId);
    const schemeLookup = _.clone(_.get(lookup, ['table', tableName]));
    if (!schemeLookup) {
      return m.error(req, res, next, `Invalid path to lookup in the URL: ${req.url}`);
    }

    const inlineContext = accessUtil.getInlineContext(req);
    setFilteringConditionPromise(inlineContext, schemeLookup)
      .then(() => {
        schemaLookup(req, res, next, schemeLookup);
      })
      .catch(err => {
        log.error(err.stack);
        m.error(req, res, next, `Error occurred during lookup request: ${req.url}`);
      });
  };

  m.getTreeSelector = (req, res, next) => {
    const urlParts = getUrlParts(req);
    const [treeSelectorId, tableName] = urlParts.slice(-2);
    if (!treeSelectorId) {
      return m.error(req, res, next, `No TreeSelector ID in the URL: ${req.url}`);
    }
    const table = _.get(appLib.appTreeSelectors, treeSelectorId);
    const treeSelectorSpec = _.clone(_.get(table, tableName));
    if (!treeSelectorSpec) {
      return m.error(req, res, next, `Invalid path to TreeSelector in the URL: ${req.url}`);
    }

    const inlineContext = accessUtil.getInlineContext(req);
    setFilteringConditionPromise(inlineContext, treeSelectorSpec)
      .then(() => {
        schemaTreeSelector(req, res, next, treeSelectorSpec);
      })
      .catch(err => {
        log.error(err.stack);
        m.error(req, res, next, `Error occurred during lookup request: ${req.url}`);
      });
  };

  function getElementsWithFilteredFields(req, actionsToAdd) {
    return controllerUtil.getElements(req, actionsToAdd).then(({ data, params }) => {
      const appModel = appLib.appModel.models[params.model.modelName];
      const userPermissions = accessUtil.getUserPermissions(req);
      const filteredDocs = accessUtil.filterDocFields(appModel, data, 'view', userPermissions);
      return { data: filteredDocs, params };
    });
  }

  /**
   * Returns all  records from the given collection. attribute limitReturnedRecords or the schema may reduce the maximum number
   * of records returned from this collection at once.
   * This supports datatables server-side mode parameters
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  m.getItems = (req, res, next) => {
    const action = 'datatables';
    req.action = action;
    const [modelName] = getUrlParts(req);

    return Promise.resolve(appLib.hooks.getPreHookPromise(modelName, req, action))
      .bind({})
      .then(() => getElementsWithFilteredFields(req, true))
      .then(({ data, params }) => {
        this.data = data;
        this.model = params.model;
        this.mongoConditions = params.mongoConditions;

        if (!req.query.draw) {
          return 0;
        }
        return this.model.countDocuments({});
      })
      .then(recordsTotal => {
        this.recordsTotal = recordsTotal;

        if (!req.query.draw) {
          return 0;
        }
        return this.model.countDocuments(this.mongoConditions);
      })
      .then(recordsFiltered => {
        this.recordsFiltered = recordsFiltered;
        return appLib.hooks.getPostHookPromise(modelName, req, action);
      })
      .then(() => {
        if (!req.query.draw) {
          res.json({
            success: true,
            data: this.data,
          });
        } else {
          res.json({
            success: true,
            data: this.data,
            recordsTotal: this.recordsTotal,
            recordsFiltered: this.recordsFiltered,
          });
        }
        next();
      });
  };

  /**
   * CRUD Read (returns one item from a url like /itemSchema/5871906ea7cddad23a26084d
   * @param req
   * @param res
   * @param next
   */
  m.getItem = (req, res, next) => {
    const action = 'view';
    const [modelName] = getUrlParts(req);

    return Promise.resolve(appLib.hooks.getPreHookPromise(modelName, req, action))
      .bind({})
      .then(() => getElementsWithFilteredFields(req, action))
      .then(({ data, params }) => {
        const appModel = appLib.appModel.models[params.model.modelName];
        const userPermissions = accessUtil.getUserPermissions(req);
        this.filteredDoc = accessUtil.filterDocFields(appModel, data, action, userPermissions);
      })
      .then(() => appLib.hooks.getPostHookPromise(modelName, req, action))
      .then(() => res.json({ success: true, data: this.filteredDoc }))
      .catch(err =>
        m.error(req, res, next, err, 'Internal error: unable to find requested element')
      );
  };

  /**
   * CRUD Delete (deletes one item from a url like phis/587179f6ef4807703afd0dfe/encounters/e2/vitalSigns/e2v2.json)
   * See README.md for the sample data
   * @param req
   * @param res
   * @param next
   */
  m.deleteItem = (req, res, next) => {
    const action = 'delete';
    const [modelName] = getUrlParts(req);

    return Promise.resolve(appLib.hooks.getPreHookPromise(modelName, req, action))
      .bind({})
      .then(() => controllerUtil.getElements(req, action))
      .then(({ data, params }) => {
        this.mongoConditions = params.mongoConditions;
        this.model = params.model;
        return controllerUtil.getLinkedRecordsInfoOnDelete(data, params.model.modelName);
      })
      .then(deleteInfo => {
        const isAllDeletionsValid = deleteInfo.every(info => info.isValidDelete);
        if (!isAllDeletionsValid) {
          const message =
            'ERROR: Unable to delete this record because there are other records referring. ' +
            'Please update the referring records and remove reference to this record.';
          throw new LinkedRecordError(message, deleteInfo);
        }

        const handleLinkedRecordsOnDeletePromises = Promise.map(deleteInfo, info =>
          info.handleDeletePromise()
        );
        return Promise.all([
          appLib.dba.removeItem(this.model, this.mongoConditions),
          handleLinkedRecordsOnDeletePromises,
        ]);
      })
      .then(() => appLib.hooks.getPostHookPromise(modelName, req, action))
      .then(() => {
        res.json({ success: true });
      })
      .catch(LinkedRecordError, e => {
        res.status(400).json({
          success: false,
          info: e.data
            .filter(info => !info.isValidDelete)
            .map(info => _.pick(info, ['linkedCollection', 'linkedLabel', 'linkedRecords'])),
          message: e.message,
        });
      })
      .catch(err => m.error(req, res, next, err, 'Internal error: unable to delete this item'));
  };
  /**
   * CRUD Update (updates one item from a url like /itemSchema/587179f6ef4807703afd0dfe)
   * Specify the new data for the item as req.body.data
   * NOTE: _id is removed from the new data, so it won't override the original one.
   * @param req
   * @param res
   * @param next
   */
  m.putItem = (req, res, next) => {
    const reqData = req.body.data;
    if (!reqData) {
      return m.error(req, res, next, `Incorrect request. Must have 'data' field in request body`);
    }

    const userPermissions = accessUtil.getUserPermissions(req);
    const [modelName] = getUrlParts(req);
    const listErrors = accessUtil.validateListsValues(modelName, reqData, userPermissions);
    if (!_.isEmpty(listErrors)) {
      return m.error(req, res, next, `Incorrect request: ${listErrors.join(' ')}`);
    }

    controllerUtil.transformLookupKeys(reqData, modelName);

    const action = 'update';
    return Promise.resolve(appLib.hooks.getPreHookPromise(modelName, req, action))
      .bind({})
      .then(() => controllerUtil.checkLookupExistence(reqData, modelName))
      .then(() => controllerUtil.getElements(req, action))
      .then(({ data, params }) => {
        const appModel = appLib.appModel.models[modelName];

        this.doc = data;
        this.newData = accessUtil.mergeDocs({
          appModel,
          dbDoc: this.doc,
          userData: req.body.data,
          action,
          userPermissions,
        });

        const appModelPath = controllerUtil.getAppModelPath(req);
        const userContext = accessUtil.getUserContext(req);
        return appLib.dba.updateItem({
          model: params.model,
          userContext,
          mongoConditions: params.mongoConditions,
          mongoProjections: params.mongoProjections,
          data: this.newData,
          path: appModelPath,
        });
      })
      .then(() => controllerUtil.getUpdateLinkedLabelsPromise(this.newData, this.doc, modelName))
      .then(() => appLib.hooks.getPostHookPromise(modelName, req, action))
      .then(() => res.json({ success: true, id: req.body ? reqData._id : req.params.id }))
      .catch(ValidationError, err => m.error(req, res, next, err.message))
      .catch(err => {
        const duplicateErrMsg = getMongoDuplicateErrorMessage(err, appLib);
        const errMsg = duplicateErrMsg || 'Internal error: unable to update this item';
        m.error(req, res, next, err, errMsg);
      });
  };

  /**
   * CRUD Create (creates one item from a url like /phis/587179f6ef4807703afd0dfe/encounters/e2/vitalSigns/e2v2.json)
   * Specify the data for the new item as req.body.data
   * NOTE: this method doesn't set _id recursively, if you're posting whole subtree please make sure all subtree
   * elements belonging to the appModel have _id set
   * @param req
   * @param res
   * @param next
   */
  m.postItem = (req, res, next) => {
    const reqBody = req.body.data;
    if (!reqBody) {
      return m.error(req, res, next, `Incorrect request. Must have 'data' field in request body`);
    }

    const modelName = getModelNameByReq(req);
    const userPermissions = appLib.accessUtil.getUserPermissions(req);
    const inlineContext = appLib.accessUtil.getInlineContext(req);
    const listErrors = appLib.accessUtil.validateListsValues(
      modelName,
      reqBody,
      userPermissions,
      inlineContext
    );
    if (!_.isEmpty(listErrors)) {
      return m.error(req, res, next, `Incorrect request: ${listErrors.join(' ')}`);
    }

    const userContext = accessUtil.getUserContext(req);
    const action = 'create';

    return Promise.resolve(appLib.hooks.getPreHookPromise(modelName, req, action))
      .bind({})
      .then(() => controllerUtil.getQueryParams(req, action))
      .then(params =>
        controllerUtil.createItemWithCheckAndFilter({
          action,
          data: reqBody,
          model: params.model,
          mongoConditions: params.mongoConditions,
          userPermissions,
          userContext,
        })
      )
      .then(item => {
        this.item = item;
        return appLib.hooks.getPostHookPromise(modelName, req, action);
      })
      .then(() => {
        res.json({ success: true, id: this.item._id });
        next();
      })
      .catch(AccessError, ValidationError, err => m.error(req, res, next, err.message))
      .catch(err => {
        const duplicateErrMsg = getMongoDuplicateErrorMessage(err, appLib);
        const errMsg = duplicateErrMsg || 'Internal error: unable to create this item';
        m.error(req, res, next, err, errMsg);
      });
  };

  /**
   * Returns string representing code for the appModelHelpers.Lists
   * TODO: depricate it, all clients should use /lists instead of /lists.js
   */
  m.getClientSideCodeForLists = (req, res, next) => {
    const body = `${sendJsUtil.getJsPrefix('Lists') +
      sendJsUtil.getJsObjectString(appLib.appModelHelpers.Lists)}};`;
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.FormRenderers
   */
  m.getClientSideCodeForFormRenderers = (req, res, next) => {
    const body = `${sendJsUtil.getJsPrefix('FormRenderers') +
      sendJsUtil.getJsObjectString(appLib.appModelHelpers.FormRenderers)}};`;
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.Renderers
   */
  m.getClientSideCodeForRenderers = (req, res, next) => {
    const body = `${sendJsUtil.getJsPrefix('Renderers') +
      sendJsUtil.getJsObjectString(appLib.appModelHelpers.Renderers)}};`;
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.CustomActions
   */
  m.getClientSideCodeForCustomActions = (req, res, next) => {
    const body = `${sendJsUtil.getJsPrefix('CustomActions') +
      sendJsUtil.getJsObjectString(appLib.appModelHelpers.CustomActions)}};`;
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.LabelRenderers
   */
  m.getClientSideCodeForLabelRenderers = (req, res, next) => {
    const body = `${sendJsUtil.getJsPrefix('LabelRenderers') +
      sendJsUtil.getJsObjectString(appLib.appModelHelpers.LabelRenderers)}};`;
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.Validators
   */
  m.getClientSideCodeForValidators = (req, res, next) => {
    const body = `vutil={${sendJsUtil.getJsObjectString(
      appLib.appModelHelpers.ValidatorUtils
    )}};${sendJsUtil.getJsPrefix('Validators')}${sendJsUtil.getJsObjectString(
      appLib.appModelHelpers.Validators
    )}};`;
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing all code for the application
   */
  m.getAppModelCode = (req, res, next) => {
    sendJsUtil.sendJavascript(res, sendJsUtil.getAppModelCodeStr(req), next);
  };

  /**
   * Returns string representing all code for the application
   */
  m.getMinifiedAppModelCode = (req, res, next) => {
    const miniJs = uglify.minify(sendJsUtil.getAppModelCodeStr());
    if (miniJs.error) {
      m.error(req, res, next, `There is a problem with helpers code: ${miniJs.error}`);
    } else {
      sendJsUtil.sendJavascript(res, miniJs.code, next);
    }
  };

  /*
  m.handlePublicFileNotFound = (req, res, err, next) => {
    if (_.get(err, 'body.code') === 'ResourceNotFound' && _.get(req, 'url').match(/^\/public\//i)) {
      const serveFileFromStats = (file, sErr, stats, isGzip, sReq, sRes, sNext) => {
        if (
          typeof sReq.connectionState === 'function' &&
          (sReq.connectionState() === 'close' || sReq.connectionState() === 'aborted')
        ) {
          sNext(false);
          return;
        }

        if (sErr) {
          sNext(new restifyErrors.ResourceNotFoundError(sErr, '%s', sReq.path()));
          return;
        }
        if (!stats.isFile()) {
          sNext(new restifyErrors.ResourceNotFoundError('%s does not exist', sReq.path()));
          return;
        }

        if (sRes.handledGzip && isGzip) {
          sRes.handledGzip();
        }

        const fstream = fs.createReadStream(file + (isGzip ? '.gz' : ''));
        const opts = {}; // match these to lib/app.js:454
        const maxAge = opts.maxAge === undefined ? 3600 : opts.maxAge;
        fstream.once('open', () => {
          sRes.cache({ maxAge });
          sRes.set('Content-Length', stats.size);
          sRes.set('Content-Type', mime.getType(file));
          sRes.set('Last-Modified', stats.mtime);

          if (opts.charSet) {
            const type = `${sRes.getHeader('Content-Type')}; charset=${opts.charSet}`;
            sRes.setHeader('Content-Type', type);
          }

          if (opts.etag) {
            sRes.set('ETag', opts.etag(stats, opts));
          }
          sRes.writeHead(200);
          fstream.pipe(sRes);
          fstream.once('close', () => {
            sNext(false);
          });
        });

        sRes.once('close', () => {
          fstream.close();
        });
      };
      const file = `./model/${req.path()}`;
      fs.stat(file, (statErr, stats) => {
        if (!statErr && stats.isDirectory() && opts.default) {
          const filePath = path.join(file, opts.default);
          fs.stat(filePath, (dirErr, dirStats) => {
            serveFileFromStats(filePath, dirErr, dirStats, false, req, res, next);
          });
        } else {
          serveFileFromStats(file, statErr, stats, false, req, res, next);
        }
      });
    } else {
      next(new restifyErrors.ResourceNotFoundError(err));
    }
  };
*/

  return m;
};
