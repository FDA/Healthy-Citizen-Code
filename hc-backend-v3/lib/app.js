const APP_VERSION = "0.3.1";

// TODO: rewrite everything using ES6 Promises instead of async
// TODO: do I need to export anything besides setup() and start()? Get rid of exporting the rest later if necessary
module.exports = function () {
    const dotenv = require('dotenv').load({path: '.env'});
    const mongoose = require('mongoose');
    const restify = require('restify');
    const _ = require('lodash');
    const log = require('log4js').getLogger('lib/app');
    const mongooseLog = require('log4js').getLogger('mongoose');
    const restifyLog = require('log4js').getLogger('restify');
    const pluralize = require('pluralize');
    const async = require('async');
    const restifyErrors = require('restify-errors');
    const websocketServer = require('./websocket-server')();
    const passport = require('passport');
    const JwtStrategy = require('passport-jwt').Strategy;
    const ExtractJwt = require('passport-jwt').ExtractJwt;
    const crypto = require('crypto');
    const glob = require("glob");

    const mutil = require('./model')();
    const mainController = require("./default-controller")();
    const butil = require('./backend-util')();

    let m = {};

    /**
     * Reference to the restify application
     */
    m.app = null;

    /**
     * Reference to the mainController
     */
    m.mainController = mainController;

    /**
     * Need to make sure that users understand that we will keep link to all their current connections to send proper notifications
     * @type {{}}
     */
    m.userConnections = {};

    /**
     * Mongoose db connection
     */
    m.db = null;

    // note that the real m.isAuthenticated is defined in the user controller
    m.isAuthenticated = function (/*req, res, next*/) {
        throw new Error("Please override isAuthenticate method");
    };

    /**
     * Connects to DB and sets various DB parameters
     * @param cb
     */
    m.connectToDb = (cb) => {
        if(mongoose.connection.readyState == 1) {
            cb();
        } else {
            mongoose.Promise = global.Promise;
            if ('true' == process.env.DEVELOPMENT) {
                mongoose.set('debug', function (coll, method, query, doc, options) {
                    mongooseLog.debug(`${method} ${coll}, ${JSON.stringify(query)}, DOC:${JSON.stringify(doc)}, OPTIONS:${JSON.stringify(options)}`);
                });
            }
            m.db = mongoose.connect(process.env.MONGODB_URI);
            mongoose.connection.on('connected', function (connection) {
                log.info('MongoDB connection established');
                mutil.db = mongoose.connection;
                cb();
            });
            mongoose.connection.on('error', function (err) {
                log.error(`LAP003: MongoDB connection error. Please make sure MongoDB is running at ${process.env.MONGODB_URI}: ${err}`);
                cb("MongoDB connection error. Please make sure MongoDB is running");
            });
        }
    };
    m.configureApp = (app) => {
        m.app = app;
        app.on('uncaughtException', (req, res, route, err) => {
            log.error(`LAP001: Uncaught exception ${err} with call stack ${err.stack}`);
            res.json(500, {success: false, code: "LAP001", message: "" + err});
        });
        app.on('InternalServer', (req, res, route, err) => {
            log.error(`LAP002: Internal server error ${err}`);
            res.json(500, {success: false, code: "LAP002", message: "" + err});
        });
        app.on('InternalServerError', (req, res, route, err) => {
            log.error(`LAP003: Internal server error ${err}`);
            res.json(500, {success: false, code: "LAP003", message: "" + err});
        });
        process.on('uncaughtException', (err) => {
            log.error(`LAP004: Uncaught node exception ${err} with call stack ${err.stack}`);
        });
        app.on('pre', (req, res) => {
            restifyLog.info(`${req.method} ${req.url}`);
        });
        app.on('after', (req, res, route, err) => {
            if(err) {
                restifyLog.error(`${req.method} ${req.url} -> ${res.statusCode}${err ? ', ERR:' + err : ''}`);
            }
        });
        app.use(restify.queryParser());
        app.use(restify.bodyParser());
        app.use(restify.gzipResponse());
        //app.use(restify.requestLogger());
        app.use(restify.CORS({
            origins: ['*'],
            credentials: false
        }));
    };

    m.addCorsSupport = (app) => {
        restify.CORS.ALLOW_HEADERS.push("authorization");
        app.on("MethodNotAllowed", function (req, res) {
            if (req.method.toUpperCase() === "OPTIONS") {
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Methods", "*");
                res.header("Access-Control-Allow-Headers", restify.CORS.ALLOW_HEADERS.join(", "));
                res.send(204);
            }
            else {
                res.send(new restify.MethodNotAllowedError());
            }
        });
    };

    m.loadModel = () => {
        butil.loadLists();
        butil.loadValidators();
        butil.loadTransformers();
        butil.loadLabelRenderers();
        global.appModel = mutil.getCombinedModel(`${process.env.APP_MODEL_DIR}/model`, 'model/model');
        global.appLookups = {}; // model lookups will be stored here
        //log.trace("Loaded model\n" + JSON.stringify(appModel, null, 4));
    };

    /**
     * Generates mongoose models according to the appModel
     * @param cb
     */
    m.generateMongooseModels = (cb) => {
        mutil.generateMongooseModels(m.db, appModel.models, (err) => {
            if (err) {
                log.error("" + err);
            } else {
                log.info("Generated Mongoose models");
            }
            cb(err);
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
        let existingRoute = _.find(app.router.mounts, (val, key) => {
            return val.method == methodNames[verb] && val.spec.path == route; // note that the path must be exactly the same. /path/:id and /path/:idTmp are different paths
        });
        if (existingRoute) {
            app.rm(existingRoute.name);
        }
        //args.unshift(m.isAuthenticated);
        args.unshift(route);
        app[verb].apply(app, args);
        log.trace(` ∟ ${existingRoute?'Replaced':'Added'} route: ${verb.toUpperCase()} ${route} ${_.includes(args, m.isAuthenticated) ? 'AUTH' : ''}`);
    };


    /**
     * Adds routes necessary to perform full CRUG on the global.appModel
     * @param app the app to add CRUD to
     */
    m.addAppModelRoutes = (app) => {

        /**
         * This adds routes to the restify app to handle CRUD for a specific schema/subschema
         * NOTE: unlike lookup method this method is not checking for existing routes
         * @param name the name of the schema/subschema
         * @param schema the schema definition
         * @param path the full path to the schema/subschema (as array)
         * @param requiresAuthentication if true then the exposed path will require authentication
         */
        let addCrudRoutesToSchema = (name, schema, path, requiresAuthentication) => {
            let callbacks = [];
            if (requiresAuthentication) {
                callbacks.push(m.isAuthenticated);
            }
            if (schema.controller) { // add custom routes
                try {
                    require(`./${schema.controller}-controller`)(m);
                } catch (e) {
                    log.error(`Unable to load custom controller './${schema.controller}-controller': ${e}`);
                    process.exit(1);
                }
            } else { // add standard CRUD
                let pluralName = pluralize(name, 2);
                let qualifiedPath = `/${_.map(path, p => p + '/:' + p + '_id').join("/") + ( 0 == path.length ? '' : '/' )}`;
                let unqualifiedPath = `/schema/${path.join("/") + ( 0 == path.length ? '' : '/' )}`;
                m.addRoute('get', `${unqualifiedPath}${pluralName}`, [mainController.getSchema]); // this just returns schema, no auth is required
                m.addRoute('get', `${qualifiedPath}${pluralName}`, callbacks.concat([mainController.getItems])); // should this even be allowed for pii/phis? Check limitReturnedRecords
                m.addRoute('post', `${qualifiedPath}${pluralName}`, callbacks.concat([mainController.postItem]));
                m.addRoute('get', `${qualifiedPath}${pluralName}/:id`, callbacks.concat([mainController.getItem]));
                m.addRoute('put', `${qualifiedPath}${pluralName}/:id`, callbacks.concat([mainController.putItem]));
                m.addRoute('del', `${qualifiedPath}${pluralName}/:id`, callbacks.concat([mainController.deleteItem]));
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
                let path = `/lookups/${id}`;
                if (!_.some(app.router.mounts, r => r.spec.method == 'GET' && r.spec.path == path)) {
                    m.addRoute('get', path, [mainController.getLookupTableJson]);
                }
            };

        /**
         * This method recursively scans schema to find if there are subschemas and adds CRUD for them
         * It calls addCrudRoutesToSchema to add the actual CRUD
         * @param name
         * @param obj
         * @param path the path/endpoint to add to the router
         * @param requiresAuthentication if true then the exposed path will require authentication
         */
        let addRoutesToSubschemas = (name, obj, path, requiresAuthentication) => {
            // TODO: add support for multiple tables
            _.forOwn(obj, (attribute, attributeName) => {
                if ('lookup' == attributeName && 'object' == typeof attribute && attribute.hasOwnProperty('table') && attribute.hasOwnProperty('foreignKey') && attribute.hasOwnProperty('id')) {
                    let lookupId = attribute["id"];
                    appLookups[lookupId] = attribute;
                    log.debug(`☞ Adding routes for lookup ${path.join(".")}.${name} -> ${attribute.table} as ${lookupId}`);
                    addLookupRoutesToSchema(attribute, lookupId);
                }
                if ('type' == attributeName && 'Subschema' == attribute) {
                    log.debug('∟ Adding routes for subschema', `${path.join("/")}/${name}`);
                    requiresAuthentication = _.get(obj, 'requiresAuthentication');
                    addCrudRoutesToSchema(name, obj, path, requiresAuthentication);
                }
                if ('fields' == attributeName && 'object' == typeof attribute)
                    _.forOwn(attribute, (field, fieldName) => {
                        addRoutesToSubschemas(fieldName, field, path.concat([name]), requiresAuthentication);
                    });
            });
        };

        _.forOwn(appModel.models, (schema, schemaName) => {
            log.debug("Adding routes for schema", schemaName);
            addCrudRoutesToSchema(schemaName, schema, [], _.get(schema, 'requiresAuthentication'));
            addRoutesToSubschemas(schemaName, schema, [], _.get(schema, 'requiresAuthentication')); // this includes both schemas and subschemas
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
                brief: _.map(app.router.mounts,
                    (route, key) => `${route.spec.method} ${route.spec.path}${_.includes(app.routes[key], m.isAuthenticated) ? ' AUTH' : ''}`),
                full: app.router.mounts
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
                log.error("APP001", e);
                process.exit(1);
            });
    };

    // Added for backward compatibility with mobile app
    // TODO: delete after mobile app refactoring
    m.addDashboardEndpoints = () => {
        m.addRoute("get", "/dashboards/:id", [mainController.getDashboardJson]);
        /* The following code is not required since dashboard controllers are now added as custom controllers
        let dashboardsIds = _(appModel.interface).map((val, key) => {
            return 'Dashboard' == val.type ? key : false
        }).compact().value();
        dashboardsIds.forEach((id) => {
            if(dashboardController.hasOwnProperty(id)) {
                m.addRoute('get', `/dashboards/${id}/data`, [m.isAuthenticated, dashboardController[id]]);
            } else {
                log.warn(`Unable to add routes for dashboard ${id}`);
            }
        })
        */
    };

    m.loadCustomControllers = (appModelPath) => {
        log.trace( 'Loading custom controllers:' );
        try {
            const files = _.concat(glob.sync(appModelPath + "/server_controllers/**/*.js"));
            _.forEach(files, (file) => {
                log.trace(` ∟ ${file}`);
                let lib = require('../' + file.substr(0, file.length - 3))(mongoose);
                lib.init(m);
            });
        } catch (e) {
            log.error(`Unable to load custom controllers: ${JSON.stringify(e)}`);
            process.exit(2);
        }
    };

    m.loadTestController = () => {
        log.trace( 'Loading test controller:' );
        try {
            let lib = require('./test-controller')(mongoose);
            lib.init(m);
        } catch (e) {
            log.error(`Unable to load test controller: ${e}`);
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
            jwtFromRequest: ExtractJwt.fromAuthHeader(),
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

        // TODO: refactor this method, use hasPermissions
        m.authenticationCheck = function (req, res, next) {
            passport.authenticate('jwt', {session: false},
                function (err, user, info) {
                    req.user = undefined;
                    if (err) {
                        return next(`ERR: ${err} INFO:${info}`);
                    } else if (!user) {
                        return res.json(401, {success: false, message: 'User session expired, please login again'});
                    } else {
                        req.user = user;
                        let urlParts = butil.getUrlParts(req);
                        let model = urlParts[0].toLowerCase();
                        let id = urlParts[1] ? urlParts[1].toLowerCase() : -1;
                        // TODO: improve security, add more validations in the mongoose query itself
                        if (model == 'phis' && user.phiId.toLowerCase() != id) {
                            next(new restifyErrors.NotFoundError());
                        } else if (model == 'piis' && user.piiId.toLowerCase() != id) {
                            next(new restifyErrors.NotFoundError());
                        } else {
                            next();
                        }
                    }
                }
            )(req, res, next);
        };
    };

    m.isAuthenticated = function (req, res, next) {
        if (m.authenticationCheck) {
            m.authenticationCheck(req, res, next);
        } else {
            throw new Error("Please override isAuthenticate method");
        }
    };

    /**
     * App setup, configures everything but doesn't start the app
     * For tests just setup the app
     * For the actual server also call app.start();
     */
    m.setup = () => {
        return new Promise((resolve, reject) => {
            async.series([
                m.connectToDb,
                (cb) => {
                    log.info("Using logger settings from", process.env.LOG4JS_CONFIG);
                    try {
                        m.loadModel(); // loads into global.appModel
                        let modelProblems = mutil.validateAndCleanupAppModel();
                        if (modelProblems.length > 0) {
                            cb(modelProblems.join("\n"));
                        } else {
                            m.generateMongooseModels(cb);
                        }
                    } catch (e) {
                        cb(`Unable to load app model and generate Mongoose model: ${e}`);
                    }
                },
                (cb) => {
                    global.app = restify.createServer({name: process.env.APP_NAME, version: APP_VERSION});
                    m.configureApp(app);
                    m.addUserAuthentication();
                    cb();
                },
                (cb) => {
                    // development and system endpoints
                    m.addRoute('get', '/', [mainController.getRootJson]);
                    //m.addRoute('get', /\/helpers\/?.*/, [restify.serveStatic({directory: `${process.env.APP_MODEL_DIR}/model`})]);
                    m.addRoute('get', '/routes', [mainController.isDevelopmentMode, m.getRoutesJson]);
                    m.addRoute('get', '/reload-model', [mainController.isDevelopmentMode, m.getReloadModel]);
                    m.addRoute('get', '/metaschema', [mainController.getMetaschemaJson]);
                    m.addRoute('get', '/schemas', [mainController.getSchemasJson]);
                    m.addRoute('get', '/app-model', [mainController.getAppModelJson]);
                    m.addRoute('get', '/lists', [mainController.getListsJson]);
                    m.addRoute('get', '/typeDefaults', [mainController.getTypeDefaults]);
                    m.addRoute('get', '/lists.js', [mainController.getClientSideCodeForLists]);
                    m.addRoute('get', '/label_renderers.js', [mainController.getClientSideCodeForLabelRenderers]);
                    m.addRoute('get', '/validators.js', [mainController.getClientSideCodeForValidators]);
                    m.addRoute('get', '/app-model-code.js', [mainController.getAppModelCode]);
                    m.addRoute('get', '/app-model-code.min.js', [mainController.getMinifiedAppModelCode]);
                    m.addRoute('get', '/interface', [mainController.getInterfaceJson]);
                    m.addRoute('get', '/interface/dashboard-subtypes', [mainController.getDashboardSubtypesJson]);
                    m.addRoute('get', '/is-authenticated', [m.isAuthenticated, mainController.getIsAuthenticated]);
                    m.addRoute('get', '/teapot', [mainController.isDevelopmentMode, mainController.sendTeapot]);
                    m.addRoute('get', /\/public\/?.*/, [restify.serveStatic({directory: `${process.env.APP_MODEL_DIR}`})]);
                    m.addRoute('post', '/upload', [mainController.postUpload]);
                    // endpoints for all models
                    m.addAppModelRoutes(app);
                    m.addDashboardEndpoints(app);
                    m.loadCustomControllers(process.env.APP_MODEL_DIR);
                    m.loadTestController();
                    m.addCorsSupport(app);
                    cb();
                },
                (cb) => { // setup websockets
                    websocketServer.connect(global.app, cb);
                }
            ], function (err) {
                if (err) {
                    reject(err);
                } else {
                    log.info(`HC Backend server v${APP_VERSION} has been set up`);
                    resolve(m);
                }
            });
        });
    };

    /**
     * Starts the application. It's been extracted into a separate routine to make testing possible.
     */
    m.start = () => {
        global.app.listen(process.env.APP_PORT);
        log.info('App is listening on port', process.env.APP_PORT);
    };

    return m;
};