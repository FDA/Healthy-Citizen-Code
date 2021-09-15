const _ = require('lodash');
const log = require('log4js').getLogger('lib/default-controller');
const uglify = require('uglify-js');

const { getUrlWithoutPrefix } = require('./util/util');
const { getFrontendConfig } = require('../config/util');
const { ValidationError, AccessError, InvalidTokenError, ExpiredTokenError, LinkedRecordError } = require('./errors');

/**
 * Implements default processing for all data specified in the appModel
 * You can override default behavior with "controller" schema property (see the metaschema)
 * @returns {{}}
 */
module.exports = (appLib) => {
  const { sendJavascript, getAppModelCode } = appLib.helperUtil;
  const { accessUtil } = appLib;
  const m = {};

  /**
   * Sends error message with 400 HTTP code
   * message is the error message to return to the client
   */
  m.error = (req, res, error, userMessage) => {
    if (error) {
      log.error(`URL: ${req.url}`, error.stack);
    }
    if (error instanceof ValidationError || error instanceof AccessError || error instanceof LinkedRecordError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(400).json({ success: false, message: userMessage });
  };

  /**
   * Returns status message indicating that the backend is up and running
   * Good for uptimerobot to verify the status
   */
  m.getRootJson = (req, res, next) => {
    res.json({
      success: true,
      message: `${appLib.config.APP_NAME || 'ADP'} Backend V5 is working correctly`,
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
   */
  m.getAppModelJson = async (req, res) => {
    const appModelForUser = await accessUtil.getAuthorizedAppModel(req);
    res.json({ success: true, data: appModelForUser });
  };

  m.getBuildAppModelJson = async (req, res) => {
    const frontendPart = { frontend: { config: getFrontendConfig(appLib.config) } };
    try {
      const { user, roles, permissions } = await appLib.auth.authenticationCheck(req);
      appLib.accessUtil.setReqAuth({ req, user, roles, permissions });
      const appModelForUser = await accessUtil.getAuthorizedAppModel(req);
      res.json({ success: true, data: { ...frontendPart, ...appModelForUser } });
    } catch (e) {
      if (e instanceof InvalidTokenError || e instanceof ExpiredTokenError) {
        const unauthorizedModel = accessUtil.getUnauthorizedAppModel(req);
        return res.json({ success: true, data: { ...frontendPart, ...unauthorizedModel } });
      }
      log.error(e.stack);
      res.status(500).json({ success: false, message: `Error occurred while retrieving prebuild app model` });
    }
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
   */
  m.getSchema = async (req, res) => {
    try {
      const path = getUrlWithoutPrefix(req.url, appLib.config.API_PREFIX)
        .replace(/^\/schema\//, '')
        .replace(/.json$/, '')
        .split('/');
      const model = _.cloneDeep(_.get(appLib.baseAppModel.models, path.join('.fields.')));

      const { user, roles, permissions } = await appLib.auth.authenticationCheck(req);
      appLib.accessUtil.setReqAuth({ req, user, roles, permissions });
      accessUtil.handleModelByPermissions(model, accessUtil.getReqPermissions(req));
      res.json({ success: true, data: model });
    } catch (e) {
      if (e instanceof InvalidTokenError || e instanceof ExpiredTokenError) {
        return res.status(401).json({ success: false, message: 'Not authorized to get schema' });
      }
      log.error(e.stack);
      res.status(500).json({ success: false, message: `Error occurred while retrieving schema` });
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
        m.error(req, res, null, `There is a problem with helpers code: ${miniJs.error}`);
      } else {
        sendJavascript(res, miniJs.code, next);
      }
    } catch (e) {
      log.error(e.stack);
      res.send(`Unable to get minified app model code.`);
    }
  };

  return m;
};
