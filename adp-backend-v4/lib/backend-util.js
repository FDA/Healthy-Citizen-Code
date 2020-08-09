/**
 * Implements various utilities used in the backend
 * @returns {{}}
 */
module.exports = function () {
    const _ = require('lodash');
    const fs = require('fs');
    const mongoose = require("mongoose");
    const log = require('log4js').getLogger('lib/backend-util');
    const crypto = require('crypto');
    const path = require('path');
    const restifyErrors = require('restify-errors');

    let m = {};

    m.getUrlParts = (req) => {
        return encodeURI(req.url).replace(/^\//, '').replace(/\.json.*$/, '').replace(/\?.*$/, '').split('/'); // TODO: .toLocaleLowerCase()
    };

    let safeRequire = (module) => {
        let fileName = `${module}.js`;
        if(fs.existsSync(fileName)) {
            return require(`../${module}`);
        } else {
            return function() {};
        }
    };

    // TODO: unify loadZZZ() methods
    loadHelper = (corePath, appPath, name, arg) => {
        if ('undefined' === typeof appModelHelpers) {
            global.appModelHelpers = {};
        }
        let app_model_helper_name = _.upperFirst(_.camelCase(name));
        let core_file = `${corePath||'model/'}helpers/${name}`;
        let app_file_relative = `${process.env.APP_MODEL_DIR}`;
        let app_file = `${appPath||app_file_relative}/helpers/${name}`;
        log.trace(`Loading helper ${name} into ${app_model_helper_name} from ${core_file} and ${app_file}`);
        appModelHelpers[app_model_helper_name] = _.merge(
            safeRequire(core_file)(arg),
            safeRequire(app_file)(arg)
        );
    };

    m.loadLists = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'lists');
    };

    m.loadRenderers = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'renderers');
    };

    m.loadCustomActions = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'custom_actions');
    };

    m.loadLabelRenderers = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'label_renderers');
    };

    m.loadValidators = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'validators', require('../model/helpers/validators-util')());
        appModelHelpers.ValidatorUtils = require('../model/helpers/validators-util')();
    };

    m.loadTransformers = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'transformers', mongoose);
    };

    m.loadSynthesizers = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'synthesizers', mongoose);
    };

    m.loadFormRenderers = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'form_renderers', mongoose);
    };

    m.generateId = (base) => crypto.createHash('md5').update(base || ("" + Date.now() + Math.random() * 1000)).digest("hex").substr(4, 24);

    m.camelCase2CamelText = (key) => {
        return _.capitalize(key.replace(/([A-Z](?=[A-Z][a-z])|[^A-Z](?=[A-Z])|[a-zA-Z](?=[^a-zA-Z]))/g, '$1 '));
    };

    m.handlePublicFileNotFound = (req, res, err, next) => {
        if(_.get(err, "body.code") === "ResourceNotFound" && _.get(req, 'url').match(/^\/public\//i)) {
            let serveFileFromStats = (file, err, stats, isGzip, req, res, next) => {
                if (typeof req.connectionState === 'function' &&
                    (req.connectionState() === 'close' ||
                        req.connectionState() === 'aborted')) {
                    next(false);
                    return;
                }

                if (err) {
                    next(new restifyErrors.ResourceNotFoundError(err, '%s', req.path()));
                    return;
                } else if (!stats.isFile()) {
                    next(new restifyErrors.ResourceNotFoundError('%s does not exist', req.path()));
                    return;
                }

                if (res.handledGzip && isGzip) {
                    res.handledGzip();
                }

                let fstream = fs.createReadStream(file + (isGzip ? '.gz' : ''));
                let opts = {}; // match these to lib/app.js:454
                let maxAge = opts.maxAge === undefined ? 3600 : opts.maxAge;
                fstream.once('open', function (fd) {
                    res.cache({maxAge: maxAge});
                    res.set('Content-Length', stats.size);
                    res.set('Content-Type', mime.getType(file));
                    res.set('Last-Modified', stats.mtime);

                    if (opts.charSet) {
                        var type = res.getHeader('Content-Type') +
                            '; charset=' + opts.charSet;
                        res.setHeader('Content-Type', type);
                    }

                    if (opts.etag) {
                        res.set('ETag', opts.etag(stats, opts));
                    }
                    res.writeHead(200);
                    fstream.pipe(res);
                    fstream.once('close', function () {
                        next(false);
                    });
                });

                res.once('close', function () {
                    fstream.close();
                });

            };
            let file = `./model/${req.path()}`;
            fs.stat(file, function (err, stats) {
                if (!err && stats.isDirectory() && opts.default) {
                    var filePath = path.join(file, opts.default);
                    fs.stat(filePath, function (dirErr, dirStats) {
                        serveFileFromStats(filePath, dirErr, dirStats, false, req, res, next);
                    });
                } else {
                    serveFileFromStats(file, err, stats, false, req, res, next);
                }
            });
        } else {
            next(new restifyErrors.ResourceNotFoundError(err));
        }
    };

    return m;
};
