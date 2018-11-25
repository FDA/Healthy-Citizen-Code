global.Promise = require('bluebird');

const appRoot = require('app-root-path').path;
const mongoose = require('mongoose');
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');
const _ = require('lodash');
const nodePath = require('path');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const glob = require('glob');
const device = require('express-device');
const mongooseLog = require('log4js').getLogger('mongoose');
const restifyLog = require('log4js').getLogger('restify');
const pEvent = require('p-event');

const websocketServer = require('./websocket-server')();
const publicFilesController = require('./public-files-controller');
const APP_VERSION = require('../package.json').version;
const connectSwagger = require('./swagger');

// TODO: rewrite everything using ES6 Promises instead of async
// TODO: do I need to export anything besides setup() and start()? Get rid of exporting the rest later if necessary
/**
 * @param opts contains various parameters
 */
module.exports = (opts = {}) => {
  const m = {};
  m.controllers = {};
  m.log = require('log4js').getLogger('lib/app');
  m.accessCfg = require('./access-config');
  m.butil = require('./backend-util');

  m.accessUtil = require('./access-util')(m);
  m.dba = require('./database-abstraction')(m);
  m.controllerUtil = require('./default-controller-util')(m);
  const mutil = require('./model')(m);
  const mainController = require('./default-controller')(m);
  const appUtil = require('./app-util')(m);
  const fileController = require('./file-controller')(m);

  m.fileControllerUtil = require('./file-controller-util')();
  m.controllers.main = mainController;

  m.graphQl = require('./graphql')(m);
  m.graphQl.graphQlRoute = '/graphql';
  m.graphQl.graphiQlRoute = '/graphiql';
  const connectGraphQl = require('./graphql/connect')(m);

  /**
   * Reference to the restify application
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

  m.getAuthSettings = () => m.appModel.interface.app.auth;

  /**
   * Connects to DB and sets various DB parameters
   * @param cb
   */
  m.connectToDb = () => {
    if (mongoose.connection.readyState === 1) {
      m.db = mongoose.connection;
      mutil.db = mongoose.connection;
      return Promise.resolve();
    }
    mongoose.Promise = global.Promise;
    if (process.env.DEVELOPMENT === 'true') {
      mongoose.set('debug', (coll, method, query, doc, options) => {
        mongooseLog.debug(
          `${method} ${coll}, ${JSON.stringify(query)}, DOC:${JSON.stringify(
            doc
          )}, OPTIONS:${JSON.stringify(options)}`
        );
      });
    }
    return mongoose
      .connect(
        process.env.MONGODB_URI,
        { useNewUrlParser: true }
      )
      .then(connected => {
        if (mongoose.connection.readyState !== 1) {
          throw new Error(connected);
        }
        mutil.db = mongoose.connection;
        m.db = mongoose.connection;
        return connected;
      })
      .catch(error => {
        m.log.error(
          `LAP003: MongoDB connection error. Please make sure MongoDB is running at ${
            process.env.MONGODB_URI
          }: ${error}`
        );
        throw new Error(error);
      });
  };
  m.configureApp = app => {
    m.app = app;
    app.on('uncaughtException', (req, res, route, err) => {
      m.log.error(`LAP001: Uncaught exception ${err} with call stack ${err.stack}`);
      res.json(500, { success: false, code: 'LAP001', message: `${err}` });
    });
    app.on('InternalServer', (req, res, route, err) => {
      m.log.error(`LAP002: Internal server error ${err}`);
      res.json(500, { success: false, code: 'LAP002', message: `${err}` });
    });
    app.on('InternalServerError', (req, res, route, err) => {
      m.log.error(`LAP003: Internal server error ${err}`);
      res.json(500, { success: false, code: 'LAP003', message: `${err}` });
    });
    process.on('uncaughtException', err => {
      m.log.error(`LAP004: Uncaught node exception ${err} with call stack ${err.stack}`);
    });
    app.on('pre', req => {
      restifyLog.info(`${req.method} ${req.url}`);
    });
    app.on('after', (req, res, route, err) => {
      if (err) {
        restifyLog.error(
          `${req.method} ${req.url} -> ${res.statusCode}${err ? `, ERR:${err}` : ''}`
        );
      }
    });
    // fallback to the core for missing /public static files
    // app.on('restifyError', mainController.handlePublicFileNotFound);
    app.use(restify.plugins.queryParser({ mapParams: true }));
    app.use(restify.plugins.bodyParser({ mapParams: true }));
    app.use(restify.plugins.gzipResponse());
    app.use(device.capture());
    // app.use(restify.requestLogger());
    const corsOrigins = process.env.CORS_ORIGIN
      ? [process.env.CORS_ORIGIN]
      : ['https://*.conceptant.com', 'http://localhost.conceptant.com*', 'http://localhost*'];
    const cors = corsMiddleware({
      preflightMaxAge: 5, // Optional
      origins: corsOrigins,
      allowHeaders: ['API-Token', 'Authorization'],
      exposeHeaders: ['API-Token-Expiry'],
      credentials: true,
    });
    app.pre(cors.preflight);
    app.use(cors.actual);
  };

  m.loadModel = () => {
    m.appModel = mutil.getCombinedModel(opts.appModelSources);
    appUtil.loadLists();
    appUtil.loadRenderers();
    appUtil.loadCustomActions();
    appUtil.loadValidators();
    appUtil.loadTransformers();
    appUtil.loadSynthesizers();
    appUtil.loadLabelRenderers();
    appUtil.loadFormRenderers();
    appUtil.loadPermissions();
    appUtil.loadPermissionScopePreparations();

    m.appLookups = {}; // model lookups ids will be stored here

    return appUtil.loadRolesToPermissions();
  };

  /**
   * Generates mongoose models according to the appModel
   * @param cb
   */
  m.generateMongooseModels = () =>
    mutil
      .removeIrrelevantUniqueIndexes()
      .then(() => mutil.generateMongooseModelsPromise(m.db, m.appModel.models))
      .then(() => {
        m.log.info('Generated Mongoose models');
      })
      .catch(err => {
        m.log.error(err);
        throw err;
      });

  /**
   * Adds routes to the application router
   * @param verb i.e. get, post, put etc
   * @param route the route to add (as a string)
   * @param args array of controller functions to handle route
   */
  m.addRoute = (verb, route, args) => {
    const methodNames = {
      get: 'GET',
      put: 'PUT',
      post: 'POST',
      del: 'DELETE',
    };
    const existingRoute = _.find(
      m.app.router.mounts,
      val => val.method === methodNames[verb] && val.spec.path === route // note that the path must be exactly the same. /path/:id and /path/:idTmp are different paths
    );
    if (existingRoute) {
      m.app.rm(existingRoute.name);
    }
    // args.unshift(m.isAuthenticated);
    args.unshift(route);
    m.app[verb](...args);
    m.log.trace(
      ` ∟ ${existingRoute ? 'Replaced' : 'Added'} route: ${verb.toUpperCase()} ${route} ${
        _.includes(args, m.isAuthenticated) ? 'AUTH' : ''
      }`
    );
  };

  /**
   * Adds routes necessary to perform full CRUG on the global.appModel
   * @param app the app to add CRUD to
   */
  m.addAppModelRoutes = () => {
    _.each(m.appModel.models, (schema, schemaName) => {
      m.log.debug('Adding routes for schema', schemaName);
      addCrudRoutesToSchema(schemaName, schema, []);
      addLookupRoutesToSchema(schemaName, schema, []);
    });

    /**
     * This adds routes to the restify app to handle CRUD for a specific schema
     * NOTE: unlike lookup method this method is not checking for existing routes
     * @param name the name of the schema
     * @param schema the schema definition
     * @param path the full path to the schema (as array)
     */
    function addCrudRoutesToSchema(name, schema, path) {
      const callbacks = [];
      // TODO: update this code, now it's implemented with permissions
      // isAuthenticated is added in addRoute
      callbacks.push(m.isAuthenticated);
      // add standard CRUD
      // let name = pluralize(name, 2);
      const qualifiedPath = `/${_.map(path, p => `${p}/:${p}_id`).join('/') +
        (path.length === 0 ? '' : '/')}`;
      const unqualifiedPath = `/schema/${path.join('/') + (path.length === 0 ? '' : '/')}`;
      m.addRoute('get', `${unqualifiedPath}${name}`, [mainController.getSchema]); // this just returns schema, no auth is required
      m.addRoute('get', `${qualifiedPath}${name}`, callbacks.concat([mainController.getItems])); // should this even be allowed for pii/phis? Check limitReturnedRecords
      m.addRoute('post', `${qualifiedPath}${name}`, callbacks.concat([mainController.postItem]));
      m.addRoute('get', `${qualifiedPath}${name}/:id`, callbacks.concat([mainController.getItem]));
      m.addRoute('put', `${qualifiedPath}${name}/:id`, callbacks.concat([mainController.putItem]));
      m.addRoute(
        'del',
        `${qualifiedPath}${name}/:id`,
        callbacks.concat([mainController.deleteItem])
      );
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
        const controllerPath = require('path').resolve(
          appRoot,
          'lib',
          `${schema.controller}-controller`
        );
        try {
          m.controllers[schema.controller] = require(controllerPath)(m);
        } catch (e) {
          m.log.error(`Unable to load custom controller '${controllerPath}': ${e}`);
          process.exit(1);
        }
      }
    }

    /** Adds route to the app so it can run lookups using UI elements such as select2
     * The request should contain Get parameter q=<search> to perform the search and
     * optionally page=<number> parameter to show results in infinity scroll as
     * specified in the select2 documentation
     * @param schemaName the schemaName of the schema
     * @param schema the schema definition
     * @param path the full path to the schema (as array)
     */
    function addLookupRoutesToSchema(schemaName, schema, path) {
      _.each(schema, (attribute, attributeName) => {
        if (attributeName === 'lookup' && _.isPlainObject(attribute)) {
          const lookup = attribute;
          const lookupId = lookup.id;
          m.appLookups[lookupId] = lookup;
          m.log.debug(`☞ Adding routes for lookup ${path.join('.')}.${schemaName}`);
          addRoutes(lookup, lookupId);
        }
        if (attributeName === 'fields' && _.isPlainObject(attribute)) {
          _.each(attribute, (field, fieldName) => {
            addLookupRoutesToSchema(fieldName, field, path.concat([schemaName]));
          });
        }
      });

      function addRoutes(lookup, lookupId) {
        _.forEach(lookup.table, tableLookup => {
          const isFilteringLookup = tableLookup.where;
          const tableName = tableLookup.table;
          const lookupPath = `/lookups/${lookupId}/${tableName}`;
          if (
            !isFilteringLookup &&
            !_.some(m.app.router.mounts, r => r.spec.method === 'GET' && r.spec.path === lookupPath)
          ) {
            m.addRoute('get', lookupPath, [m.isAuthenticated, mainController.getLookupTableJson]);
          }
          if (
            isFilteringLookup &&
            !_.some(
              m.app.router.mounts,
              r => r.spec.method === 'POST' && r.spec.path === lookupPath
            )
          ) {
            m.addRoute('post', lookupPath, [m.isAuthenticated, mainController.getLookupTableJson]);
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
    res.json({
      success: true,
      data: {
        brief: _.map(
          m.app.router.mounts,
          (route, key) =>
            `${route.spec.method} ${route.spec.path}${
              _.includes(m.app.routes[key], m.isAuthenticated) ? ' AUTH' : ''
            }`
        ),
        full: m.app.router.mounts,
      },
    });
    next();
  };

  /**
   * This reloads app model from definition
   * @param req
   * @param res
   * @param next
   */
  m.getReloadModel = (req, res, next) => {
    mongoose.models = {};
    m.setup()
      .then(() => {
        res.json({ success: true });
        next();
      })
      .catch(e => {
        m.log.error('APP001', e);
        process.exit(1);
      });
  };

  // TODO: delete after mobile app refactoring, only required for mobile app framework backward compatibility
  m.addDashboardEndpoints = () => {
    m.addRoute('get', '/dashboards/:id', [m.isAuthenticated, mainController.getDashboardJson]);
  };

  m.loadControllers = appModelPath => {
    m.log.trace('Loading custom controllers:');
    try {
      const files = _.concat(
        glob.sync(`${appRoot}/server_controllers/**/*.js`),
        glob.sync(`${appModelPath}/server_controllers/**/*.js`)
      );
      _.forEach(files, file => {
        m.log.trace(` ∟ ${file}`);
        const lib = require(file)(mongoose);
        lib.init(m);
      });
    } catch (e) {
      m.log.error(`Unable to load custom controllers`, e);
      process.exit(2);
    }
  };

  m.loadTestController = () => {
    m.log.trace('Loading test controller:');
    try {
      const lib = require('./test-controller')(mongoose);
      lib.init(m);
    } catch (e) {
      m.log.error(`Unable to load test controller: ${e}`);
      process.exit(2);
    }
  };

  /**
   * Adds user authentication via passport.js
   * Note that this should run after mongoose models and the server are created, but before any routes are set up
   */
  m.addUserAuthentication = () => {
    const User = mongoose.model('users');

    passport.use(User.createStrategy()); // local strategy, see https://github.com/saintedlama/passport-local-mongoose
    passport.use(
      'jwt',
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
          secretOrKey: process.env.JWT_SECRET, // TODO: move into .env
        },
        (jwtPayload, done) => {
          User.findOne({ _id: jwtPayload.id }, (err, user) => {
            if (err) {
              done(err, false);
            } else if (user) {
              done(null, user);
            } else {
              done(null, false);
            }
          });
        }
      )
    );
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
    m.app.use(passport.initialize());
    m.app.use(passport.session());
  };

  /* eslint-disable promise/avoid-new, prefer-promise-reject-errors */
  m.authenticationCheck = (req, res, next) =>
    new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
          return reject(`ERR: ${err} INFO:${info}`);
        }
        if (!user && m.getAuthSettings().requireAuthentication !== false) {
          return reject({ code: 401 });
        }
        const permissions = m.accessUtil.getPermissionsForUser(user, req.device.type);
        return resolve({ user, permissions });
      })(req, res, next);
    });
  /* eslint-enable promise/avoid-new, prefer-promise-reject-errors */

  m.isAuthenticated = (req, res, next) => {
    m.authenticationCheck(req, res, next)
      .then(({ user, permissions }) => {
        req.user = user;
        m.accessUtil.setUserPermissions(req, permissions);
        next();
      })
      .catch({ code: 401 }, () => {
        res.json(401, { success: false, message: 'User session expired, please login again' });
      })
      .catch(err => {
        m.log.error(err);
        res.json(500, { success: false, message: `Error occurred during authentication process` });
      });
  };

  m.removeAllRoutes = () => {
    _.forEach(m.app.router.mounts, mount => {
      m.app.rm(mount.name);
    });
  };

  m.addRoutes = () => {
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

    // m.addRoute('get', /\/helpers\/?.*/, [restify.serveStatic({directory: `${process.env.APP_MODEL_DIR}/model`})]);
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
     *                    description: contains restify info about route
     *              success:
     *                type: boolean
     */

    m.addRoute('get', '/reload-model', [mainController.isDevelopmentMode, m.getReloadModel]);
    /**
     * @swagger
     * /reload-model:
     *   get:
     *     summary: Reloads app model from definition.
     *     description: This route is only available in development mode
     *     tags:
     *       - Management
     *     responses:
     *       200:
     *          description: Successful
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

    m.addRoute('get', '/app-model', [mainController.getAppModelJson]);
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

    m.addRoute('get', '/lists.js', [mainController.getClientSideCodeForLists]);
    /**
     * @swagger
     * /lists.js:
     *   get:
     *     summary: Returns string representing code for all lists.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/renderers.js', [mainController.getClientSideCodeForRenderers]);
    /**
     * @swagger
     * /renderers.js:
     *   get:
     *     summary: Returns string representing code for all renderers.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/custom-actions.js', [mainController.getClientSideCodeForCustomActions]);
    /**
     * @swagger
     * /custom-actions.js:
     *   get:
     *     summary: Returns string representing code for all custom actions.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/form-renderers.js', [mainController.getClientSideCodeForFormRenderers]);
    /**
     * @swagger
     * /form-renderers.js:
     *   get:
     *     summary: Returns string representing code for all custom actions.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/label_renderers.js', [mainController.getClientSideCodeForLabelRenderers]);
    /**
     * @swagger
     * /label_renderers.js:
     *   get:
     *     summary: Returns string representing code for all label renderers.
     *     description: Does not check AUTH.
     *     tags:
     *       - Meta
     *     responses:
     *       200:
     *          description: Successful
     */

    m.addRoute('get', '/validators.js', [mainController.getClientSideCodeForValidators]);
    /**
     * @swagger
     * /validators.js:
     *   get:
     *     summary: Returns string representing code for all validators.
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

    // m.addRoute('get', '/teapot', [mainController.isDevelopmentMode, mainController.sendTeapot]);

    // m.addRoute('get', /\/public\/?.*/, [restify.plugins.serveStatic({directory: `./`})]);
    // m.addRoute('get', /\/public\/?.*/, [restify.plugins.serveStatic({directory: `${process.env.APP_MODEL_DIR}`})]);
    m.addRoute('get', '/public/.*', [
      publicFilesController({ directories: [`${process.env.APP_MODEL_DIR}`, './model'] }),
    ]);
    // TODO: write tests for the file uploading/thumbnails/cropping etc
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
    m.loadControllers(process.env.APP_MODEL_DIR);
    m.loadTestController();

    const { graphiQlRoute, graphQlRoute } = m.graphQl;
    connectGraphQl(graphQlRoute, graphiQlRoute);
    connectSwagger(m);
  };

  m.resetRoutes = () => {
    m.removeAllRoutes();
    m.addRoutes();
  };

  function setAbsoluteEnvPaths() {
    process.env.LOG4JS_CONFIG = nodePath.resolve(appRoot, process.env.LOG4JS_CONFIG);
    process.env.APP_MODEL_DIR = nodePath.resolve(appRoot, process.env.APP_MODEL_DIR);
  }

  /**
   * App setup, configures everything but doesn't start the app
   * For tests just setup the app
   * For the actual server also call app.start();
   */
  m.setup = () => {
    setAbsoluteEnvPaths();

    return m
      .connectToDb()
      .then(() => {
        m.log.info('Using logger settings from', process.env.LOG4JS_CONFIG);
        return m.loadModel();
      })
      .then(() => {
        m.log.info(
          'Loaded rolesToPermissions: ',
          JSON.stringify(m.appModel.rolesToPermissions, null, 2)
        );
        const modelProblems = mutil.validateAndCleanupAppModel();
        if (modelProblems.length > 0) {
          throw new Error(modelProblems.join('\n'));
        }
        return m.generateMongooseModels();
      })
      .then(() => {
        m.log.info('Executing prestart scripts...');
        return m.executePrestartScripts();
      })
      .then(() => {
        const app = restify.createServer({ name: process.env.APP_NAME, version: APP_VERSION });
        m.configureApp(app);

        m.addUserAuthentication();
        m.addRoutes();
        // TODO: move route name to config?
        websocketServer.connect(m.app);

        m.log.info(`HC Backend server v${APP_VERSION} has been set up`);
        return m;
      })
      .catch(err => {
        m.log.error(err);
        throw err;
      });
  };

  m.executePrestartScripts = () => {
    const scriptMap = {
      normalizeObjectIdLookups: () => m.controllerUtil.normalizeLookupObjectIds(),
    };

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
    m.app.listen(process.env.APP_PORT);
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

    function getCloseAppPromise() {
      if (!m.app) {
        return Promise.resolve();
      }
      m.app.close(() => {
        m.log.trace('Closed app');
      });
      return pEvent(m.app, 'close');
    }
  };

  return m;
};
