const Promise = require('bluebird');

const express = require('express');
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
const onFinished = require('on-finished');
const { getHttpAuditMiddleware, getAuditLoggers } = require('./util/audit-log');
const { getOrderedList } = require('./util/util');
const { responseTime } = require('./util/middlewares/response-time');

const { getSchemaNestedPaths, appRoot, getConfigFromDb, prepareEnvironmentSchema } = require('../config/util');
const { asyncLocalStorage } = require('./async-local-storage');

module.exports = () => {
  const m = {};
  m.options = {}; // options for whole module (empty by default)

  m.getAuthSettings = () => m.appModel.interface.app.auth;

  /**
   * Connects to DB and sets various DB parameters
   */
  m.connectAppDb = async () => {
    const { MONGODB_URI } = m.config;
    const { mongoConnect } = require('./util/mongo');
    try {
      return await mongoConnect(MONGODB_URI, { log: m.log });
    } catch (e) {
      m.log.error(`LAP003: MongoDB connection error. Please make sure MongoDB is running at ${MONGODB_URI}`);
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

    app.use(require('express-request-id')());
    app.use(responseTime());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json({ limit: '100mb' }));
    app.use(compression());
    app.use(device.capture());
    app.use(cookieParser(m.config.COOKIE_SECRET));

    const { getCookieOpts, sessionCookieName } = require('./util/cookie');
    const cookieOpts = getCookieOpts(m.config);
    const expressSessionOpts = {
      secret: m.config.COOKIE_SECRET,
      name: sessionCookieName,
      resave: false,
      saveUninitialized: true,
      rolling: true, // reset maxAge on every request
      cookie: { ...cookieOpts, maxAge: m.config.USER_SESSION_ID_TIMEOUT, httpOnly: true },
    };
    const { SESSIONS_REDIS_URL, SESSIONS_KEY_PREFIX } = m.config;
    if (SESSIONS_REDIS_URL) {
      const { getRedisConnection, getRedisPrefix } = require('./util/redis');
      const redisConnection = await getRedisConnection({
        redisUrl: SESSIONS_REDIS_URL,
        log: m.log,
        redisConnectionName: 'Session_Redis',
      });
      expressSessionOpts.store = new RedisStore({
        client: redisConnection,
        prefix: getRedisPrefix(SESSIONS_KEY_PREFIX),
      });
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

    app.use((req, res, next) => {
      onFinished(res, (err) => {
        if (err) {
          return m.log.error(err);
        }
        m.auditLoggers.http({ req, res });
      });

      return next();
    });
    app.use(
      fileUpload({
        useTempFiles: true,
        tempFileDir: '/tmp/',
      })
    );

    app.use(
      cors({
        origin: m.config.CORS_ORIGIN,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['API-Token', 'Authorization', 'Content-Type', 'Accept'],
        exposedHeaders: ['API-Token-Expiry'],
        credentials: true,
        maxAge: 5,
      })
    );

    const httpAuditMiddleware = getHttpAuditMiddleware(m.config);
    app.use(httpAuditMiddleware);
  };

  m.getFullRoute = (routePrefix, route) => (routePrefix ? `${routePrefix}${route}` : route);

  /**
   * Adds routes to the application router
   * @param verb i.e. get, post, put etc
   * @param routePrefix
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

  function endWithSlash(str) {
    return str.endsWith('/') ? str : `${str}/`;
  }
  m.addRoute = (verb, route, args) => addRoute(verb, m.config.API_PREFIX, route, args);
  m.getApiBaseUrl = (endSlash = true) => {
    const { API_URL, API_PREFIX } = m.config;
    const url = `${API_URL}${API_PREFIX}`;
    return endSlash ? endWithSlash(url) : url;
  };

  // Used for pages served by backend
  m.addAppRoute = (verb, route, args) => addRoute(verb, `${m.config.APP_SUFFIX}${m.config.API_PREFIX}`, route, args);
  m.getAppBaseUrl = (endSlash = true) => {
    const { API_URL, APP_SUFFIX, API_PREFIX } = m.config;
    const url = `${API_URL}${APP_SUFFIX}${API_PREFIX}`;
    return endSlash ? endWithSlash(url) : url;
  };

  m.addResourceRoute = (verb, route, args) => addRoute(verb, m.config.RESOURCE_PREFIX, route, args);
  m.getResourceBaseUrl = (endSlash = true) => {
    const { API_URL, APP_SUFFIX, RESOURCE_PREFIX } = m.config;
    const url = `${API_URL}${APP_SUFFIX}${RESOURCE_PREFIX}`;
    return endSlash ? endWithSlash(url) : url;
  };

  // TODO: delete after mobile app refactoring, only required for mobile app framework backward compatibility
  m.addDashboardEndpoints = () => {
    m.addRoute('get', '/dashboards/:id', [m.isAuthenticated, m.controllers.main.getDashboardJson]);
  };

  m.loadControllers = async () => {
    const { globSyncAsciiOrder } = require('./util/glob');

    m.log.trace('Loading custom controllers:');
    try {
      const appSchemaControllersFiles = _.flatten(
        getSchemaNestedPaths(m.config.APP_SCHEMA, 'server_controllers/**/*.js').map((pattern) =>
          globSyncAsciiOrder(pattern)
        )
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
    const { controller: fileController } = m.file;

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

    const { serveDirs } = require('./public-files-controller');
    m.addResourceRoute('use', '/public', [
      serveDirs([...getSchemaNestedPaths(m.config.APP_SCHEMA, '/public'), './model/public'], {
        fileMatcher: ({ accessType, relativePath }) => {
          if (accessType === 'directory') {
            return relativePath.startsWith('/js/client-modules');
          }
          return true;
        },
      }),
    ]);

    m.addRoute('post', '/upload', [m.isAuthenticated, fileController.upload]);
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

    m.addRoute('get', '/file-link/:fileId', [m.isAuthenticated, fileController.getFileLink]);
    /**
     * @swagger
     * /file-link/{fileId}:
     *   get:
     *     summary: Gets a link to download specified file
     *     tags:
     *       - File
     *     parameters:
     *       - in: 'path'
     *         name: 'fileId'
     *         required: true
     *         type: 'string'
     *       - in: 'query'
     *         name: 'fileType'
     *         type: 'string'
     *         enum: [asis, cropped, thumbnail]
     *         default: asis
     *         description: Specifies the type of file to download. Values 'cropped' and 'thumbnail' are available only for pictures.
     *     responses:
     *       200:
     *         schema:
     *           type: object
     *           properties:
     *             data:
     *               type: object
     *               description: Uploaded files
     *               properties:
     *                linkId:
     *                  type: string
     *                  description: Link to download the file
     *                expiresAt:
     *                  type: string
     *                  description: Expiration date of the link in ISO format
     *             success:
     *               type: boolean
     */

    m.addRoute('get', '/file/:linkId', [fileController.getFile]);
    /**
     * @swagger
     * /file/{linkId}:
     *   get:
     *     summary: Gets file by link
     *     tags:
     *       - File
     *     parameters:
     *       - in: 'path'
     *         name: 'linkId'
     *         required: true
     *         type: 'string'
     *       - in: 'query'
     *         name: 'attachment'
     *         type: 'boolean'
     *         default: false
     *         description: If true downloads the file as attachment otherwise inline
     *     responses:
     *       200:
     *         description: File content
     */

    m.addDashboardEndpoints(); // TODO: remove this after mobile update

    const { addAll, connect } = m.graphQl;
    await addAll();

    await m.loadControllers();

    m.log.trace('Connecting GraphQL');
    connect.connectGraphqlWithAltair();

    m.log.trace('Connecting Swagger');
    const { connectSwagger } = require('./swagger');
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
    m.options = _.merge(m.options, opts);
  };

  m.migrateMongo = async function () {
    const { getMigrateConfig } = require('../migrate/config');
    const { MONGODB_URI } = m.config;
    const migrateMongo = new MigrateMongo(getMigrateConfig(MONGODB_URI));
    const db = await migrateMongo.database.connect();
    await migrateMongo.up(db);
    await db.close();
  };

  async function cacheRolesToPermissions() {
    if (m.cache.isReady()) {
      // set rolesToPermissions on startup to rewrite old cache
      const rolesToPermissions = await m.accessUtil.getRolesToPermissions();
      await m.cache.set(m.cache.keys.rolesToPermissions(), rolesToPermissions);
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
    m.otp = require('./util/otp')(m.config);
    m.crypto = require('./util/crypto')(m.config);
    m.mail = require('./mail')(m);
    m.dba = require('./database-abstraction')(m);
    m.mutil = require('./model')(m);
    m.trino = require('./trino')(m);

    m.graphQl = require('./graphql')(m, '/graphql', '/altair');
    m.requestContexts = require('./request-context');

    m.googleMapsClient = require('./google-maps')(m.config.GOOGLE_API_KEY);

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
    m.file = require('./file')(m);
  }

  function addMongoHooks() {
    const { keys, clearCacheByKeyPattern } = m.cache;
    const usersWithPermissionsKeyPattern = `${keys.usersWithPermissions()}:*`;
    const rolesToPermissionsKey = keys.rolesToPermissions();

    m.db.collection('roles').after('write', (/* { args, method, result } */) => {
      clearCacheByKeyPattern(usersWithPermissionsKeyPattern);
      clearCacheByKeyPattern(rolesToPermissionsKey);
    });
    m.db.collection('users').after('write', (/* { args, method, result } */) => {
      clearCacheByKeyPattern(usersWithPermissionsKeyPattern);
      clearCacheByKeyPattern(rolesToPermissionsKey);
    });
  }

  function configureLog4js(configWarnings) {
    const log4jsConfig = {};

    const { LOG4JS_CONFIG } = m.config;
    if (!fs.existsSync(LOG4JS_CONFIG)) {
      throw new Error(`Log4js config file by path '${LOG4JS_CONFIG}' does not exist`);
    }

    try {
      const log4jsFileConfig = JSON5.parse(fs.readFileSync(LOG4JS_CONFIG, 'utf8'));
      _.merge(log4jsConfig, log4jsFileConfig);
    } catch (e) {
      throw new Error(`Invalid log4js config by path '${LOG4JS_CONFIG}, ${e.message}`);
    }

    if (!_.get(log4jsConfig, 'appenders.out')) {
      _.set(log4jsConfig, 'appenders.out', { type: 'stdout' });
    }
    if (!_.get(log4jsConfig, 'categories.default')) {
      _.set(log4jsConfig, 'categories.default', { appenders: ['out'], level: 'OFF' });
    }
    const auditAppender = require('./util/log4js-mongodb-appender')({
      connectionString: m.config.LOG_DB_URI,
      collectionName: m.config.LOG_DB_COLLECTION,
    });
    _.set(log4jsConfig, 'appenders.audit', { type: auditAppender });

    const consoleEjsonOptions = _.get(log4jsConfig, 'appenders.consoleEjson.options');
    const consoleEjsonAppender = require('./util/log4js-console-ejson-appender')(consoleEjsonOptions);
    _.set(log4jsConfig, 'appenders.consoleEjson', { type: consoleEjsonAppender });

    log4js.configure(log4jsConfig);

    m.log = log4js.getLogger('lib/app');
    const configWarningsList = getOrderedList(configWarnings);
    configWarningsList && m.log.warn(`Config warnings:\n ${configWarningsList}`);

    m.auditLoggers = getAuditLoggers(log4js, m.config);
    m.expressLog = log4js.getLogger('express');
    m.dbAppLogger = log4js.getLogger('db');
    m.getLogger = log4js.getLogger.bind(log4js);
  }

  /**
   * App setup, configures everything but doesn't start the app
   * For the actual server also call app.start();
   */
  m.setup = async () => {
    const { errors, warnings: configWarnings, config, envConfig } = await getConfigFromDb(m.options.MONGODB_URI);
    if (!_.isEmpty(errors)) {
      throw new Error(errors.join('\n'));
    }
    if (m.options.MONGODB_URI) {
      config.MONGODB_URI = m.options.MONGODB_URI;
    }
    m.config = config;
    m.envConfig = envConfig;

    configureLog4js(configWarnings);

    m.errors = require('./errors');
    m.butil = require('./util/util');
    m.expressUtil = require('./express-util');
    m.accessCfg = require('./access/access-config');
    m.elasticSearch = require('./elastic-search');

    const {
      REDIS_URL,
      REDIS_KEY_PREFIX,
      BULL_REDIS_URL,
      BULL_KEY_PREFIX,
      BULL_REMOVE_ON_COMPLETE,
      BULL_REMOVE_ON_FAIL,
    } = m.config;
    m.cache = require('./cache')({ redisUrl: REDIS_URL, keyPrefix: REDIS_KEY_PREFIX });
    m.queue = require('./queue')({
      redisUrl: BULL_REDIS_URL,
      keyPrefix: BULL_KEY_PREFIX,
      removeOnComplete: BULL_REMOVE_ON_COMPLETE,
      removeOnFail: BULL_REMOVE_ON_FAIL,
    });

    if (_.isEmpty(m.config.APP_SCHEMA)) {
      m.log.warn(`Env APP_SCHEMA not specified. Proceeding with built-in models only.`);
    }

    const nonExistingSchemaPaths = m.config.APP_SCHEMA.map((p) => (fs.existsSync(p) ? null : p)).filter((p) => p);
    if (!_.isEmpty(nonExistingSchemaPaths)) {
      m.log.warn(`Found non-existing schema paths: ${nonExistingSchemaPaths.join(', ')}. Check your .env file.`);
    }

    // mongo-wrapper patches mongodb so calling require('mongodb') will get patched version in any other place
    require('./mongo-wrapper')({
      log: m.auditLoggers.db,
      logCollectionName: m.config.LOG_DB_COLLECTION,
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
    const helperDirPaths = [`${coreModelPath}/helpers`, ...getSchemaNestedPaths(m.config.APP_SCHEMA, 'helpers')];
    m.helperUtil = await require('./helper-util')(m, helperDirPaths, m.config.BUILD_APP_MODEL_CODE_ON_START);
    m.allActionsNames = [...m.accessCfg.DEFAULT_ACTIONS, ..._.keys(m.appModelHelpers.CustomActions)];

    const { model, macrosFunctionContext } = await m.mutil.getCombinedModel({
      appModelSources: m.options.appModelSources,
      appModelProcessors: m.appModelHelpers.appModelProcessors,
      macrosDirPaths: [...getSchemaNestedPaths(m.config.APP_SCHEMA, 'macros'), `${coreModelPath}/macros`],
    });

    prepareEnvironmentSchema(model.models._environment);
    m.appModel = model;
    m.macrosFunctionContext = macrosFunctionContext;

    const { errors: modelErrors, warnings: modelWarnings } = m.mutil.validateAndCleanupAppModel(m.appModel.models);
    if (modelWarnings.length) {
      const warningsList = getOrderedList(modelWarnings);
      m.log.warn(`Warnings during model building:\n${warningsList}`);
    }
    if (modelErrors.length) {
      throw new Error(modelErrors.join('\n'));
    }

    await m.mutil.createCollections();
    await m.mutil.handleIndexes();
    await m.trino.upsertTrinoSchemas(m.appModel.models);
    await cacheRolesToPermissions();

    m.log.info('Executing prestart scripts...');
    await m.executePrestartScripts();
    m.log.info('Finished executing prestart scripts.');

    m.auth = require('./auth')(m);
    m.isAuthenticated = m.auth.isAuthenticated;

    const { ES_NODES, ES_MAX_RETRIES } = m.config;
    const esConfig = m.elasticSearch.getEsConfig(ES_NODES, ES_MAX_RETRIES);
    if (esConfig) {
      m.log.info('Starting real-time Mongo-ES sync...');
      await m.elasticSearch.startRealTimeSync(
        m.isMongoSupportsSessions,
        m.appModel.models,
        m.config.MONGODB_URI,
        esConfig,
        true
      );
    }

    const app = express();
    await m.configureApp(app);

    // build baseAppModel once to reuse it in models responses for specific users
    m.baseAppModel = m.accessUtil.getBaseAppModel();

    setControllerProperties();

    // define m.ws before loading model controllers, since it's allowed to add own ws events inside them
    m.ws = require('./real-time')({
      appLib: m,
      redisUrl: m.config.SOCKETIO_REDIS_URL,
      keyPrefix: m.config.SOCKETIO_KEY_PREFIX,
    });

    await m.addRoutes();
    m.addErrorHandlers();

    // create server with ready express app
    m.server = http.createServer(app);
    // build ws server with ready http instance and ws events from model controllers
    await m.ws.build(m.server);

    const { APP_VERSION, APP_NAME } = m.config;
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
    const { APP_PORT } = m.config;
    m.httpInstance = m.server.listen(APP_PORT);
    m.log.info('App is listening on port', APP_PORT);
    m.auditLoggers.system({
      message: 'System backend is running',
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
