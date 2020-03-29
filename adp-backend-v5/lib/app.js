const Promise = require('bluebird');

const express = require('express');
const http = require('http');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session); // TODO: switch to redis before going to high-performance production
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const device = require('express-device');

const appRoot = require('app-root-path').path;
const mongoose = require('mongoose');
const _ = require('lodash');
const nodePath = require('path');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const { ExtractJwt } = require('passport-jwt');
const glob = require('glob');
const pEvent = require('p-event');
const { MigrateMongo } = require('migrate-mongo');
const expressLog = require('log4js').getLogger('express');
const mongooseLog = require('log4js').getLogger('mongoose');

const getMigrateConfig = require('../migrate/config.js');
const { InvalidTokenError, ExpiredTokenError } = require('./errors');
const { serveDirs } = require('./public-files-controller');
const { version: APP_VERSION, name: APP_NAME } = require('../package.json');
const { comparePassword } = require('./util/password');
const { prepareEnv, getSchemaNestedPaths } = require('./util/env');
const connectSwagger = require('./swagger');

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

  m.getAuthSettings = () => m.appModel.interface.app.auth;

  /**
   * Connects to DB and sets various DB parameters
   */
  m.connectAppDb = async () => {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    mongoose.Promise = Promise;
    mongoose.set('useNewUrlParser', true);
    mongoose.set('useFindAndModify', false);
    mongoose.set('useCreateIndex', true);
    mongoose.set('useUnifiedTopology', true);
    if (process.env.DEVELOPMENT === 'true') {
      const getMessage = (args) => {
        function getOptsWithoutSession(opts) {
          if (opts && opts.session) {
            return _.omit(opts, 'session');
          }
          return opts;
        }
        const { stringifyLog } = m.butil;

        if (args.length === 2) {
          const [coll, method] = args;
          return `${method} ${coll}`;
        }
        if (args.length === 3) {
          const [coll, method, doc] = args;
          return `${method} ${coll}, ${stringifyLog(doc)}`;
        }
        if (args.length === 4) {
          const [coll, method, doc, opts] = args;
          return `${method} ${coll}, ${stringifyLog(doc)}, OPTIONS:${stringifyLog(getOptsWithoutSession(opts))}`;
        }
        if (args.length === 5) {
          const [coll, method, query, doc, opts] = args;
          return `${method} ${coll}, ${stringifyLog(query)}, ${stringifyLog(doc)}, OPTIONS:${getOptsWithoutSession(
            opts
          )}`;
        }
        return args.toString();
      };

      mongoose.set('debug', (...args) => {
        try {
          mongooseLog.debug(getMessage(args));
        } catch (e) {
          mongooseLog.debug(args.toString());
        }
      });
    }

    try {
      const connected = await mongoose.connect(process.env.MONGODB_URI);
      if (mongoose.connection.readyState !== 1) {
        throw new Error(connected);
      }
      return mongoose.connection;
    } catch (e) {
      m.log.error(
        `LAP003: MongoDB connection error. Please make sure MongoDB is running at ${process.env.MONGODB_URI}`
      );
      throw new Error(e);
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
    expressLog.error(`${req.method} ${req.url} -> ${res.statusCode} ${errMsg}`);
  };

  m.configureApp = (app) => {
    m.app = app;
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
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json({ limit: '100mb' }));
    app.use(compression());
    app.use(device.capture());
    app.use(cookieParser());
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

    app.use(
      session({
        secret: process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: true,
        sameSite: false,
        secure: 'auto',
        name: 'adp.sid',
        proxy: true,
        store: new MongoStore({ mongooseConnection: mongoose.connection }),
      })
    );

    app.use((req, res, next) => {
      expressLog.info(`${req.method} ${req.url}`);
      next();
    });
  };

  /**
   * Generates mongoose models according to the appModel
   */
  m.generateMongooseModels = async () => {
    await m.mutil.generateMongooseModels(m.db, m.appModel.models);
    await m.mutil.handleIndexes();
    m.log.info('Generated Mongoose models');
  };

  /**
   * Adds routes to the application router
   * @param verb i.e. get, post, put etc
   * @param route the route to add (as a string)
   * @param args array of controller functions to handle route
   */
  m.addRoute = (verb, route, args) => {
    const methodNames = {
      get: 'get',
      put: 'put',
      post: 'post',
      del: 'delete',
      use: 'use',
    };
    const method = methodNames[verb];
    const removedRoutes = m.expressUtil.removeRoutes(m.app, route, method);
    // args.unshift(m.isAuthenticated);
    args.unshift(route);
    m.app[method](...args, m.errorLogger);

    const action = _.isEmpty(removedRoutes) ? 'Added' : 'Replaced';
    const authRouteNote = _.includes(args, m.isAuthenticated) ? 'AUTH' : '';
    m.log.trace(` ∟ ${action} route: ${method.toUpperCase()} ${route} ${authRouteNote}`);
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

      // TODO: this is to be depriciated in favor of server_controllers
      if (schema.controller) {
        // add custom routes
        const controllerPath = require('path').resolve(appRoot, 'lib', `${schema.controller}-controller`);
        try {
          m.controllers[schema.controller] = require(controllerPath)(m);
        } catch (e) {
          m.log.error(`Unable to load custom controller '${controllerPath}'`, e.stack);
          process.exit(1);
        }
      }
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
          if (!isFilteringLookup && _.isEmpty(m.expressUtil.findRoutes(m.app, lookupPath, 'get'))) {
            m.addRoute('get', lookupPath, [m.isAuthenticated, mainController.getLookupTable]);
          }
          if (isFilteringLookup && _.isEmpty(m.expressUtil.findRoutes(m.app, lookupPath, 'post'))) {
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
          if (!isFilteringLookup && _.isEmpty(m.expressUtil.findRoutes(m.app, treeSelectorPath, 'get'))) {
            m.addRoute('get', treeSelectorPath, [m.isAuthenticated, mainController.getTreeSelector]);
          }
          if (isFilteringLookup && _.isEmpty(m.expressUtil.findRoutes(m.app, treeSelectorPath, 'post'))) {
            m.addRoute('post', treeSelectorPath, [m.isAuthenticated, mainController.getTreeSelector]);
          }
        });
      }
    }
  };

  /**
   * Returns the list of routes this server provides. Should be protected with isDevelopmentMode
   * @param req
   * @param res
   * @param next
   */
  m.getRoutesJson = (req, res, next) => {
    const routesList = m.expressUtil.getRoutes(m.app, m.isAuthenticated);

    res.json({
      success: true,
      data: { brief: routesList },
    });
    next();
  };

  // TODO: delete after mobile app refactoring, only required for mobile app framework backward compatibility
  m.addDashboardEndpoints = () => {
    m.addRoute('get', '/dashboards/:id', [m.isAuthenticated, m.controllers.main.getDashboardJson]);
  };

  m.loadControllers = () => {
    m.log.trace('Loading custom controllers:');
    try {
      const appSchemaControllersFiles = _.flatten(
        getSchemaNestedPaths('server_controllers/**/*.js').map((pattern) => glob.sync(pattern))
      );
      const coreControllers = glob.sync(`${appRoot}/model/server_controllers/**/*.js`);
      const files = [...coreControllers, ...appSchemaControllersFiles];
      return Promise.mapSeries(files, (file) => {
        m.log.trace(` ∟ ${file}`);
        const lib = require(file)(mongoose);
        return lib.init(m);
      });
    } catch (e) {
      m.log.error(`Unable to load custom controllers`, e.stack);
      process.exit(2);
    }
  };

  /**
   * Adds user authentication via passport.js
   * Note that this should run after mongoose models and the server are created, but before any routes are set up
   */
  m.addUserAuthentication = () => {
    const User = mongoose.model('users');

    passport.use(
      new LocalStrategy({ usernameField: 'login', passwordField: 'password' }, async (login, password, cb) => {
        try {
          const user = await User.findOne({ $or: [{ login }, { email: login }] });
          if (!user) {
            return cb('Invalid login or password');
          }

          const isMatched = await comparePassword(password, user.password);
          if (!isMatched) {
            return cb('Invalid login or password');
          }
          return cb(null, user);
        } catch (e) {
          return cb(e);
        }
      })
    );

    passport.use(
      'jwt',
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
          secretOrKey: process.env.JWT_SECRET,
        },
        async (jwtPayload, done) => {
          try {
            const user = await User.findOne({ _id: jwtPayload.id }).lean().exec();
            if (user) {
              done(null, user);
            } else {
              done(null, false);
            }
          } catch (e) {
            done(e, false);
          }
        }
      )
    );

    passport.serializeUser((user, cb) => cb(null, user._id));
    passport.deserializeUser(async (id, cb) => {
      const user = await User.findById(id);
      if (user) {
        return cb(null, user);
      }
      return cb(new Error(`User with id ${id} is not found`));
    });
    m.app.use(passport.initialize());
    m.app.use(passport.session());
  };

  /* eslint-disable promise/avoid-new, prefer-promise-reject-errors */
  m.authenticationCheck = (req) =>
    new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
          return reject(`ERR: ${err} INFO:${info}`);
        }

        const jwtErrorName = _.get(info, 'name');
        const isInvalidToken = jwtErrorName === 'JsonWebTokenError';
        const jwtMsg = _.get(info, 'message');
        const isEmptyToken = jwtMsg === 'No auth token';
        const isRequiredAuth = m.getAuthSettings().requireAuthentication === true;
        if (isInvalidToken || (isEmptyToken && isRequiredAuth)) {
          return reject(new InvalidTokenError());
        }
        const isExpiredToken = jwtErrorName === 'TokenExpiredError';
        if (isExpiredToken) {
          return reject(new ExpiredTokenError());
        }
        if (!info && !user) {
          // if token payload is valid but user is not found by that payload
          return reject(new InvalidTokenError());
        }
        return m.accessUtil.getRolesAndPermissionsForUser(user, req.device.type).then(({ roles, permissions }) => {
          resolve({ user, roles, permissions });
        });
      })(req);
    });
  /* eslint-enable promise/avoid-new, prefer-promise-reject-errors */

  m.isAuthenticated = (req, res, next) => {
    m.authenticationCheck(req)
      .then(({ user, roles, permissions }) => {
        m.accessUtil.setReqAuth({ req, user, roles, permissions });
        next();
      })
      .catch(InvalidTokenError, () => {
        res.status(401).json({ success: false, message: 'Invalid user session, please login' });
      })
      .catch(ExpiredTokenError, () => {
        res.status(401).json({ success: false, message: 'User session expired, please login again' });
      })
      .catch((err) => {
        m.log.error(err.stack);
        res.status(500).json({ success: false, message: `Error occurred during authentication process` });
      });
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
    m.addRoute('get', '/routes', [mainController.isDevelopmentMode, m.getRoutesJson]);
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

    m.addRoute('use', '/public', [
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

    m.googleMapsClient = require('./google-maps');

    /**
     * Reference to the express application
     */
    m.app = null;

    /**
     * Need to make sure that users understand that we will keep link to all their current connections to send proper notifications
     * @type {{}}
     */
    m.userConnections = {};

    /**
     * Mongoose db connection
     */
    m.db = null;
  }

  function setControllerProperties() {
    m.controllers = {};
    m.controllerUtil = require('./default-controller-util')(m);
    m.controllers.main = require('./default-controller')(m);
    m.fileController = require('./file-controller')(m);
    m.fileControllerUtil = require('./file-controller-util')();
  }

  /**
   * App setup, configures everything but doesn't start the app
   * For tests just setup the app
   * For the actual server also call app.start();
   */
  m.setup = async () => {
    prepareEnv(appRoot);
    m.log = require('log4js').getLogger('lib/app');
    m.log.info('Using logger settings from', process.env.LOG4JS_CONFIG);

    setInitProperties();
    m.db = await m.connectAppDb();
    m.isMongoReplicaSet = m.butil.isMongoReplicaSet(m.db);

    await m.cache.init();
    await m.cache.clearCacheByKeyPattern('*'); // clear all keys on startup
    await m.queue.init();
    await m.migrateMongo();

    // use to exclude it from /app-model
    m.datasetsModelsNames = new Set();

    const coreModelPath = nodePath.resolve(__dirname, '../model');
    const helperDirPaths = [`${coreModelPath}/helpers`, ...getSchemaNestedPaths('helpers')];
    const buildAppModelCodeOnStart = (process.env.BUILD_APP_MODEL_CODE_ON_START || 'true') === 'true';
    m.helperUtil = await require('./helper-util')(m, helperDirPaths, buildAppModelCodeOnStart);
    m.allActionsNames = [...m.accessCfg.DEFAULT_ACTIONS, ..._.keys(m.appModelHelpers.CustomActions)];

    m.appModel = await m.mutil.getCombinedModel({
      appModelSources: options.appModelSources,
      appModelProcessors: m.appModelHelpers.appModelProcessors,
      macrosDirPaths: [...getSchemaNestedPaths('macroses'), `${coreModelPath}/macroses`],
    });

    m.accessUtil.setAvailablePermissions();

    const { errors, warnings } = m.mutil.validateAndCleanupAppModel();
    if (warnings.length) {
      const warningsList = warnings.map((w, index) => `${index + 1}) ${w}`).join('\n');
      m.log.warn(`Warnings during model building:\n${warningsList}`);
    }
    if (errors.length) {
      throw new Error(errors.join('\n'));
    }
    await m.generateMongooseModels();
    await cacheRolesToPermissions();

    m.log.info('Executing prestart scripts...');
    await m.executePrestartScripts();
    m.log.info('Finished executing prestart scripts.');

    const esConfig = m.elasticSearch.getEsConfig();
    if (esConfig) {
      m.log.info('Starting real-time Mongo-ES sync...');
      const mongoUrl = process.env.MONGODB_URI;
      await m.elasticSearch.startRealTimeSync(m.isMongoReplicaSet, m.appModel.models, mongoUrl, esConfig, true);
    }

    const app = express();
    m.configureApp(app);
    m.addUserAuthentication();

    // build baseAppModel once to reuse it in models responses for specific users
    m.baseAppModel = m.accessUtil.getBaseAppModel();

    setControllerProperties();

    // define m.ws before loading model controllers, since it's allowed to add own ws operations inside them
    m.ws = require('./real-time/socket-io-server')(m);

    await m.addRoutes();
    m.addErrorHandlers();

    // create server with ready express app
    m.server = http.createServer(app);
    // build ws server with ready http instance and ws operations from model controllers
    await m.ws.build({
      server: m.server,
      redisUrl: process.env.SOCKETIO_REDIS_URL || process.env.REDIS_URL,
      keyPrefix: process.env.SOCKETIO_KEY_PREFIX || process.env.REDIS_KEY_PREFIX,
    });

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
  };

  m.shutdown = () => {
    const models = _.get(mongoose, 'connection.models');
    _.each(models, (val, key) => {
      delete models[key];
    });
    m.log.trace(`Deleted mongoose models`);
    return Promise.all([
      getCloseAppPromise(),
      mongoose.connection.close().then(() => m.log.trace('Closed mongoose.connection')),
    ]);

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
