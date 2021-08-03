const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const { getDiagramCode } = require('../../lib/dev-helpers/er-diagram');
const { getSchemeInCsv } = require('../../lib/dev-helpers/data-dictionary');
const { version: APP_VERSION, name: APP_NAME } = require('../../package.json');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.appLib = appLib;
    m.nomnomlTemplate = await fs.readFile(path.join(__dirname, '../public/nomnoml/index.html'), 'utf8');
    m.devPagePath = path.join(__dirname, '../../lib/dev-helpers/dev-page.html');

    appLib.addRoute('get', `/er-diagram`, prependDevMiddlewares([m.getErDiagram]));
    appLib.addRoute('get', `/simplified-er-diagram`, prependDevMiddlewares([m.getSimplifiedErDiagram]));
    appLib.addRoute('get', `/data-dictionary`, prependDevMiddlewares([m.getDataDictionary]));

    appLib.addRoute('get', `/dev`, prependDevMiddlewares([m.getDevPage]));
    appLib.addRoute('get', `/clear-cache`, prependDevMiddlewares([m.clearCache]));

    appLib.addRoute('get', '/routes', prependDevMiddlewares([m.getRoutesJson]));
    appLib.addRoute('get', '/version', prependDevMiddlewares([m.version]));
    /**
     * @swagger
     * /routes:
     *   get:
     *     summary: Get info about routes and whether it requires AUTH or not.
     *     description: This route is only available in development mode
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          schema:
     *            type: object
     *            properties:
     *              data:
     *                type: object
     *                properties:
     *                  brief:
     *                    type: array
     *                    items:
     *                      type: string
     *                      example: "GET /is-authenticated AUTH"
     *                  full:
     *                    type: object
     *                    description: contains express info about route
     *              success:
     *                type: boolean
     */
  };

  m.logDevRequest = (req, res, next) => {
    m.appLib.auditLoggers.security({ message: 'Request to development endpoint', req });
    next();
  };

  m.isDevelopmentMode = (req, res, next) => {
    if (m.appLib.config.DEVELOPMENT) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: 'This route is only available in development mode',
    });
  };

  function prependDevMiddlewares(middlewaresArray) {
    return [m.logDevRequest, m.isDevelopmentMode, ...middlewaresArray];
  }

  /**
   * Returns the list of routes this server provides.
   * @param req
   * @param res
   * @param next
   */
  m.getRoutesJson = (req, res) => {
    const routesList = m.appLib.expressUtil.getRoutes(m.appLib.app, m.appLib.auth.isAuthenticated);

    res.json({
      success: true,
      data: { brief: routesList },
    });
  };

  m.version = (req, res) => {
    return res.json({
      'Application Name': `${APP_NAME}`,
      'Application Version': `${APP_VERSION}`,
      'Backend Version': '5.0.0',
    });
  };

  m.clearCache = async (req, res) => {
    await m.appLib.cache.clearCacheByKeyPattern('*');
    res.json({
      success: true,
      message: `Cache is successfully cleared`,
    });
  };

  function getErDiagram(parseOptions) {
    const { appModel, appModelHelpers } = m.appLib;
    const appTitle = _.get(appModel, 'interface.app.title', 'ER Diagram');
    const diagramCode = getDiagramCode(appModel.models, appModelHelpers.Lists, appTitle, parseOptions);
    return m.nomnomlTemplate.replace('{DIAGRAM_CODE}', diagramCode);
  }

  m.getErDiagram = (req, res) => {
    const parseOptions = {
      expandListValues: true,
      expandModelFields: true,
    };
    const htmlWithDiagram = getErDiagram(parseOptions);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(htmlWithDiagram);
    res.end();
  };

  m.getSimplifiedErDiagram = (req, res) => {
    const parseOptions = {
      expandListValues: false,
      expandModelFields: false,
    };
    const htmlWithDiagram = getErDiagram(parseOptions);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(htmlWithDiagram);
    res.end();
  };

  m.getDataDictionary = async (req, res) => {
    const schemeInCsv = await getSchemeInCsv(m.appLib.appModel.models);
    res.writeHead(200, { 'Content-Type': 'text/csv' });
    res.write(schemeInCsv);
    res.end();
  };

  m.getDevPage = async (req, res) => {
    res.sendFile(m.devPagePath);
  };

  return m;
};
