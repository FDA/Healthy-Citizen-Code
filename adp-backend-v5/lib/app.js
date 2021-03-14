const Promise = require('bluebird');

const express = require('express');
const ms = require('ms');
const http = require('http');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const device = require('express-device');
const nodePath = require('path');
const _ = require('lodash');
const pEvent = require('p-event');
const { MigrateMongo } = require('migrate-mongo');
const log4js = require('log4js');
const JSON5 = require('json5');
const expressSession = require('express-session');
const RedisStore = require('connect-redis')(expressSession);

const getMigrateConfig = require('../migrate/config.js');
const { serveDirs } = require('./public-files-controller');
const { version: APP_VERSION, name: APP_NAME } = require('../package.json');
const { prepareEnv, getSchemaNestedPaths } = require('./util/env');
const { globSyncAsciiOrder } = require('./util/glob');
const connectSwagger = require('./swagger');
const { appRoot, getSchemaPaths } = require('./util/env');
const { requestLogMiddleware } = require('./util/audit-log');
const { mongoConnect } = require('./util/mongo');
const { getRedisConnection } = require('./util/redis');
const { cookieOpts } = require('./util/cookie');
const { asyncLocalStorage } = require('./async-local-storage');

module.exports = () => {
  const m = {};
  let options = {}; // options for whole module (empty by default)

  m.errors = require('./errors');
  m.butil = require('./util/util');
  m.expressUtil = require('./express-util');
  m.accessCfg = require('./access/access-config');
  m.elasticSearch = require('./elastic-search');
  m.cache = require('./cache')({
    redisUrl: process.env.REDIS_URL,
    keyPrefix: process.env.REDIS_KEY_PREFIX,
  });
  m.queue = require('./queue')({
    redisUrl: process.env.BULL_REDIS_URL || process.env.REDIS_URL,
    keyPrefix: process.env.BULL_KEY_PREFIX || process.env.REDIS_KEY_PREFIX,
  });

  m.API_PREFIX = process.env.API_PREFIX || '';
  m.RESOURCE_PREFIX = process.env.RESOURCE_PREFIX || '';

  m.getAuthSettings = () => m.appModel.interface.app.auth;

  /**
   * Connects to DB and sets various DB parameters
   */
  m.connectAppDb = async () => {
    try {
      return await mongoConnect(process.env.MONGODB_URI);
    } catch (e) {
      m.log.error(
        `LAP003: MongoDB connection error. Please make sure MongoDB is running at ${process.env.MONGODB_URI}`
      );
      throw e;
    }
  };

  const procUncaughtExListener = (err) => {
    m.log.error(`LAP004: Uncaught node exception`, err.stack);
  };

  m.errorLogger = (err, req, res, next) => {
    let errMsg = 'Error: ';
    if (_.isString(err)) {
      errMsg += err;
    } else {
      errMsg += _.get(err, 'stack', _.get(err, 'message', err));
    }
    m.expressLog.error(`${req.method} ${req.url} -> ${res.statusCode} ${errMsg}`);
  };

  m.configureApp = async (app) => {
    m.app = app;
    // remove exposing server info
    app.disable('x-powered-by');

    // Running an Express app behind a proxy. If true, the req.ip is the left-most entry in the X-Forwarded-* header.
    app.set('trust proxy', true);

    app.on('uncaughtException', (req, res, route, err) => {
      m.log.error(`LAP001: Uncaught exception`, err.stack);
      res.status(500).json({ success: false, code: 'LAP001', message: `${err}` });
    });
    app.on('InternalServer', (req, res, route, err) => {
      m.log.error(`LAP002: Internal server error`, err.stack);
      res.status(500).json({ success: false, code: 'LAP002', message: `${err}` });
    });
    app.on('InternalServerError', (req, res, route, err) => {
      m.log.error(`LAP003: Internal server error`, err.stack);
      res.status(500).json({ success: false, code: 'LAP003', message: `${err}` });
    });
    process.on('uncaughtException', procUncaughtExListener);

    const { COOKIE_SECRET, USER_SESSION_ID_TIMEOUT = '1d', REDIS_URL, REDIS_KEY_PREFIX } = process.env;

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json({ limit: '100mb' }));
    app.use(compression());
    app.use(device.capture());
    app.use(cookieParser(COOKIE_SECRET));
    app.use(require('request-received'));
    app.use(require('response-time')());
    app.use(require('express-request-id')());

    const expressSessionOpts = {
      secret: COOKIE_SECRET,
      resave: false,
      saveUninitialized: true,
      rolling: true, // reset maxAge on every request
      cookie: { ...cookieOpts, maxAge: ms(USER_SESSION_ID_TIMEOUT), httpOnly: true },
    };
    if (REDIS_URL) {
      const redisConnection = await getRedisConnection({
        redisUrl: REDIS_URL,
        log: m.log,
        redisConnectionName: 'Session_Redis',
      });
      expressSessionOpts.store = new RedisStore({ client: redisConnection, prefix: `${REDIS_KEY_PREFIX}_sessions_` });
    }
    const sessionMiddleware = expressSession(expressSessionOpts);
    app.use((req, res, next) => {
      if (req.method === 'OPTIONS') {
        // Exclude options (preflight) requests which do not contain cookies thus a new sessionID is created on every such request
        return next();
      }
      return sessionMiddleware(req, res, next);
    });

    const alsMiddleware = (req, res, next) => {
      asyncLocalStorage.run({}, () => {
        const store = asyncLocalStorage.getStore();
        store.clientIp = req.ip;
        store.requestId = req.id;
        store.sessionId = req.sessionID;
        next();
      });
    };
    app.use(alsMiddleware);

    const maxResponseBodySize = parseInt(process.env.AUDIT_LOG_MAX_RESPONSE_SIZE, 10) || 10000;
    app.use(
      requestLogMiddleware({
        appLogger: m.expressLog,
        persistLogger: m.auditPersistLogger,
        opts: {
          isLogOptionsRequests: false,
          maxResponseBodySize,
        },
      })
    );
    app.use(
      fileUpload({
        useTempFiles: true,
        tempFileDir: '/tmp/',
      })
    );

    const corsOrigins = process.env.CORS_ORIGIN
      ? [RegExp(process.env.CORS_ORIGIN)]
      : [/https:\/\/.+\.conceptant\.com/, /http:\/\/localhost\.conceptant\.com.*/, /http:\/\/localhost.*/];
    app.use(
      cors({
        origin: corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['API-Token', 'Authorization', 'Content-Type', 'Accept'],
        exposedHeaders: ['API-Token-Expiry'],
        credentials: true,
        maxAge: 5,
      })
    );

    const responseBodyMiddleware = (req, res, next) => {
      const defaultWrite = res.write;
      const defaultEnd = res.end;
      const chunks = [];

      res.write = (...restArgs) => {
        chunks.push(Buffer.from(restArgs[0]));
        defaultWrite.apply(res, restArgs);
      };

      res.end = (...restArgs) => {
        if (restArgs[0]) {
          chunks.push(Buffer.from(restArgs[0]));
        }
        res.body = Buffer.concat(chunks).toString('utf8');

        defaultEnd.apply(res, restArgs);
      };

      next();
    };

    app.use(responseBodyMiddleware);
  };

  m.getFullRoute = (routePrefix, route) => {
    return routePrefix ? `${routePrefix}${route}` : route;
  };

  /**
   * Adds routes to the application router
   * @param verb i.e. get, post, put etc
   * @param route the route to add (as a string)
   * @param args array of controller functions to handle route
   */
  function addRoute(verb, routePrefix, route, args) {
    const fullRoute = m.getFullRoute(routePrefix, route);

    const methodNames = {
      get: 'get',
      put: 'put',
      post: 'post',
      del: 'delete',
      use: 'use',
    };
    const method = methodNames[verb];
    const removedRoutes = m.expressUtil.removeRoutes(m.app, fullRoute, method);
    // args.unshift(m.isAuthenticated);
    args.unshift(fullRoute);
    m.app[method](...args, m.errorLogger);

    const action = _.isEmpty(removedRoutes) ? 'Added' : 'Replaced';
    const authRouteNote = _.includes(args, m.isAuthenticated) ? 'AUTH' : '';
    m.log.trace(` ∟ ${action} route: ${method.toUpperCase()} ${fullRoute} ${authRouteNote}`);
  }

  m.addRoute = (verb, route, args) => {
    return addRoute(verb, m.API_PREFIX, route, args);
  };

  m.addResourceRoute = (verb, route, args) => {
    return addRoute(verb, m.RESOURCE_PREFIX, route, args);
  };

  /**
   * Adds routes necessary to perform full CRUD on the global.appModel
   */
  m.addAppModelRoutes = () => {
    _.each(m.appModel.models, (schema, schemaName) => {
      m.log.debug('Adding routes for schema', schemaName);
      addCrudRoutesToSchema(schemaName, schema, []);
      addRelatedRoutesToSchema(schemaName, schema, []);
    });

    /**
     * This adds routes to the express app to handle CRUD for a specific schema
     * NOTE: unlike lookup method this method is not checking for existing routes
     * @param name the name of the schema
     * @param schema the schema definition
     * @param path the full path to the schema (as array)
     */
    function addCrudRoutesToSchema(name, schema, path) {
      const mainController = m.controllers.main;

      const callbacks = [];
      callbacks.push(m.isAuthenticated);
      // add standard CRUD
      // let name = pluralize(name, 2);
      const qualifiedPath = `/${_.map(path, (p) => `${p}/:${p}_id`).join('/') + (path.length === 0 ? '' : '/')}`;
      const unqualifiedPath = `/schema/${path.join('/') + (path.length === 0 ? '' : '/')}`;
      m.addRoute('get', `${unqualifiedPath}${name}`, [mainController.getSchema]); // this just returns schema, no auth is required
      m.addRoute('get', `${qualifiedPath}${name}`, callbacks.concat([mainController.getItems]));
      m.addRoute('post', `${qualifiedPath}${name}`, callbacks.concat([mainController.postItem]));
      m.addRoute('get', `${qualifiedPath}${name}/:id`, callbacks.concat([mainController.getItem]));
      m.addRoute('put', `${qualifiedPath}${name}/:id`, callbacks.concat([mainController.putItem]));
      m.addRoute('del', `${qualifiedPath}${name}/:id`, callbacks.concat([mainController.deleteItem]));
      /* delete this code once frontend is fixed and start sending data in correct form: ADP-134
      if(schema.singleRecord) { // duplicate all endpoints for single-record pages without need to specify :id
          m.addRoute('get', `${qualifiedPath}${name}`, callbacks.concat([mainController.getItem]));
          m.addRoute('put', `${qualifiedPath}${name}`, callbacks.concat([mainController.putItem]));
          m.addRoute('del', `${qualifiedPath}${name}`, callbacks.concat([mainController.deleteItem]));
      }
      */
    }

    /**
     * Adds routes related to schema (lookups, treeselectors)
     * @param objName
     * @param obj
     * @param path
     */
    function addRelatedRoutesToSchema(objName, obj, path) {
      const mainController = m.controllers.main;

      const { type, fields } = obj;
      if (type === 'LookupObjectID' || type === 'LookupObjectID[]') {
        const { lookup } = obj;
        const lookupId = lookup.id;
        m.appLookups[lookupId] = lookup;
        m.log.debug(`☞ Adding routes for lookup ${path.join('.')}.${objName}`);
        addLookupRoutes(lookup, lookupId);
      }

      if (type === 'TreeSelector') {
        const { table } = obj;
        const treeSelectorId = table.id;
        m.appTreeSelectors[treeSelectorId] = table;
        m.log.debug(`☞ Adding routes for TreeSelector ${path.join('.')}.${objName}`);
        addTreeSelectorRoutes(table, treeSelectorId);
      }

      if (_.isPlainObject(fields)) {
        _.each(fields, (field, fieldName) => {
          addRelatedRoutesToSchema(fieldName, field, path.concat([objName]));
        });
      }

      /** Adds route to the app so it can run lookups using UI elements such as select2
       * The request should contain Get parameter q=<search> to perform the search and
       * optionally page=<number> parameter to show results in infinity scroll as
       * specified in the select2 documentation
       * @param lookup
       * @param lookupId
       */
      function addLookupRoutes(lookup, lookupId) {
        _.forEach(lookup.table, (tableLookup) => {
          const isFilteringLookup = tableLookup.where;
          const tableName = tableLookup.table;
          const lookupPath = `/lookups/${lookupId}/${tableName}`;
          const fullLookupPath = m.getFullRoute(m.API_PREFIX, lookupPath);
          if (!isFilteringLookup && _.isEmpty(m.expressUtil.findRoutes(m.app, fullLookupPath, 'get'))) {
            m.addRoute('get', lookupPath, [m.isAuthenticated, mainController.getLookupTable]);
          }
          if (isFilteringLookup && _.isEmpty(m.expressUtil.findRoutes(m.app, fullLookupPath, 'post'))) {
            m.addRoute('post', lookupPath, [m.isAuthenticated, mainController.getLookupTable]);
          }
        });
      }

      function addTreeSelectorRoutes(table, treeSelectorId) {
        _.forEach(table, (tableSpec, tableName) => {
          if (tableName === 'id') {
            return;
          }
          const isFilteringLookup = tableSpec.where;
          const treeSelectorPath = `/treeselectors/${treeSelectorId}/${tableName}`;
          const fullTreeSelectorPath = m.getFullRoute(m.API_PREFIX, `/treeselectors/${treeSelectorId}/${tableName}`);
          if (!isFilteringLookup && _.isEmpty(m.expressUtil.findRoutes(m.app, fullTreeSelectorPath, 'get'))) {
            m.addRoute('get', treeSelectorPath, [m.isAuthenticated, mainController.getTreeSelector]);
          }
          if (isFilteringLookup && _.isEmpty(m.expressUtil.findRoutes(m.app, fullTreeSelectorPath, 'post'))) {
            m.addRoute('post', treeSelectorPath, [m.isAuthenticated, mainController.getTreeSelector]);
          }
        });
      }
    }
  };

  // TODO: delete after mobile app refactoring, only required for mobile app framework backward compatibility
  m.addDashboardEndpoints = () => {
    m.addRoute('get', '/dashboards/:id', [m.isAuthenticated, m.controllers.main.getDashboardJson]);
  };

  m.loadControllers = async () => {
    m.log.trace('Loading custom controllers:');
    try {
      const appSchemaControllersFiles = _.flatten(
        getSchemaNestedPaths('server_controllers/**/*.js').map((pattern) => globSyncAsciiOrder(pattern))
      );
      const coreControllers = globSyncAsciiOrder(`${appRoot}/model/server_controllers/**/*.js`);
      const files = [...coreControllers, ...appSchemaControllersFiles];
      return await Promise.mapSeries(files, (file) => {
        m.log.trace(` ∟ ${file}`);
        const lib = require(file)(m);
        return lib.init(m);
      });
    } catch (e) {
      m.log.error(`Unable to load custom controllers`, e.stack);
      process.exit(2);
    }
  };

  m.removeAllRoutes = () => {
    _.forEach(m.app.router.mounts, (mount) => {
      m.app.rm(mount.name);
    });
  };

  m.addRoutes = async () => {
    const mainController = m.controllers.main;
    const { fileController } = m;

    // development and system endpoints
    m.addRoute('get', '/', [mainController.getRootJson]);
    /**
     * @swagger
     * /:
     *   get:
     *     summary: Get info about the server
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *         description: "Field 'message' contains backend server version"
     */

    // m.addRoute('get', /\/helpers\/?.*/, [express.serveStatic({directory: `${process.env.APP_MODEL_DIR}/model`})]);

    m.addRoute('get', '/metaschema', [mainController.getMetaschemaJson]);
    /**
     * @swagger
     * /reload-model:
     *   get:
     *     summary: Returns all schemas in the app model
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/schemas', [mainController.getSchemasJson]);
    /**
     * @swagger
     * /schemas:
     *   get:
     *     summary: Returns all schemas in the app model
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    /**
     * Returns app model which is necessary to prebuild frontend.
     * Unlike /app-model it responses with basic model even if jwt token is not provided.
     */
    m.addRoute('get', '/build-app-model', [mainController.getBuildAppModelJson]);

    m.addRoute('get', '/app-model', [m.isAuthenticated, mainController.getAppModelJson]);
    /**
     * @swagger
     * /app-model:
     *   get:
     *     summary: Returns full application model.
     *     description: Checks AUTH. Returns cut model for unauthorized user.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/lists', [mainController.getListsJson]);
    /**
     * @swagger
     * /lists:
     *   get:
     *     summary: Returns all lists.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/typeDefaults', [mainController.getTypeDefaults]);
    /**
     * @swagger
     * /typeDefaults:
     *   get:
     *     summary: Returns all type defaults.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/app-model-code.js', [mainController.getAppModelCode]);
    /**
     * @swagger
     * /app-model-code.js:
     *   get:
     *     summary: Returns string representing all code for application.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/app-model-code.min.js', [mainController.getMinifiedAppModelCode]);
    /**
     * @swagger
     * /app-model-code.min.js:
     *   get:
     *     summary: Returns string representing minified version of all code for application.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/interface', [mainController.getInterfaceJson]);
    /**
     * @swagger
     * /interface:
     *   get:
     *     summary: Returns the interface definition (including sidebars, menus, dashboards etc)
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/interface/dashboard-subtypes', [mainController.getDashboardSubtypesJson]);
    /**
     * @swagger
     * /interface/dashboard-subtypes:
     *   get:
     *     summary: Returns the interface dashboard subtypes
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/is-authenticated', [m.isAuthenticated, mainController.getIsAuthenticated]);
    /**
     * @swagger
     * /is-authenticated:
     *   get:
     *     summary: Returns whether user is authenticated or not
     *     tags:
     *       - Auth
     *     responses:
     *       200:
     *         description: Authorized
     *       401:
     *         description: Not authorized
     *       500:
     *         description: Server error occurred during authentication process
     */

    m.addResourceRoute('use', '/public', [
      serveDirs([...getSchemaNestedPaths('/public'), './model/public'], {
        fileMatcher: ({ accessType, relativePath }) => {
          if (accessType === 'directory') {
            return relativePath.startsWith('/js/client-modules');
          }
          return true;
        },
      }),
    ]);

    m.addRoute('post', '/upload', [fileController.upload]);
    /**
     * @swagger
     * /upload:
     *   post:
     *     summary: Uploads multiple files
     *     description: Does not check AUTH.
     *     tags:
     *       - File
     *     parameters:
     *       in: 'body'
     *       name: files
     *       description: files to upload
     *       required: true
     *     responses:
     *       200:
     *         schema:
     *           type: object
     *           properties:
     *             data:
     *               type: object
     *               description: Uploaded files
     *             success:
     *               type: boolean
     */

    m.addRoute('get', '/file/:id', [fileController.getFile]);
    /**
     * @swagger
     * /file/{id}:
     *   get:
     *     summary: Gets inline file by id
     *     description: Does not check AUTH.
     *     tags:
     *       - File
     *     parameters:
     *       - in: 'path'
     *         name: 'id'
     *         required: true
     *         type: 'string'
     *     produces:
     *       - image/png
     *       - image/gif
     *       - image/jpeg
     *       - image/bmp
     *     responses:
     *       200:
     */

    m.addRoute('get', '/file-cropped/:id', [fileController.getFileCropped]);
    /**
     * @swagger
     * /file-cropped/{id}:
     *   get:
     *     summary: Gets cropped image by file id
     *     description: Does not check AUTH.
     *     tags:
     *       - File
     *     parameters:
     *       - in: 'path'
     *         name: 'id'
     *         required: true
     *         type: 'string'
     *     produces:
     *       - image/png
     *       - image/gif
     *       - image/jpeg
     *       - image/bmp
     *     responses:
     *       200:
     */

    m.addRoute('get', '/file-thumbnail/:id', [fileController.getFileThumbnail]);
    /**
     * @swagger
     * /file-thumbnail/{id}:
     *   get:
     *     summary: Gets image thumbnail by file id
     *     description: Does not check AUTH.
     *     tags:
     *       - File
     *     parameters:
     *       - in: 'path'
     *         name: 'id'
     *         required: true
     *         type: 'string'
     *     produces:
     *       - image/png
     *       - image/gif
     *       - image/jpeg
     *     responses:
     *       200:
     */

    m.addRoute('get', '/download/:id', [fileController.getFile]);
    /**
     * @swagger
     * /download/{id}:
     *   get:
     *     summary: Gets file by id as attachment
     *     description: Does not check AUTH.
     *     tags:
     *       - File
     *     parameters:
     *       - in: 'path'
     *         name: 'id'
     *         required: true
     *         type: 'string'
     *     responses:
     *       200:
     *         schema:
     *           type: object
     *           properties:
     *             data:
     *               type: object
     *               description: Uploaded files
     *             success:
     *               type: boolean
     */

    // endpoints for all models
    m.addAppModelRoutes();
    m.addDashboardEndpoints(); // TODO: remove this after mobile update

    const { addAll, connect } = m.graphQl;
    await addAll();

    await m.loadControllers();

    m.log.trace('Connecting GraphQL');
    connect.connectGraphqlWithAltair();

    m.log.trace('Connecting Swagger');
    connectSwagger(m);
  };

  m.addErrorHandlers = () => {
    m.app.use((req, res) => {
      if (!res.headersSent) {
        const message = `${req.path} does not exist`;
        m.log.error(message);
        res.status(404).json({ success: false, message });
      }
    });

    m.app.use((error, req, res, next) => {
      if (!res.headersSent) {
        const { type, statusCode, stack, body } = error;
        m.log.error(
          `Error type: '${type}', statusCode: ${statusCode},${body ? `\nbody: ${body}\n` : ''} stack: ${stack}`
        );
        res.status(500).json(error.message || 'Internal Server Error');
      }
    });
  };

  m.setOptions = (opts) => {
    options = opts;
  };

  m.migrateMongo = async function () {
    const migrateMongo = new MigrateMongo(getMigrateConfig());
    const db = await migrateMongo.database.connect();
    await migrateMongo.up(db);
    await db.close();
  };

  async function cacheRolesToPermissions() {
    if (m.cache) {
      // set rolesToPermissions on startup to rewrite old cache
      const rolesToPermissions = await m.accessUtil.getRolesToPermissions();
      await m.cache.setCache(m.cache.keys.rolesToPermissions(), rolesToPermissions);
      m.log.info('Loaded rolesToPermissions: ', JSON.stringify(rolesToPermissions, null, 2));
    }
  }

  function setInitProperties() {
    m.transformers = require('./transformers')(m);
    m.hooks = require('./hooks')(m);
    m.validation = require('./validation')(m);
    m.filterUtil = require('./filter/util');
    m.filterParser = require('./filter/filter-parser')(m);

    m.accessUtil = require('./access/access-util')(m);
    m.dba = require('./database-abstraction')(m);
    m.mutil = require('./model')(m);

    m.graphQl = require('./graphql')(m, '/graphql', '/altair');
    m.requestContexts = require('./request-context');

    m.googleMapsClient = require('./google-maps');

    m.backgroundJobs = require('./queue/background-jobs');

    /** Reference to the express application */
    m.app = null;

    /** Db connection */
    m.db = null;
  }

  function setControllerProperties() {
    m.controllers = {};
    m.controllerUtil = require('./default-controller-util')(m);
    m.controllers.main = require('./default-controller')(m);
    m.fileController = require('./file-controller')(m);
    m.fileControllerUtil = require('./file-controller-util')(m.db);
  }

  function addMongoHooks() {
    const { keys, clearCacheByKeyPattern } = m.cache;
    const usersWithPermissionsKeyPattern = `${keys.usersWithPermissions()}:*`;
    const rolesToPermissionsKey = keys.rolesToPermissions();

    m.db.collection('roles').after('write', function (/* { args, method, result } */) {
      clearCacheByKeyPattern(usersWithPermissionsKeyPattern);
      clearCacheByKeyPattern(rolesToPermissionsKey);
    });
    m.db.collection('users').after('write', function (/* { args, method, result } */) {
      clearCacheByKeyPattern(usersWithPermissionsKeyPattern);
      clearCacheByKeyPattern(rolesToPermissionsKey);
    });
  }

  function configureLog4js() {
    const log4jsConfig = {
      appenders: { out: { type: 'stdout' } },
      categories: { default: { appenders: ['out'], level: 'OFF' } },
    };
    try {
      const log4jsConfigContent = process.env.LOG4JS_CONFIG ? fs.readFileSync(process.env.LOG4JS_CONFIG, 'utf8') : '{}';
      _.merge(log4jsConfig, JSON5.parse(log4jsConfigContent));
    } catch (e) {
      console.error(`Unable to read log4js config by path '${process.env.LOG4JS_CONFIG}'`);
      throw e;
    }

    const mongoDbAppender = require('./util/log4js-mongodb-appender')({
      connectionString: process.env.LOG_DB_URI,
      collectionName: process.env.LOG_DB_COLLECTION,
    });

    const isLogAuditEnabled = process.env.LOG_AUDIT === 'true';
    _.set(log4jsConfig, 'appenders.audit', { type: mongoDbAppender });
    _.set(log4jsConfig, 'categories.audit', {
      appenders: ['audit'],
      level: isLogAuditEnabled ? 'trace' : 'off',
    });

    log4js.configure(log4jsConfig);

    m.log = log4js.getLogger('lib/app');
    m.auditPersistLogger = log4js.getLogger('audit');
    m.expressLog = log4js.getLogger('express');
    m.dbAppLogger = log4js.getLogger('db');
  }

  /**
   * App setup, configures everything but doesn't start the app
   * For tests just setup the app
   * For the actual server also call app.start();
   */
  m.setup = async () => {
    prepareEnv(appRoot);
    configureLog4js();

    if (!process.env.APP_SCHEMA) {
      m.log.warn(`Env APP_SCHEMA not specified. Proceeding with built-in models only.`);
    }

    const nonExistingSchemaPaths = getSchemaPaths()
      .map((p) => (fs.existsSync(p) ? null : p))
      .filter((p) => p);
    if (!_.isEmpty(nonExistingSchemaPaths)) {
      m.log.warn(`Found non-existing schema paths: ${nonExistingSchemaPaths.join(', ')}. Check your .env file.`);
    }

    // mongo-wrapper patches mongodb so calling require('mongodb') will get patched version in any other place
    require('./mongo-wrapper')({
      appLogger: m.dbAppLogger,
      persistLogger: m.auditPersistLogger,
      logCollectionName: process.env.LOG_DB_COLLECTION,
    });

    setInitProperties();

    const { db, connection } = await m.connectAppDb();
    m.db = db;
    m.connection = connection;
    addMongoHooks();

    m.isMongoSupportsSessions = m.butil.isMongoSupportsSessions(m.db);

    await m.cache.init();
    await m.cache.clearCacheByKeyPattern('*'); // clear all keys on startup
    await m.queue.init();
    await m.migrateMongo();

    // use to exclude it from /app-model
    m.datasetModelNames = new Set();

    const coreModelPath = nodePath.resolve(__dirname, '../model');
    const helperDirPaths = [`${coreModelPath}/helpers`, ...getSchemaNestedPaths('helpers')];
    const buildAppModelCodeOnStart = (process.env.BUILD_APP_MODEL_CODE_ON_START || 'true') === 'true';
    m.helperUtil = await require('./helper-util')(m, helperDirPaths, buildAppModelCodeOnStart);
    m.allActionsNames = [...m.accessCfg.DEFAULT_ACTIONS, ..._.keys(m.appModelHelpers.CustomActions)];

    const { model, macrosFunctionContext } = await m.mutil.getCombinedModel({
      appModelSources: options.appModelSources,
      appModelProcessors: m.appModelHelpers.appModelProcessors,
      macrosDirPaths: [...getSchemaNestedPaths('macros'), `${coreModelPath}/macros`],
    });
    m.appModel = model;
    m.macrosFunctionContext = macrosFunctionContext;

    const { errors, warnings } = m.mutil.validateAndCleanupAppModel(m.appModel.models);
    if (warnings.length) {
      const warningsList = warnings.map((w, index) => `${index + 1}) ${w}`).join('\n');
      m.log.warn(`Warnings during model building:\n${warningsList}`);
    }
    if (errors.length) {
      throw new Error(errors.join('\n'));
    }

    await m.mutil.handleIndexes();
    await cacheRolesToPermissions();

    m.log.info('Executing prestart scripts...');
    await m.executePrestartScripts();
    m.log.info('Finished executing prestart scripts.');

    m.auth = require('./auth')(m);

    m.appModel.interface.app.isInactivityLogoutEnabled = m.auth.isInactivityLogoutEnabled;
    m.appModel.interface.app.inactivityLogoutNotificationAppearsFromSessionEnd =
      m.auth.inactivityLogoutNotificationAppearsFromSessionEnd;
    m.isAuthenticated = m.auth.isAuthenticated;
    m.authenticationCheck = m.auth.authenticationCheck;

    const esConfig = m.elasticSearch.getEsConfig();
    if (esConfig) {
      m.log.info('Starting real-time Mongo-ES sync...');
      const mongoUrl = process.env.MONGODB_URI;
      await m.elasticSearch.startRealTimeSync(m.isMongoSupportsSessions, m.appModel.models, mongoUrl, esConfig, true);
    }

    const app = express();
    await m.configureApp(app);
    m.auth.addUserAuthentication(app);

    // build baseAppModel once to reuse it in models responses for specific users
    m.baseAppModel = m.accessUtil.getBaseAppModel();

    setControllerProperties();

    // define m.ws before loading model controllers, since it's allowed to add own ws events inside them
    m.ws = require('./real-time')({
      appLib: m,
      redisUrl: process.env.SOCKETIO_REDIS_URL || process.env.REDIS_URL,
      keyPrefix: process.env.SOCKETIO_KEY_PREFIX || process.env.REDIS_KEY_PREFIX,
    });

    await m.addRoutes();
    m.addErrorHandlers();

    // create server with ready express app
    m.server = http.createServer(app);
    // build ws server with ready http instance and ws events from model controllers
    await m.ws.build(m.server);

    m.log.info(`${APP_NAME} Backend v${APP_VERSION} is running`);
    return m;
  };

  m.executePrestartScripts = () => {
    /** scriptMap contains possible scripts to execute before app start */
    const scriptMap = {};
    // normalizeObjectIdLookups is no longer used
    // scriptMap.normalizeObjectIdLookups = () => m.controllerUtil.normalizeLookupObjectIds();

    const promises = [];
    _.each(m.appModel.interface.app.preStart, (val, scriptName) => {
      const scriptFunc = scriptMap[scriptName];
      if (val === true && scriptFunc) {
        promises.push(scriptFunc());
      }
    });
    return Promise.all(promises);
  };

  /**
   * Starts the application. It's been extracted into a separate routine to make testing possible.
   */
  m.start = () => {
    m.httpInstance = m.server.listen(process.env.APP_PORT);
    m.log.info('App is listening on port', process.env.APP_PORT);
    m.auditPersistLogger.info({
      type: 'system',
      message: 'System backend is running',
      timestamp: new Date(),
    });
  };

  m.shutdown = () => {
    return Promise.all([getCloseAppPromise(), m.db.close().then(() => m.log.trace('Closed mongo connection'))]);

    async function getCloseAppPromise() {
      process.removeListener('uncaughtException', procUncaughtExListener);
      if (!m.httpInstance) {
        return;
      }
      m.httpInstance.close(() => {
        m.log.trace('Closed app');
      });
      return pEvent(m.httpInstance, 'close');
    }
  };

  return m;
};
