const _ = require('lodash');
const pretty = require('pretty');
const fs = require('fs-extra');
const path = require('path');
const { getDiagramCode } = require('../../lib/dev-helpers/er-diagram');
const { getSchemeInCsv } = require('../../lib/dev-helpers/data-dictionary');
const { getEnvFieldsSchema, getDevEnvInfo } = require('../../config/util');
const { version: APP_VERSION, name: APP_NAME } = require('../../package.json');

module.exports = () => {
  const m = {};

  async function getDevPage() {
    const htmlPath = path.join(__dirname, '../../lib/dev-helpers/dev-page.html');
    const html = await fs.readFile(htmlPath, 'utf-8');
    const { getAppBaseUrl } = m.appLib;
    return html.replace(/__APP_BASE_URL__/g, getAppBaseUrl());
  }

  function getEnvPage() {
    const envRows = [];
    const envFieldsSchema = getEnvFieldsSchema();
    const devEnvInfo = getDevEnvInfo();
    const presentBoolean = (val) => {
      if (val === true) {
        return 'Y';
      }
      if (val === false || _.isNil(val)) {
        return '';
      }
      return val;
    };

    _.each(envFieldsSchema, (val, paramName) => {
      const paramDevEnvInfo = devEnvInfo[paramName] || {};
      const envRow = {
        Name: _.escape(paramName),
        Description: _.escape(val.description) || '',
        'Default value': _.escape(val.default) || '',
        'Current value': _.escape(m.appLib.config[paramName]) || '',
        Type: paramDevEnvInfo.type || 'String',
        Required: presentBoolean(paramDevEnvInfo.required),
        'Requires restart': presentBoolean(val.requiresRestart),
        'Requires logout': presentBoolean(val.requiresLogout),
        'Include with build schema': presentBoolean(val.includeWithBuildSchema),
        'Can be defined in database': presentBoolean(val.canBeDefinedInDatabase),
        'Can be defined in environment': presentBoolean(val.canBeDefinedInEnvironment),
        Synthesizer: val.synthesizer ? _.escape(JSON.stringify(val.synthesizer, null, 2)) : '',
        Validator: val.validate ? _.escape(JSON.stringify(val.validate, null, 2)) : '',
        Group: _.escape(val.group) || '',
      };
      envRows.push(envRow);
    });
    const headers = _.keys(envRows[0]);

    envRows.sort((a, b) => {
      const groupCompare = a.Group.localeCompare(b.Group);
      if (groupCompare !== 0) {
        return groupCompare;
      }
      return a.Name.localeCompare(b.Name);
    });

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Environment</title>
    <style type="text/css">    
      table {
        border-collapse: separate;
        border-spacing: 0;
        border: 1px solid black;
      }
      
      table td, table th {
        border: 1px solid black;
        padding: 4px 6px;
        font-family: helvetica;
        text-align: center;
      }
      
      table thead th {
        background-color: #dadada;
        padding: 3px;
        position: sticky;
        resize: horizontal;
        top: 0;
        z-index: 1;
      }
      
      table>tbody>tr>td:first-child {
        background-color:white;
        resize: horizontal;
        position: sticky;
        left: 0;
        z-index: 1;
      }
      
      table>thead>tr>th:first-child {
        position: sticky;
        left: 0;
        z-index: 2;
      }
      
      table>tbody>tr>td:nth-child(-n+2) {
        text-align: left;
      }
      .Validator-td, .Synthesizer-td {
        min-width: 250px;
      }
    </style>
  </head>
  <body>
    <table class='env-table'>
      <thead> 
        <tr> 
            ${headers.map((h) => `<th>${h}</th>`).join('\n')} 
        </tr> 
      </thead>
      <tbody>
        ${envRows
          .map(
            (r) => `<tr>${_.map(r, (val, columnName) => `<td class="${columnName}-td">${val}</td>`).join('\n')}</tr>`
          )
          .join('\n')}
      </tbody>
    </table>
  </body>
</html>`;
    return pretty(html);
  }

  m.init = async (appLib) => {
    m.appLib = appLib;
    m.nomnomlTemplate = await fs.readFile(path.join(__dirname, '../public/nomnoml/index.html'), 'utf8');
    m.devPageHtml = await getDevPage();
    m.envPageHtml = await getEnvPage();

    appLib.addRoute('get', `/dev`, prependDevMiddlewares([m.getDevPage]));

    appLib.addRoute('get', `/er-diagram`, prependDevMiddlewares([m.getErDiagram]));
    appLib.addRoute('get', `/simplified-er-diagram`, prependDevMiddlewares([m.getSimplifiedErDiagram]));

    appLib.addRoute('get', `/data-dictionary`, prependDevMiddlewares([m.getDataDictionary]));

    appLib.addRoute('get', `/dev`, prependDevMiddlewares([m.getDevPage]));
    appLib.addRoute('get', `/dev/env`, prependDevMiddlewares([m.getEnvPage]));
    appLib.addRoute('get', `/clear-cache`, prependDevMiddlewares([m.clearCache]));
    appLib.addRoute('get', '/version', prependDevMiddlewares([m.version]));
    appLib.addRoute('get', '/routes', prependDevMiddlewares([m.getRoutesJson]));
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

  m.version = (req, res) =>
    res.json({
      'Application Name': `${APP_NAME}`,
      'Application Version': `${APP_VERSION}`,
      'Backend Version': '5.0.0',
    });

  m.clearCache = async (req, res) => {
    await m.appLib.cache.clearCacheByKeyPattern('*');
    res.json({
      success: true,
      message: `Cache is successfully cleared`,
    });
  };

  function getErDiagram(parseOptions) {
    const { appModel, appModelHelpers, getResourceBaseUrl } = m.appLib;
    const appTitle = _.get(appModel, 'interface.app.title', 'ER Diagram');
    const diagramCode = getDiagramCode(appModel.models, appModelHelpers.Lists, appTitle, parseOptions);
    const html = m.nomnomlTemplate.replace('{DIAGRAM_CODE}', diagramCode);

    return html.replace('__RESOURCE_BASE_URL__', getResourceBaseUrl());
  }

  m.getErDiagram = (req, res) => {
    const parseOptions = {
      expandListValues: true,
      expandModelFields: true,
    };
    const erDiagramHtml = getErDiagram(parseOptions);
    res.setHeader('Content-Type', 'text/html');
    res.send(erDiagramHtml);
  };

  m.getSimplifiedErDiagram = (req, res) => {
    const parseOptions = {
      expandListValues: false,
      expandModelFields: false,
    };
    const simplifiedErDiagramHtml = getErDiagram(parseOptions);
    res.setHeader('Content-Type', 'text/html');
    res.send(simplifiedErDiagramHtml);
  };

  m.getDataDictionary = async (req, res) => {
    const schemeInCsv = await getSchemeInCsv(m.appLib.appModel.models);
    res.setHeader('Content-Type', 'text/csv');
    res.send(schemeInCsv);
  };

  m.getDevPage = async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(m.devPageHtml);
  };

  m.getEnvPage = async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(m.envPageHtml);
  };

  return m;
};
