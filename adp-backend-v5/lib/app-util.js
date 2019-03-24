const fs = require('fs');
const mongoose = require('mongoose');
const log = require('log4js').getLogger('lib/app-util');
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

  m.loadRenderers = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'renderers');
  };

  m.loadCustomActions = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'custom_actions');
  };

  m.loadLabelRenderers = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'label_renderers');
  };

  m.loadHeaderRenderers = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'header_renderers');
  };

  m.loadLookupLabelRenderers = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'lookup_label_renderers');
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

  m.loadHooks = (corePath, appPath) => {
    loadHelper(corePath, appPath, 'hooks', appLib);
  };

  return m;
};
