const APP_VERSION = "0.3.1";
const fs = require('fs');
const mongoose = require("mongoose");
const log = require('log4js').getLogger('lib/app-util');
const {MongoClient} = require('mongodb');
const _ = require('lodash');
const path = require('path');
const appRoot = require('app-root-path').path;

// TODO: rewrite everything using ES6 Promises instead of async
// TODO: do I need to export anything besides setup() and start()? Get rid of exporting the rest later if necessary
module.exports = function (appLib) {
  const m = {};

  const safeRequire = (module) => {
    const fullModulePath = path.resolve(appRoot, module);
    const fileName = `${fullModulePath}.js`;
    if (fs.existsSync(fileName)) {
      return require(`${fullModulePath}`);
    } else {
      return function () {
      };
    }
  };

  // TODO: unify loadZZZ() methods
  loadHelper = (corePath, appPath, name, arg) => {
    if ('undefined' === typeof appLib.appModelHelpers) {
      appLib.appModelHelpers = {};
    }
    let app_model_helper_name = _.upperFirst(_.camelCase(name));
    let core_file = `${corePath || 'model/'}helpers/${name}`;
    let app_file_relative = `${process.env.APP_MODEL_DIR}`;
    let app_file = `${appPath || app_file_relative}/helpers/${name}`;
    log.trace(`Loading helper ${name} into ${app_model_helper_name} from ${core_file} and ${app_file}`);
    appLib.appModelHelpers[app_model_helper_name] = _.merge(
      safeRequire(core_file)(arg),
      safeRequire(app_file)(arg)
    );
  };

  m.loadLists = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'lists');
  };

  m.loadRolesToPermissions = () => {
    appLib.appModel.rolesToPermissions = _.clone(appLib.accessCfg.ROLES_TO_PERMISSIONS);

    const allAppPermissionsSet = appLib.accessUtil.getAllAppPermissionsSet();
    const superAdmin = appLib.accessCfg.ROLES.SuperAdmin;
    appLib.appModel.rolesToPermissions[superAdmin] = Array.from(allAppPermissionsSet);

    // TODO: should remove some roles from general list?
    // form roles for appModelHelpers['Lists']
    const roles = _.clone(appLib.accessCfg.ROLES);

    let dbCon;
    log.trace(`Retrieving roles to permissions data from db`);
    return new Promise((resolve, reject) => {
      MongoClient.connect(process.env.MONGODB_URI, (err, db) => {
        if (err) {
          reject(`Cannot get connection to ${process.env.MONGODB_URI}`);
          return;
        }
        resolve(db);
      })
    })
      .then((db) => {
        dbCon = db;
        return dbCon.collection('roles').find().toArray();
      })
      .then((results) => {
        results.forEach(r => {
          const roleName = r.name;
          appLib.appModel.rolesToPermissions[roleName] = r.permissions;
          roles[roleName] = roleName;
        });

        appLib.appModelHelpers['Lists'].roles = roles;

        dbCon.close();
        log.trace(`Successfully retrieved roles to permissions data from db`);
      })
      .catch((err) => {
        log.error(`Error occurred while retrieving roles to permissions data from db`);
        throw err;
      });
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
    appLib.appModelHelpers.ValidatorUtils = require('../model/helpers/validators-util')(appLib);
    loadHelper(corePath, appPath, 'validators', appLib);
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

  m.loadPermissions = () => {
    appLib.declaredPermissions = _.get(appLib, 'appModel.interface.app.permissions', {});
    // save declaredPermissionNames for future granting permissions to SuperAdmin
    appLib.declaredPermissionNames = _.keys(appLib.declaredPermissions);

    // inject declaredPermissions to Lists to use it in roles schema
    const permissionsList = _.reduce(appLib.declaredPermissions, (result, obj, key) => {
      result[key] = key;
      return result;
    }, {});
    _.set(appLib, 'appModelHelpers.Lists.declaredPermissions', permissionsList);
  };

  m.loadPermissionScopePreparations = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'preparations', mongoose);
  };

  return m;
};
