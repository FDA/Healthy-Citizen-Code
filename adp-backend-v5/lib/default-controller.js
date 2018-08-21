const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-controller');
const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;
const butil = require('./backend-util');
const async = require('async');
const uglify = require('uglify-js');
const restifyErrors = require('restify-errors');

/**
 * Implements default processing for all data specified in the appModel
 * You can override default behavior with "controller" schema property (see the metaschema)
 * @returns {{}}
 */
module.exports = function (appLib) {
  const sendJsUtil = require('./send-js-util')(appLib);
  const controllerUtil = require('./default-controller-util')(appLib);
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
    res.json(400, {success: false, message: userMessage || message});
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
    res.json({success: true, message: `HC Backend V5 is working correctly`});
    next();
  };

  /**
   * Returns JSON containing the appModel metaschema
   * @param req
   * @param res
   * @param next
   */
  m.getMetaschemaJson = (req, res, next) => {
    res.json({success: true, data: appLib.appModel.metaschema});
    next();
  };

  /**
   * Returns JSON containing all schemas in the app model
   * @param req
   * @param res
   * @param next
   */
  m.getSchemasJson = (req, res, next) => {
    res.json({success: true, data: appLib.appModel.models});
    next();
  };

  /**
   * Returns JSON containing full application model
   * @param req
   * @param res
   * @param next
   */
  m.getAppModelJson = (req, res, next) => {
    const permissions = appLib.accessUtil.getUserPermissions(req);
    const appModelForUser = _.cloneDeep(appLib.appModel);
    delete appModelForUser.rolesToPermissions;
    delete appModelForUser.usedPermissions;

    _.forEach(appModelForUser.models, (model, modelName) => {
      const actionsFromScopes = appLib.accessUtil.getAvailActionsFromScopes(model.scopes, permissions);
      const actionsFromActions = appLib.accessUtil.getAvailActionsFromActions(model.actions, permissions);
      const intersectedActions = new Set([...actionsFromActions].filter(a => actionsFromScopes.has(a)));

      // delete scopes and permission details
      delete model.scopes;
      _.forOwn(model.actions.fields, (actionSettings, actionName) => {
        if (!intersectedActions.has(actionName)) {
          delete model.actions.fields[actionName];
        } else {
          delete model.actions.fields[actionName].permissions;
        }
      });
    });

    const lists = appLib.accessUtil.getListsForUser(req);
    // replace every list field contains 'scopes' and 'values' with plain list values
    _.forEach(lists, (list, listFieldPath) => {
      _.set(appModelForUser.models, listFieldPath + '.list', list.values);
    });

    res.json({success: true, data: appModelForUser});
    next();
  };


  /**
   * Returns JSON containing definition of a specific dashboard
   * @param req
   * @param res
   * @param next
   */
  m.getDashboardJson = (req, res, next) => {
    res.json({success: true, data: _.get(appLib.appModel, `interface.${req.params.id}`, {})});
    next();
  };

  /**
   * returns lists used both on front and backend as JSON
   * @param req
   * @param res
   * @param next
   */
  m.getListsJson = (req, res, next) => {
    res.json({success: true, data: appLib.appModelHelpers.Lists});
    next();
  };

  m.getTypeDefaults = (req, res, next) => {
    res.json({success: true, data: appLib.appModel.typeDefaults});
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
      data: appLib.appModel.hasOwnProperty('interface') ? appLib.appModel['interface'] : {},
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
    res.json({success: true, data: _.get(appLib.appModel, 'interface.dashboardSubtypes', {})});
    next();
  };

  /**
   * This method requires authentication, so it will only return status: true if the user is authenticated
   * @param req
   * @param res
   * @param next
   */
  m.getIsAuthenticated = (req, res, next) => {
    res.json({success: true, data: 'This token is valid'});
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
   * Returns JSON containing schema for specific schema or subschema
   * The path to schema/subschema is figured out from req.url. For instance /schema/phi/encounters/diagnoses
   * returns schema for phi.encounters.diagnosis
   * @param req
   * @param res
   * @param next
   */
  m.getSchema = (req, res, next) => {
    let path = req.url.replace(/^\/schema\//, '').replace(/.json$/, '').split('/');
    let ret = _.clone(_.get(appLib.appModel.models, path.join('.fields.')));
    delete ret.scopes;
    if (ret && _.indexOf(['Schema', 'Subschema'], ret.type) >= 0) {
      // TODO: check why code 200 is not returned by default, getting 426 without explicit specification
      res.json(200, {success: true, data: ret});
    } else {
      res.json(400, {success: false, message: 'This schema or subschema doesn\'t exist'});
    }
    next();
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
    if ('true' == process.env.DEVELOPMENT) {
      return next();
    } else {
      res.json(403, {success: false, message: 'This route is only available in development mode'});
    }
  };

  /**
   * This method returns limited number of entries from a lookup table that match search criteria.
   * It is to be used by UI elements similar to select2 to find appropriate records to display
   * The limit of returned record is defined per schema, see limitReturnedRecords in metaschema
   * The lookup URL should look like /lookup/<table name/<lookup id>.json?q=<lookup string>&page=<page number>
   * Page Number refers to select2 infinity window approach and returns specified batch of limitReturnedRecords records
   * TODO: possibly eventually unify it with the CRUD methods using getElement/getQueryParams/filterArray. Especially if lookup in subschemas will need to be supported
   * @param req
   * @param res
   * @param next
   */
  m.getLookupTableJson = (req, res, next) => {
    const urlParts = butil.getUrlParts(req);
    const [lookupId, tableName] = urlParts.slice(-2);
    if (!lookupId) {
      return m.error(req, res, next, 'No lookup ID in the URL:' + req.url);
    }
    const lookup = _.get(appLib.appLookups, [lookupId, 'table', tableName]);
    if (!lookup) {
      return m.error(req, res, next, 'Invalid path to lookup in the URL:' + req.url);
    }
    // TODO: L: if necessary support lookups in nested subschemas later. Don't need this now
    // TODO: remove subSchemaLookup if we use only schema approach
    if (lookup.table.startsWith('/')) { // this is a subschema lookup
      subSchemaLookup(lookup, req, res, next);
    } else { // schema lookup
      schemaLookup(lookup, req, res, next);
    }

    function schemaLookup (lookup, req, res, next) {
      const model = mongoose.model(lookup.table);
      if (!model) {
        return m.error(req, res, next, 'Invalid model name in the URL:' + req.url);
      }
      // TODO: should I move limit to lookup definition? Or give one ability to override, make it smaller than the one defined on table?
      const limit = _.get(appLib.appModel, `models.${lookup.table}.limitReturnedRecords`, _.get(appLib.appModel.metaschema, 'limitReturnedRecords.default', -1)); // note that lookups in subschemas are not supported here yet
      const lookupFields = controllerUtil.getSearchableFields(lookup.table);
      const skip = req.params.page && parseInt(req.params.page) > 0 ? (parseInt(req.params.page) - 1) * limit : 0;
      const labelFieldName = _.get(lookup, 'label', '_id');
      const foreignKeyFieldName = _.get(lookup, 'foreignKey', '_id');

      const searchConditions = [];
      controllerUtil.updateSearchConditions(searchConditions, lookupFields, req.params.q);
      let lookupQuery = searchConditions.length > 0 ? {$or: searchConditions} : {};
      appLib.accessUtil.getViewConditionsByPermissionsForLookup(req, lookup, lookupQuery)
        .then((lookupQueryWithPermissions) => {
          // TODO: support regexps in lookups (check out git history) ?
          // TODO: call renderer for the label?
          const userContext = appLib.accessUtil.getUserContext(req);
          return appLib.dba.findItems(model, userContext, lookupQueryWithPermissions, {}, {}, skip, limit, true);
        })
        .then((data) => {
          const more = data.length === limit;
          const ret = _.map(data, (row) => {
            return {
              id: _.get(row, foreignKeyFieldName),
              label: _.get(row, labelFieldName),
            };
          });
          res.json({success: true, more: more, data: ret});
        })
        .catch((err) => {
          return m.error(req, res, next, `Unable to return lookup result: ${err}`);
        });
    }

    function subSchemaLookup (lookup, req, res, next) {
      // TODO: support admin function when admin can lookup any user's
      const tableParts = lookup.table.split('/'); // starts with "/"
      // Currently only supports table paths like /mainSchema/:recordId/subschema
      if (tableParts.length != 4) {
        return m.error(req, res, next, 'Invalid lookup subschema name in:' + lookup.table);
      } else {
        let model = mongoose.model(tableParts[1]);
        if (!model) {
          return m.error(req, res, next, 'Invalid main schema name in the URL:' + req.url);
        } else {
          const recordId = req.user[tableParts[2].substring(1)];
          model.findById(recordId).lean().exec((err, data) => {
            if (err) {
              return m.error(req, res, next, 'Error finding record in model in the URL:' + req.url);
            } else if (!data) {
              return m.error(req, res, next, 'No record found in the URL:' + req.url);
            } else {
              const records = data[tableParts[3]];
              const labelName = _.get(lookup, 'label', '_id');
              const foreignKeyName = _.get(lookup, 'foreignKey', '_id');
              const ret = _(records).map((row) => {
                let label = _.get(row, labelName);
                // TODO: this searches only in label. In the future also search in searchable and use regex
                if (label.toLowerCase().indexOf(req.params.q.toLowerCase()) >= 0) {
                  return {
                    id: _.get(row, foreignKeyName),
                    label: label,
                  };
                } else {
                  return null;
                }
              }).compact().value();
              res.json({success: true, more: false, data: ret}); // TODO: support pagination in the future
              next();
            }
          });
        }
      }
    }
  };

  /**
   * Returns all  records from the given collection. attribute limitReturnedRecords or the schema may reduce the maximum number
   * of records returned from this collection at once. Note that in case of tables that require authentication (see requiresAuthentication)
   * isAuthenticated will prevent from returning unauthorized records, so for such collections this method will return nothing.
   * This supports datatables server-side mode parameters
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  m.getItems = (req, res, next) => {
    let queryModel;
    let queryConditions;
    let arrayConditions;
    let elements;
    async.series({
      // get data
      data: (cb) => {
        // inject custom action for retrieving scope condition
        req.action = 'datatables';
        controllerUtil.getElements(req, true)
          .then(({part, data, parent, parentKey, model, mongoConditions, conditions, mongoProjections}) => {
            queryConditions = mongoConditions;
            arrayConditions = conditions;
            queryModel = model;
            if (parent && parent[parentKey]) {
              elements = parent[parentKey]; // if elements == null that means that filtered records need to be calculated in mongo query
            }
            cb(null, part);
          })
          .catch(err => cb(err));
      },
      recordsTotal: (cb) => {
        if (req.params.draw) {
          if (elements) {
            cb(null, elements.length);
          } else {
            queryModel.count({}, cb);
          }
        } else {
          cb(null, 0);
        }
      },
      recordsFiltered: (cb) => {
        if (req.params.draw) {
          if (elements) {
            cb(null, controllerUtil.filterArray(elements, arrayConditions).length);
          } else {
            queryModel.count(queryConditions, cb);
          }
        } else {
          cb(null, 0);
        }
      },
    }, (err, results) => {
      if (err) {
        res.json(400, {success: false, message: `Unable to retrieve data: ${err}`});
      } else {
        if (req.params.draw) {
          res.json({
            success: true,
            recordsTotal: results.recordsTotal,
            recordsFiltered: results.recordsFiltered,
            data: results.data,
          });
        } else {
          res.json({success: true, data: results.data});
        }
      }
      next();
    });
  };

  /**
   * CRUD Read (returns one item from a url like /phis/5871906ea7cddad23a26084d/encounters/test1/diagnoses/test3.json
   * @param req
   * @param res
   * @param next
   */
  m.getItem = (req, res, next) => {
    controllerUtil.getElements(req, 'view')
      .then(({part, data, parent, parentKey, model, mongoConditions, conditions, mongoProjections}) => {
        res.json({success: true, data: part});
        next();
      })
      .catch(err => m.error(req, res, next, err, 'Internal error: unable to find requested element'));
  };

  /**
   * CRUD Delete (deletes one item from a url like phis/587179f6ef4807703afd0dfe/encounters/e2/vitalSigns/e2v2.json)
   * See README.md for the sample data
   * @param req
   * @param res
   * @param next
   */
  m.deleteItem = (req, res, next) => {
    // 1. For Subschema elems update is required.
    // Update includes 'validate', 'transform', 'synthesize' stages and requires whole document to be processed.
    // So we need to get whole document, not enable permissions and then try to update with mongo conditions considering permissions.
    // 2. For Schema elems simple delete is performed.
    // So we enable permissions check for getElements.
    // If no document is retrieved its one of 1) doesn't exist or 2) allowed to be deleted.
    let getElemsPromise;
    if (controllerUtil.isModelSchema(req)) {
      getElemsPromise = controllerUtil.getElements(req, 'delete');
    } else {
      getElemsPromise = controllerUtil.getElements(req);
    }

    return getElemsPromise
      .then(({part, data, parent, parentKey, model, mongoConditions, conditions, mongoProjections}) => {
        if (parent == null) { // need to delete whole document
          appLib.dba.removeItem(model, mongoConditions, (err) => {
            if (err) {
              return m.error(req, res, next, err, 'Internal error: unable to delete this item');
            } else {
              res.json({success: true});
              next();
            }
          });
        } else {
          if (Array.isArray(part) && part.length == 0) {
            delete parent[parentKey];
          }
          if (Array.isArray(parent) || 'object' === typeof parent) {
            parent[parentKey].deletedAt = new Date();
          } else {
            return m.error(req, res, next, err, 'Internal error: unable to delete this item');
          }
          const userContext = appLib.accessUtil.getUserContext(req);
          return appLib.dba.updateItem('$pull', model, userContext, mongoConditions, mongoProjections, data, controllerUtil.getAppModelPath(req))
            .then(() => {
              res.json({success: true});
              next();
            })
            .catch((err) => m.error(req, res, next, err, 'Internal error: unable to delete this item'));
        }
      })
      .catch(err => m.error(req, res, next, err, 'Internal error: unable to delete this item'));
  };

  /**
   * CRUD Update (updates one item from a url like /phis/587179f6ef4807703afd0dfe/encounters/e2/vitalSigns/e2v2.json)
   * Specify the new data for the item as req.body.data
   * NOTE: _id is removed from the new data, so it won't override the original one.
   * NOTE: you can put nested data, but it won't be accessible via CRUD, because CRUD is completely generated from the appModel, not the content
   * @param req
   * @param res
   * @param next
   */
  m.putItem = (req, res, next) => {
    if (!req.body.hasOwnProperty('data')) {
      return m.error(req, res, next, 'New data is not specified');
    }
    const listErrors = appLib.accessUtil.validateListsValues(req);
    if (!_.isEmpty(listErrors)) {
      return m.error(req, res, next, `Incorrect request: ${listErrors.join(' ')}`);
    }

    // get elements without handling scopes for actions, but including transformations
    return controllerUtil.getElements(req, false, null, false, false)
      .then(({data, parent, parentKey, model}) => {
        delete req.body.data._id; // do not override the original document/part id
        if (parent) { // i.e. only part of the document is being updated
          parent[parentKey] = _.assign(parent[parentKey], req.body.data);
        } else {
          data = _.assign(data, req.body.data);
        }

        // get params with considering scope permissions
        let modelConditions = {};
        const urlParts = butil.getUrlParts(req);
        if (urlParts.length >= 2) {
          try {
            const objectID = new ObjectID(urlParts[1]);
            modelConditions = {'_id': objectID };
          } catch (e) {
            return Promise.resolve({err: `Invalid object id; ${req.params.id}`});
          }
        }
        return controllerUtil.getQueryParams(req, modelConditions, 'update')
          .then((params) => {
            const appModelPath = controllerUtil.getAppModelPath(req);
            const userContext = appLib.accessUtil.getUserContext(req);
            return appLib.dba.updateItem('$set', model, userContext, params.mongoConditions, params.mongoProjections, data, appModelPath);
          })
          .then(() => res.json({success: true, id: req.body ? req.body.data._id : req.params.id}))
          .catch(err => m.error(req, res, next, err, err.message));
      })
      .catch(err => m.error(req, res, next, err, 'Internal error: unable to update this item'));
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
    if (!req.body.data) {
      return m.error(req, res, next, `Incorrect request. Must have 'data' field in request body`);
    }
    const listErrors = appLib.accessUtil.validateListsValues(req);
    if (!_.isEmpty(listErrors)) {
      return m.error(req, res, next, `Incorrect request: ${listErrors.join(' ')}`);
    }

    controllerUtil.getElements(req, false, null, true)
      .then(({part, data, parent, parentKey, model, mongoConditions, mongoProjections}) => {
        if ('undefined' == typeof part) { // happens when trying to post to a valid element in data which doesn't exist in the document yet
          parent[parentKey] = [];
        }
        if (false == part && parent && parentKey) { // _presumably_ happens when trying to post to an element in data which doesn't exist in the document yet. TODO: verify that this element is part of app Schema
          parent[parentKey] = [];
        }
        if (parent == null) { // need to add new collection document
          let modelConditions = {};
          const urlParts = butil.getUrlParts(req);
          if (urlParts.length >= 2) {
            try {
              const objectID = new ObjectID(urlParts[1]);
              modelConditions = {'_id': objectID };
            } catch (e) {
              return Promise.resolve({err: `Invalid object id; ${req.params.id}`});
            }
          }
          return controllerUtil.getQueryParams(req, modelConditions, 'update')
            .then((params) => {
              const userContext = appLib.accessUtil.getUserContext(req);
              return appLib.dba.createItemCheckingConditions(model, params.mongoConditions, userContext, req.body.data);
            })
            .then((item) => {
              res.json({success: true, id: item._id});
              next();
            })
            .catch((err) => {
              log.error(err);
              return m.error(req, res, next, err.message);
            });
        } else if ('object' == typeof parent && parentKey !== parseInt(parentKey, 10)) { // adding new element into array/subschema
          if (parent[parentKey]) {
            req.body.data._id = butil.generateObjectId();
            parent[parentKey].push(req.body.data);
            // TODO: refactor, updating the whole record is ineffective, just use $push
            const userContext = appLib.accessUtil.getUserContext(req);
            appLib.dba.updateItem('$push', model, userContext, mongoConditions, mongoProjections, data, [...controllerUtil.getAppModelPath(req), req.body.data._id + ''])
              .then(() => res.json({success: true, id: req.body.data._id}))
              .catch((err) => m.error(req, res, next, err, 'Internal error: unable to create this item'));
          } else {
            return m.error(req, res, next, `parent[parentKey] doesn't exist. parent: ${JSON.stringify(parent, null, 4)} REQ.BODY.DATA: ${JSON.stringify(req.body.data, null, 4)}`, 'Internal error: unable to create this item');
          }
        } else {
          return m.error(req, res, next, 'Only posting new elements into array or into collection is allowed', 'Internal error: unable to create this item');
        }
      })
      .catch(err => m.error(req, res, next, err, 'Internal error: unable to create this item'));
  };

  /**
   * Returns string representing code for the appModelHelpers.Lists
   * TODO: depricate it, all clients should use /lists instead of /lists.js
   */
  m.getClientSideCodeForLists = (req, res, next) => {
    let body = sendJsUtil.getJsPrefix('Lists') + sendJsUtil.getJsObjectString(appLib.appModelHelpers.Lists) + '};';
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.FormRenderers
   */
  m.getClientSideCodeForFormRenderers = (req, res, next) => {
    let body = sendJsUtil.getJsPrefix('FormRenderers') + sendJsUtil.getJsObjectString(appLib.appModelHelpers.FormRenderers) + '};';
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.Renderers
   */
  m.getClientSideCodeForRenderers = (req, res, next) => {
    let body = sendJsUtil.getJsPrefix('Renderers') + sendJsUtil.getJsObjectString(appLib.appModelHelpers.Renderers) + '};';
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.CustomActions
   */
  m.getClientSideCodeForCustomActions = (req, res, next) => {
    let body = sendJsUtil.getJsPrefix('CustomActions') + sendJsUtil.getJsObjectString(appLib.appModelHelpers.CustomActions) + '};';
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.LabelRenderers
   */
  m.getClientSideCodeForLabelRenderers = (req, res, next) => {
    let body = sendJsUtil.getJsPrefix('LabelRenderers') + sendJsUtil.getJsObjectString(appLib.appModelHelpers.LabelRenderers) + '};';
    sendJsUtil.sendJavascript(res, body, next);
  };

  /**
   * Returns string representing code for the appModelHelpers.Validators
   */
  m.getClientSideCodeForValidators = (req, res, next) => {
    let body = 'vutil={' + sendJsUtil.getJsObjectString(appLib.appModelHelpers.ValidatorUtils) + '};' +
      sendJsUtil.getJsPrefix('Validators') +
      sendJsUtil.getJsObjectString(appLib.appModelHelpers.Validators) +
      '};';
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
    let miniJs = uglify.minify(sendJsUtil.getAppModelCodeStr());
    if (miniJs.error) {
      m.error(req, res, next, `There is a problem with helpers code: ${miniJs.error}`);
    } else {
      sendJsUtil.sendJavascript(res, miniJs.code, next);
    }
  };

  m.handlePublicFileNotFound = (req, res, err, next) => {
    if (_.get(err, 'body.code') === 'ResourceNotFound' && _.get(req, 'url').match(/^\/public\//i)) {
      let serveFileFromStats = (file, err, stats, isGzip, req, res, next) => {
        if (typeof req.connectionState === 'function' &&
          (req.connectionState() === 'close' ||
            req.connectionState() === 'aborted')) {
          next(false);
          return;
        }

        if (err) {
          next(new restifyErrors.ResourceNotFoundError(err, '%s', req.path()));
          return;
        } else if (!stats.isFile()) {
          next(new restifyErrors.ResourceNotFoundError('%s does not exist', req.path()));
          return;
        }

        if (res.handledGzip && isGzip) {
          res.handledGzip();
        }

        let fstream = fs.createReadStream(file + (isGzip ? '.gz' : ''));
        let opts = {}; // match these to lib/app.js:454
        let maxAge = opts.maxAge === undefined ? 3600 : opts.maxAge;
        fstream.once('open', function (fd) {
          res.cache({maxAge: maxAge});
          res.set('Content-Length', stats.size);
          res.set('Content-Type', mime.getType(file));
          res.set('Last-Modified', stats.mtime);

          if (opts.charSet) {
            var type = res.getHeader('Content-Type') +
              '; charset=' + opts.charSet;
            res.setHeader('Content-Type', type);
          }

          if (opts.etag) {
            res.set('ETag', opts.etag(stats, opts));
          }
          res.writeHead(200);
          fstream.pipe(res);
          fstream.once('close', function () {
            next(false);
          });
        });

        res.once('close', function () {
          fstream.close();
        });

      };
      let file = `./model/${req.path()}`;
      fs.stat(file, function (err, stats) {
        if (!err && stats.isDirectory() && opts.default) {
          var filePath = path.join(file, opts.default);
          fs.stat(filePath, function (dirErr, dirStats) {
            serveFileFromStats(filePath, dirErr, dirStats, false, req, res, next);
          });
        } else {
          serveFileFromStats(file, err, stats, false, req, res, next);
        }
      });
    } else {
      next(new restifyErrors.ResourceNotFoundError(err));
    }
  };

  return m;
};
