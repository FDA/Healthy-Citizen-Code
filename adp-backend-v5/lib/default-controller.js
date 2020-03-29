const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-controller');
const uglify = require('uglify-js');
const DatatablesContext = require('./request-context/datatables/DatatablesContext');
const LookupContext = require('./request-context/datatables/LookupContext');
const TreeSelectorContext = require('./request-context/datatables/TreeSelectorContext');

const { getMongoDuplicateErrorMessage } = require('./util/util');
const { ValidationError, AccessError, InvalidTokenError, ExpiredTokenError, LinkedRecordError } = require('./errors');

/**
 * Implements default processing for all data specified in the appModel
 * You can override default behavior with "controller" schema property (see the metaschema)
 * @returns {{}}
 */
module.exports = appLib => {
  const { sendJavascript, getAppModelCode } = appLib.helperUtil;
  const controllerUtil = require('./default-controller-util')(appLib);
  const { accessUtil } = appLib;
  const { getRequestMeta } = appLib.butil;
  const m = {};

  /**
   * Sends error message with 400 HTTP code
   * message is the error message to return to the client
   * @param req
   * @param res
   * @param next
   * @param err
   * @param userMessage
   * @returns {*}
   */
  m.error = (req, res, next, err, userMessage) => {
    log.error(`URL: ${req.url}`, err.stack);
    res.status(400).json({ success: false, message: userMessage || err.message });
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
  m.getAppModelJson = async (req, res) => {
    const appModelForUser = await accessUtil.getAuthorizedAppModel(req);
    res.json({ success: true, data: appModelForUser });
  };

  m.getBuildAppModelJson = (req, res, next) => {
    appLib
      .authenticationCheck(req, res, next)
      .then(async ({ user, roles, permissions }) => {
        appLib.accessUtil.setReqAuth({ req, user, roles, permissions });
        const appModelForUser = await accessUtil.getAuthorizedAppModel(req);
        res.json({ success: true, data: appModelForUser });
      })
      .catch(InvalidTokenError, ExpiredTokenError, () => {
        const unauthorizedModel = accessUtil.getUnauthorizedAppModel(req);
        res.json({ success: true, data: unauthorizedModel });
      })
      .catch(err => {
        log.error(err.stack);
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
      .then(({ user, roles, permissions }) => {
        appLib.accessUtil.setReqAuth({ req, user, roles, permissions });
        const model = _.cloneDeep(_.get(appLib.baseAppModel.models, path.join('.fields.')));
        accessUtil.handleModelByPermissions(model, accessUtil.getReqPermissions(req));
        res.json({ success: true, data: model });
      })
      .catch(InvalidTokenError, ExpiredTokenError, () => {
        res.status(401).json({ success: false, message: 'Not authorized to get schema' });
      })
      .catch(err => {
        log.error(err.stack);
        res.status(500).json({
          success: false,
          message: `Error occurred while retrieving schema`,
        });
      });
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
  m.getLookupTable = async (req, res, next) => {
    try {
      const lookupContext = await new LookupContext(appLib, req).init();
      const { lookups, more } = await controllerUtil.getSchemaLookups(lookupContext);
      res.json({ success: true, more, data: lookups });
    } catch (e) {
      if (e instanceof ValidationError) {
        return m.error(req, res, next, e, e.message);
      }
      m.error(req, res, next, e, 'Internal error: unable to get requested lookups');
    }
  };

  m.getTreeSelector = async (req, res, next) => {
    try {
      const treeSelectorContext = await new TreeSelectorContext(appLib, req).init();
      const { treeSelectors, more } = await controllerUtil.getTreeSelectorLookups(treeSelectorContext);
      res.json({ success: true, more, data: treeSelectors });
    } catch (e) {
      if (e instanceof ValidationError) {
        return m.error(req, res, next, e, e.message);
      }
      m.error(req, res, next, e, 'Internal error: unable to get requested treeselectors');
    }
  };

  /**
   * Returns all  records from the given collection. attribute limitReturnedRecords or the schema may reduce the maximum number
   * of records returned from this collection at once.
   * This supports datatables server-side mode parameters
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  m.getItems = async (req, res, next) => {
    try {
      const context = await new DatatablesContext(appLib, req).init();
      const { model, appModel, userContext, mongoParams } = context;

      context.userContext.action = 'view';
      const { action } = context.userContext;
      await appLib.hooks.preHook(appModel, userContext);
      const { items, meta } = await controllerUtil.getElementsWithFilteredFields({ context, actionsToPut: true });
      const { draw } = req.query;
      const recordsTotal = draw ? await model.countDocuments({}) : 0;
      const recordsFiltered = draw ? await model.countDocuments(mongoParams.conditions) : 0;
      await appLib.hooks.postHook(appModel, userContext, action);
      log.debug(`Meta: ${getRequestMeta(context, meta)}`);

      if (!draw) {
        return res.json({ success: true, data: items });
      }
      res.json({ success: true, data: items, recordsTotal, recordsFiltered });
    } catch (e) {
      if (e instanceof ValidationError) {
        return m.error(req, res, next, e, e.message);
      }
      m.error(req, res, next, e, 'Internal error: unable to find requested elements');
    }
  };

  /**
   * CRUD Read (returns one item from a url like /itemSchema/5871906ea7cddad23a26084d
   * @param req
   * @param res
   * @param next
   */
  m.getItem = async (req, res, next) => {
    try {
      const context = await new DatatablesContext(appLib, req).init();
      const { items, meta } = await controllerUtil.getItems(context);
      const data = items[0];
      if (!data) {
        log.error(`Unable to find any data. Meta: ${getRequestMeta(context, meta)}`);
        throw new Error('Unable to find any data');
      }
      res.json({ success: true, data });
    } catch (e) {
      if (e instanceof ValidationError) {
        return m.error(req, res, next, e, e.message);
      }
      m.error(req, res, next, e, 'Internal error: unable to find requested element');
    }
  };

  /**
   * CRUD Delete (deletes one item from a url like /collection/587179f6ef4807703afd0dfe)
   * See README.md for the sample data
   * @param req
   * @param res
   * @param next
   */
  m.deleteItem = async (req, res, next) => {
    try {
      const context = await new DatatablesContext(appLib, req).init();
      await appLib.dba.withTransaction(session => controllerUtil.deleteItem(context, session));
      res.json({ success: true, id: req.params.id });
    } catch (e) {
      if (e instanceof ValidationError || e instanceof AccessError) {
        return m.error(req, res, next, e, e.message);
      }
      if (e instanceof LinkedRecordError) {
        return res.status(409).json({
          success: false,
          info: e.data
            .filter(info => !info.isValidDelete)
            .map(info => _.pick(info, ['linkedCollection', 'linkedLabel', 'linkedRecords'])),
          message: e.message,
        });
      }
      m.error(req, res, next, e, 'Internal error: unable to delete requested element');
    }
  };

  /**
   * CRUD Update (updates one item from a url like /itemSchema/587179f6ef4807703afd0dfe)
   * Specify the new data for the item as req.body.data
   * NOTE: _id is removed from the new data, so it won't override the original one.
   * @param req
   * @param res
   * @param next
   */
  m.putItem = async (req, res, next) => {
    try {
      const reqData = req.body.data;
      if (!reqData) {
        throw new ValidationError(`Incorrect request. Must have 'data' field in request body`);
      }

      const context = await new DatatablesContext(appLib, req).init();
      await appLib.dba.withTransaction(session => controllerUtil.putItem(context, reqData, session));
      res.json({ success: true, id: req.params.id });
    } catch (e) {
      if (e instanceof ValidationError) {
        return m.error(req, res, next, e, e.message);
      }
      const duplicateErrMsg = getMongoDuplicateErrorMessage(e, appLib.appModel.models);
      const errMsg = duplicateErrMsg || 'Internal error: unable to update this item';
      m.error(req, res, next, e, errMsg);
    }
  };

  /**
   * CRUD Create (creates one item from a url like /collection/587179f6ef4807703afd0dfe)
   * @param req
   * @param res
   * @param next
   */
  m.postItem = async (req, res, next) => {
    try {
      const reqBody = req.body.data;
      if (!reqBody) {
        throw new ValidationError(`Incorrect request. Must have 'data' field in request body`);
      }
      const context = await new DatatablesContext(appLib, req).init();
      const item = await appLib.dba.withTransaction(session => controllerUtil.postItem(context, reqBody, session));
      res.json({ success: true, id: item._id });
    } catch (e) {
      if (e instanceof AccessError || e instanceof ValidationError) {
        return m.error(req, res, next, e, e.message);
      }
      const duplicateErrMsg = getMongoDuplicateErrorMessage(e, appLib.appModel.models);
      const errMsg = duplicateErrMsg || 'Internal error: unable to create this item';
      m.error(req, res, next, e, errMsg);
    }
  };

  /**
   * Returns string representing all code for the application
   */
  m.getAppModelCode = async (req, res) => {
    try {
      const code = await getAppModelCode();
      sendJavascript(res, code);
    } catch (e) {
      log.error(e.stack);
      res.send(`Unable to get app model code.`);
    }
  };

  /**
   * Returns string representing all code for the application
   */
  m.getMinifiedAppModelCode = async (req, res, next) => {
    try {
      const code = await getAppModelCode();
      const miniJs = uglify.minify(code);
      if (miniJs.error) {
        const errMessage = `There is a problem with helpers code: ${miniJs.error}`;
        m.error(req, res, next, new Error(errMessage), errMessage);
      } else {
        sendJavascript(res, miniJs.code, next);
      }
    } catch (e) {
      log.error(e.stack);
      res.send(`Unable to get minified app model code.`);
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
