const APP_VERSION = "0.3.1";
global.Promise = require('bluebird');

// const dotenv = require('dotenv').load({path: '.env'});
const mongoose = require('mongoose');
const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');
const _ = require('lodash');
const path = require('path');
const mongooseLog = require('log4js').getLogger('mongoose');
const restifyLog = require('log4js').getLogger('restify');
const restifyErrors = require('restify-errors');
const websocketServer = require('./websocket-server')();
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const glob = require("glob");
const appRoot = require('app-root-path').path;

const publicFilesController = require('./public-files-controller');

// TODO: rewrite everything using ES6 Promises instead of async
// TODO: do I need to export anything besides setup() and start()? Get rid of exporting the rest later if necessary
module.exports = function () {
  const m = {};
  m.log = require('log4js').getLogger('lib/app');
  m.accessCfg = require('./access-config');
  m.butil = require('./backend-util');

  m.accessUtil = require('./access-util')(m);
  m.dba = require('./database-abstraction')(m);
  m.controllerUtil = require('./default-controller-util')(m);
  const mutil = require('./model')(m);
  const mainController = require("./default-controller")(m);
  const appUtil = require('./app-util')(m);
  const fileController = require("./file-controller")(m);

  m.mainController = mainController;

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
      m.db = mutil.db = mongoose.connection;
      return Promise.resolve();
    } else {
      mongoose.Promise = global.Promise;
      if ('true' === process.env.DEVELOPMENT) {
        mongoose.set('debug', function (coll, method, query, doc, options) {
          mongooseLog.debug(`${method} ${coll}, ${JSON.stringify(query)}, DOC:${JSON.stringify(doc)}, OPTIONS:${JSON.stringify(options)}`);
        });
      }
      return mongoose.connect(process.env.MONGODB_URI)
        .then((connected) => {
          if (mongoose.connection.readyState !== 1) {
            throw new Error(connected);
          }
          m.db = mutil.db = mongoose.connection;
          return connected;
        })
        .catch((error) => {
          m.log.error(`LAP003: MongoDB connection error. Please make sure MongoDB is running at ${process.env.MONGODB_URI}: ${error}`);
          throw new Error(error);
        });
    }
  };
  m.configureApp = (app) => {
    m.app = app;
    app.on('uncaughtException', (req, res, route, err) => {
      m.log.error(`LAP001: Uncaught exception ${err} with call stack ${err.stack}`);
      res.json(500, {success: false, code: "LAP001", message: "" + err});
    });
    app.on('InternalServer', (req, res, route, err) => {
      m.log.error(`LAP002: Internal server error ${err}`);
      res.json(500, {success: false, code: "LAP002", message: "" + err});
    });
    app.on('InternalServerError', (req, res, route, err) => {
      m.log.error(`LAP003: Internal server error ${err}`);
      res.json(500, {success: false, code: "LAP003", message: "" + err});
    });
    process.on('uncaughtException', (err) => {
      m.log.error(`LAP004: Uncaught node exception ${err} with call stack ${err.stack}`);
    });
    app.on('pre', (req, res) => {
      restifyLog.info(`${req.method} ${req.url}`);
    });
    app.on('after', (req, res, route, err) => {
      if (err) {
        restifyLog.error(`${req.method} ${req.url} -> ${res.statusCode}${err ? ', ERR:' + err : ''}`);
      }
    });
    // fallback to the core for missing /public static files
    //app.on('restifyError', mainController.handlePublicFileNotFound);
    app.use(restify.plugins.queryParser({mapParams: true}));
    app.use(restify.plugins.bodyParser({mapParams: true}));
    app.use(restify.plugins.gzipResponse());
    //app.use(restify.requestLogger());
    let corsOrigins = process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : ['https://*.conceptant.com', 'http://localhost.conceptant.com*', 'http://localhost*'];
    const cors = corsMiddleware({
      preflightMaxAge: 5, //Optional
      origins: corsOrigins,
      allowHeaders: ['API-Token', 'Authorization'],
      exposeHeaders: ['API-Token-Expiry',],
      credentials: true
    });
    app.pre(cors.preflight);
    app.use(cors.actual);
  };

  m.loadModel = () => {
    m.appModel = mutil.getCombinedModel(`${process.env.APP_MODEL_DIR}/model`, `${appRoot}/model/model`);
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

    m.appLookups = {}; // model lookups will be stored here

    return appUtil.loadRolesToPermissions();
    //m.log.trace("Loaded model\n" + JSON.stringify(appModel, null, 4));
  };

  /**
   * Generates mongoose models according to the appModel
   * @param cb
   */
  m.generateMongooseModels = () => {
    return new Promise((resolve, reject) => {
      mutil.generateMongooseModels(m.db, m.appModel.models, (err) => {
        if (err) {
          m.log.error("" + err);
          return reject(err);
        }
        m.log.info("Generated Mongoose models");
        resolve();
      });
    });
  };

  /**
   * Adds routes to the application router
   * @param verb i.e. get, post, put etc
   * @param route the route to add (as a string)
   * @param args array of controller functions to handle route
   */
  m.addRoute = (verb, route, args) => {
    let methodNames = {
      'get': 'GET',
      'put': 'PUT',
      'post': 'POST',
      'del': 'DELETE'
    };
    let existingRoute = _.find(m.app.router.mounts, (val, key) => {
      return val.method == methodNames[verb] && val.spec.path == route; // note that the path must be exactly the same. /path/:id and /path/:idTmp are different paths
    });
    if (existingRoute) {
      m.app.rm(existingRoute.name);
    }
    //args.unshift(m.isAuthenticated);
    args.unshift(route);
    m.app[verb].apply(m.app, args);
    m.log.trace(` ∟ ${existingRoute ? 'Replaced' : 'Added'} route: ${verb.toUpperCase()} ${route} ${_.includes(args, m.isAuthenticated) ? 'AUTH' : ''}`);
  };


  /**
   * Adds routes necessary to perform full CRUG on the global.appModel
   * @param app the app to add CRUD to
   */
  m.addAppModelRoutes = () => {

    /**
     * This adds routes to the restify app to handle CRUD for a specific schema/subschema
     * NOTE: unlike lookup method this method is not checking for existing routes
     * @param name the name of the schema/subschema
     * @param schema the schema definition
     * @param path the full path to the schema/subschema (as array)
     */
    let addCrudRoutesToSchema = (name, schema, path) => {
      let callbacks = [];
      // TODO: update this code, now it's implemented with permissions
      // isAuthenticated is added in addRoute
      callbacks.push(m.isAuthenticated);
      // TODO: this is to be depriciated in favor of server_controllers
      if (schema.controller) { // add custom routes
        const controllerPath = require('path').resolve(appRoot, 'lib', `${schema.controller}-controller`);
        try {
          require(controllerPath)(m);
        } catch (e) {
          m.log.error(`Unable to load custom controller '${controllerPath}': ${e}`);
          process.exit(1);
        }
      } else { // add standard CRUD
        // let name = pluralize(name, 2);
        let qualifiedPath = `/${_.map(path, p => p + '/:' + p + '_id').join("/") + (0 == path.length ? '' : '/')}`;
        let unqualifiedPath = `/schema/${path.join("/") + (0 == path.length ? '' : '/')}`;
        m.addRoute('get', `${unqualifiedPath}${name}`, [mainController.getSchema]); // this just returns schema, no auth is required
        m.addRoute('get', `${qualifiedPath}${name}`, callbacks.concat([mainController.getItems])); // should this even be allowed for pii/phis? Check limitReturnedRecords
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
    };

    /** Adds route to the app so it can run lookups using UI elements such as select2
     * The request should contain Get parameter q=<search> to perform the search and
     * optionally page=<number> parameter to show results in infinity scroll as
     * specified in the select2 documentation
     * @param lookup the lookup specification according to the metaschema
     * @param id the ID of the lookup
     */
      // TODO: also include authentication - it may be required for proprietary data
    let addLookupRoutesToSchema = (lookup, id) => {
        _.forEach(lookup.table, (tableLookup) => {
          const tableName = tableLookup.table;
          let path = `/lookups/${id}/${tableName}`;
          if (!_.some(m.app.router.mounts, r => r.spec.method == 'GET' && r.spec.path == path)) {
            m.addRoute('get', path, [m.isAuthenticated, mainController.getLookupTableJson]);
          }
        });
      };

    /**
     * This method recursively scans schema to find if there are subschemas and adds CRUD for them
     * It calls addCrudRoutesToSchema to add the actual CRUD
     * @param name
     * @param obj
     * @param path the path/endpoint to add to the router
     * @param authSettings app model auth settings
     */
    let addRoutesToSubschemas = (name, obj, path, authSettings) => {
      // TODO: add support for multiple tables
      _.forOwn(obj, (attribute, attributeName) => {
        if ('lookup' === attributeName && 'object' === typeof attribute) {
          let lookupId = attribute["id"];
          m.appLookups[lookupId] = attribute;
          m.log.debug(`☞ Adding routes for lookup ${path.join(".")}.${name}`);
          addLookupRoutesToSchema(attribute, lookupId);
        }
        if ('type' === attributeName && 'Subschema' === attribute) {
          m.log.debug('∟ Adding routes for subschema', `${path.join("/")}/${name}`);
          // authSettings = _.get(obj, 'requiresAuthentication');
          addCrudRoutesToSchema(name, obj, path);
        }
        if ('fields' === attributeName && 'object' === typeof attribute)
          _.forOwn(attribute, (field, fieldName) => {
            addRoutesToSubschemas(fieldName, field, path.concat([name]), authSettings);
          });
      });
    };

    _.forOwn(m.appModel.models, (schema, schemaName) => {
      m.log.debug("Adding routes for schema", schemaName);
      addCrudRoutesToSchema(schemaName, schema, []);
      addRoutesToSubschemas(schemaName, schema, []); // this includes both schemas and subschemas
    });
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
        brief: _.map(m.app.router.mounts,
          (route, key) => `${route.spec.method} ${route.spec.path}${_.includes(m.app.routes[key], m.isAuthenticated) ? ' AUTH' : ''}`),
        full: m.app.router.mounts
      }
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
        res.json({
          success: true
        });
        next();
      })
      .catch(e => {
        m.log.error("APP001", e);
        process.exit(1);
      });
  };


  // TODO: delete after mobile app refactoring, only required for mobile app framework backward compatibility
  m.addDashboardEndpoints = () => {
    m.addRoute("get", "/dashboards/:id", [m.isAuthenticated, mainController.getDashboardJson]);
  };

  m.loadCustomControllers = (appModelPath) => {
    m.log.trace('Loading custom controllers:');
    try {
      const files = _.concat(glob.sync(`${appModelPath}/server_controllers/**/*.js`));
      _.forEach(files, (file) => {
        m.log.trace(` ∟ ${file}`);
        const lib = require(file)(mongoose);
        lib.init(m);
      });
    } catch (e) {
      m.log.error(`Unable to load custom controllers: ${e.message}`);
      process.exit(2);
    }
  };

  m.loadTestController = () => {
    m.log.trace('Loading test controller:');
    try {
      let lib = require('./test-controller')(mongoose);
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
    passport.use('jwt', new JwtStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
      secretOrKey: process.env.JWT_SECRET // TODO: move into .env
    }, function (jwt_payload, done) {
      User.findOne({_id: jwt_payload.id}, function (err, user) {
        if (err) {
          done(err, false);
        } else if (user) {
          done(null, user);
        } else {
          done(null, false);
        }
      });
    }));
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
    m.app.use(passport.initialize());
    m.app.use(passport.session());
  };

  // TODO: refactor this method, use hasPermissions
  m.authenticationCheck = function (req, res, next) {
    passport.authenticate('jwt', {session: false},
      function (err, user, info) {
        req.user = undefined;
        if (err) {
          return next(`ERR: ${err} INFO:${info}`);
        } else if (!user && m.getAuthSettings().requireAuthentication !== false) {
          return res.json(401, {success: false, message: 'User session expired, please login again'});
        } else {
          req.user = user;
          m.accessUtil.injectUserPermissions(req);

          let urlParts = m.butil.getUrlParts(req);
          let model = urlParts[0].toLowerCase();
          let id = urlParts[1] ? urlParts[1].toLowerCase() : -1;
          // TODO: improve security, add more validations in the mongoose query itself
          next();
          // if (model == 'phis' && user.phiId.toLowerCase() != id) {
          //   next(new restifyErrors.NotFoundError());
          // } else if (model == 'piis' && user.piiId.toLowerCase() != id) {
          //   next(new restifyErrors.NotFoundError());
          // } else {
          //   next();
          // }
        }
      }
    )(req, res, next);
  };

  // this method is now required for everything and should implement the new ABAC permissions model
  m.isAuthenticated = function (req, res, next) {
    if (m.authenticationCheck) {
      m.authenticationCheck(req, res, next);
    } else {
      throw new Error("Please override isAuthenticate method");
    }
  };

  m.removeAllRoutes = () => {
    _.forEach(m.app.router.mounts, mount => {
      m.app.rm(mount.name);
    });
  };

  m.addRoutes = () => {
    // development and system endpoints
    m.addRoute('get', '/', [mainController.getRootJson]);
    // m.addRoute('get', /\/helpers\/?.*/, [restify.serveStatic({directory: `${process.env.APP_MODEL_DIR}/model`})]);
    m.addRoute('get', '/routes', [mainController.isDevelopmentMode, m.getRoutesJson]);
    m.addRoute('get', '/reload-model', [mainController.isDevelopmentMode, m.getReloadModel]);
    m.addRoute('get', '/metaschema', [mainController.getMetaschemaJson]);
    m.addRoute('get', '/schemas', [mainController.getSchemasJson]);
    m.addRoute('get', '/app-model', [m.isAuthenticated, mainController.getAppModelJson]);
    m.addRoute('get', '/lists', [mainController.getListsJson]);
    m.addRoute('get', '/typeDefaults', [mainController.getTypeDefaults]);
    m.addRoute('get', '/lists.js', [mainController.getClientSideCodeForLists]);
    m.addRoute('get', '/renderers.js', [mainController.getClientSideCodeForRenderers]);
    m.addRoute('get', '/custom-actions.js', [mainController.getClientSideCodeForCustomActions]);
    m.addRoute('get', '/form-renderers.js', [mainController.getClientSideCodeForFormRenderers]);
    m.addRoute('get', '/label_renderers.js', [mainController.getClientSideCodeForLabelRenderers]);
    m.addRoute('get', '/validators.js', [mainController.getClientSideCodeForValidators]);
    m.addRoute('get', '/app-model-code.js', [m.isAuthenticated, mainController.getAppModelCode]);
    m.addRoute('get', '/app-model-code.min.js', [m.isAuthenticated, mainController.getMinifiedAppModelCode]);
    m.addRoute('get', '/interface', [mainController.getInterfaceJson]);
    m.addRoute('get', '/interface/dashboard-subtypes', [mainController.getDashboardSubtypesJson]);
    m.addRoute('get', '/is-authenticated', [m.isAuthenticated, mainController.getIsAuthenticated]);
    m.addRoute('get', '/teapot', [mainController.isDevelopmentMode, mainController.sendTeapot]);
    //m.addRoute('get', /\/public\/?.*/, [restify.plugins.serveStatic({directory: `./`})]);
    //m.addRoute('get', /\/public\/?.*/, [restify.plugins.serveStatic({directory: `${process.env.APP_MODEL_DIR}`})]);
    m.addRoute('get', '/public/.*', [publicFilesController({directories: [`${process.env.APP_MODEL_DIR}`, './model']})]);
    // TODO: write tests for the file uploading/thumbnails/cropping etc
    m.addRoute('post', '/upload', [fileController.upload]);
    m.addRoute('get', '/file/:id', [fileController.getFile]);
    m.addRoute('get', '/file-cropped/:id', [fileController.getFileCropped]);
    m.addRoute('get', '/file-thumbnail/:id', [fileController.getFileThumbnail]);
    m.addRoute('get', '/download/:id', [fileController.getFile]);
    // endpoints for all models
    m.addAppModelRoutes();
    m.addDashboardEndpoints(); // TODO: remove this after mobile update
    m.loadCustomControllers(process.env.APP_MODEL_DIR);
    m.loadTestController();
  };

  m.resetRoutes = () => {
    m.removeAllRoutes();
    m.addRoutes();
  };

  function setAbsoluteEnvPaths () {
    process.env.LOG4JS_CONFIG = path.resolve(appRoot, process.env.LOG4JS_CONFIG);
    process.env.APP_MODEL_DIR = path.resolve(appRoot, process.env.APP_MODEL_DIR);
  }

  /**
   * App setup, configures everything but doesn't start the app
   * For tests just setup the app
   * For the actual server also call app.start();
   */
  m.setup = () => {
    setAbsoluteEnvPaths();
    return m.connectToDb()
      .then(() => {
        m.log.info("Using logger settings from", process.env.LOG4JS_CONFIG);
        return m.loadModel();
      })
      .then(() => {
        m.log.info('Loaded rolesToPermissions: ', JSON.stringify(m.appModel.rolesToPermissions, null, 2));
        const modelProblems = mutil.validateAndCleanupAppModel();
        if (modelProblems.length > 0) {
          throw new Error(modelProblems.join("\n"));
        }
        return m.generateMongooseModels();
      })
      .then(() => {
        const app = restify.createServer({name: process.env.APP_NAME, version: APP_VERSION});
        m.configureApp(app);

        m.addUserAuthentication();
        m.addRoutes();
        websocketServer.connect(m.app);

        m.log.info(`HC Backend server v${APP_VERSION} has been set up`);
        return m;
      })
      .catch(err => {
        m.log.error(err);
        throw err;
      });
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
    _.forOwn(models, (val, key) => {
      delete models[key];
    });
    m.log.trace(`Deleted mongoose models`);

    return Promise.all([
      new Promise((resolve) => {
        if (!m.app) {
          return resolve();
        }
        m.app.close(function () {
          m.log.trace("Closed app");
        });
        m.app.once('close', () => {
          resolve();
        })
      }),
      mongoose.connection.close()
        .then(() => m.log.trace("Closed mongoose.connection"))
    ]);
  };

  return m;
};
