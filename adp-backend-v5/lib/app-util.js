const fs = require('fs');
const mongoose = require('mongoose');
const log = require('log4js').getLogger('lib/app-util');
const { MongoClient } = require('mongodb');
const _ = require('lodash');
const path = require('path');
const appRoot = require('app-root-path').path;

// TODO: rewrite everything using ES6 Promises instead of async
// TODO: do I need to export anything besides setup() and start()? Get rid of exporting the rest later if necessary
module.exports = appLib => {
  const m = {};

  const safeRequire = module => {
    const fullModulePath = path.resolve(appRoot, module);
    const fileName = `${fullModulePath}.js`;
    if (fs.existsSync(fileName)) {
      return require(fullModulePath);
    }
    return () => {};
  };

  // TODO: unify loadZZZ() methods
  const loadHelper = (corePath, appPath, name, arg) => {
    if (_.isUndefined(appLib.appModelHelpers)) {
      appLib.appModelHelpers = {};
    }
    const appModelHelperName = _.upperFirst(_.camelCase(name));
    const coreFile = `${corePath || 'model/'}helpers/${name}`;
    const appFileRelative = `${process.env.APP_MODEL_DIR}`;
    const appFile = `${appPath || appFileRelative}/helpers/${name}`;
    log.trace(`Loading helper ${name} into ${appModelHelperName} from ${coreFile} and ${appFile}`);
    appLib.appModelHelpers[appModelHelperName] = _.merge(
      safeRequire(coreFile)(arg),
      safeRequire(appFile)(arg)
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
    return MongoClient.connect(process.env.MONGODB_URI)
      .catch(err => {
        throw new Error(`Cannot get connection to ${process.env.MONGODB_URI}: ${err}`);
      })
      .then(db => {
        dbCon = db;
        return dbCon
          .collection('roles')
          .find()
          .toArray();
      })
      .then(results => {
        results.forEach(r => {
          const roleName = r.name;
          appLib.appModel.rolesToPermissions[roleName] = r.permissions;
          roles[roleName] = roleName;
        });

        appLib.appModelHelpers.Lists.roles = roles;

        dbCon.close();
        log.trace(`Successfully retrieved roles to permissions data from db`);
      })
      .catch(err => {
        log.error(`Error occurred while retrieving roles to permissions data from db: ${err}`);
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
    const defaultPermissionsNames = _.keys(appLib.accessCfg.PERMISSIONS);

    // inject availablePermissions to Lists to use it in roles schema
    // available permissions are declared permissions except system permissions
    const availablePermissions = _.reduce(
      appLib.declaredPermissionNames,
      (result, permName) => {
        if (!defaultPermissionsNames.includes(permName)) {
          result[permName] = permName;
        }
        return result;
      },
      {}
    );
    _.set(appLib, 'appModelHelpers.Lists.availablePermissions', availablePermissions);
  };

  m.loadPermissionScopePreparations = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'preparations', mongoose);
  };

  return m;
};
