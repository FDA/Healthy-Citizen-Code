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

    let m = {};

    m.getUrlParts = (req) => {
        return encodeURI(req.url).replace(/^\//, '').replace(/\.json.*$/, '').replace(/\?.*$/, '').split('/'); // TODO: .toLocaleLowerCase()
    };

    // TODO: unify loadZZZ() methods
    loadHelper = (corePath, appPath, name, arg) => {
        if ('undefined' === typeof appModelHelpers) {
            global.appModelHelpers = {};
        }
        let app_model_helper_name = _.upperFirst(_.camelCase(name));
        let core_file = `${corePath||'../model/'}helpers/${name}`;
        let app_file_relative = `../${process.env.APP_MODEL_DIR}`;
        let app_file = `${appPath||app_file_relative}/helpers/${name}`;
        log.trace(`Loading helper ${name} into ${app_model_helper_name} from ${core_file} and ${app_file}`);
        appModelHelpers[app_model_helper_name] = _.merge(
            require(core_file)(arg),
            require(app_file)(arg)
        );
    };

    m.loadLists = (corePath, appPath) => {
        loadHelper(corePath, appPath, 'lists');
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

    m.generateId = (base) => crypto.createHash('md5').update(base || ("" + Date.now() + Math.random() * 1000)).digest("hex").substr(4, 24);

    return m;
};