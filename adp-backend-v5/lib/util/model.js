const RJSON = require('relaxed-json');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');
const glob = require('glob');
const ejs = require('ejs');
const { CallStackError } = require('../errors');
const { mergeFiles } = require('../public-files-controller');

const { getTransformedInterfaceAppPermissions } = require('../access/transform-permissions');

// We need to distinguish backend and frontend delimiters used in app schema to leave frontend ejs code as is and let frontend evaluate it
const EJS_BACKEND_APP_SCHEMA_DELIMETER = '@';

function getMacrosSchemeChange(schemeBefore, schemeAfter) {
  if (schemeBefore === schemeAfter) {
    return null;
  }
  if (_.isEmpty(schemeBefore)) {
    return schemeAfter;
  }

  const schemeChange = {};
  _.each(schemeAfter, (val, key) => {
    if (!_.isEqual(schemeAfter[key], schemeBefore[key])) {
      schemeChange[key] = schemeAfter[key];
    }
  });
  return schemeChange;
}

async function updateMacros({ macrosSchemeChange, macros, macrosDirPaths, functionContext }) {
  await Promise.mapSeries(_.entries(macrosSchemeChange), async ([macrosName, macrosSpec]) => {
    macros[macrosName] = {};
    const macro = macros[macrosName];
    macro.parameters = getMacrosParameters(macrosSpec.parameters);
    macro.func = await getMacrosFunc(macrosSpec, functionContext);
  });

  return macros;

  async function getMacrosFunc(macrosSpec, context) {
    // specify ejs context to make context functions visible for ejs when called recursively
    const ejsOptions = { context, delimiter: EJS_BACKEND_APP_SCHEMA_DELIMETER };
    if (macrosSpec.inline) {
      return ejs.compile(macrosSpec.inline, ejsOptions).bind(context);
    }

    const { file } = macrosSpec;
    if (file) {
      const { files, type } = await mergeFiles(macrosDirPaths, file);
      if (type !== 'file' || files.length !== 1) {
        throw new Error(`Unable to find any macros files for '${file}'.`);
      }
      const macrosCode = await fs.readFile(files[0].filePath, 'utf8');
      return ejs.compile(macrosCode, ejsOptions).bind(context);
    }

    throw new Error(`Invalid macros specification, should have 'inline' or 'file' attribute`);
  }

  function getMacrosParameters(fullMacrosParams) {
    const params = {};
    _.each(fullMacrosParams, (val, key) => {
      params[key] = val.default;
    });
    return params;
  }
}

function parseModel(modelContent) {
  try {
    return RJSON.parse(modelContent);
  } catch (e) {
    return null;
  }
}

async function combineModels({ modelSources, log = () => {}, appModelProcessors, macrosDirPaths }) {
  const model = {};
  const macros = {};
  const errors = [];

  await Promise.mapSeries(modelSources, (modelSource, index) => {
    if (_.isPlainObject(modelSource)) {
      log(`Merging modelSources object with index ${index}`);
      return mergePartToModel(model, modelSource);
    }
    if (!_.isString(modelSource)) {
      return errors.push(`Invalid modelSource, should be object of path to a file type: ${modelSource}.`);
    }

    log('Merging', modelSource);
    let jsonFiles;
    if (!modelSource.endsWith('json')) {
      jsonFiles = glob.sync(`${modelSource}/**/*.json`);
    } else {
      jsonFiles = glob.sync(modelSource);
    }

    const macrosFunctionContext = { ...appModelProcessors, macros };
    if (_.isFunction(appModelProcessors.M)) {
      appModelProcessors.M = appModelProcessors.M.bind(macrosFunctionContext);
    }

    return Promise.mapSeries(jsonFiles, async (jsonFile) => {
      try {
        const modelContent = await fs.readFile(jsonFile, 'utf8');
        const modelPart = parseModel(modelContent);
        const hasMacros = _.get(modelPart, 'macros');
        if (hasMacros) {
          // merge macros to model to build macros specification (it must not include macros) before processing other model parts
          const prevMacros = _.cloneDeep(model.macros);
          mergePartToModel(model, modelPart);

          // Macros from model may override macros from core, therefore macros are changed during parsing process
          // Reference macrosFunctionContext.macros is updated
          const macrosSchemeChange = getMacrosSchemeChange(prevMacros, model.macros);
          return updateMacros({
            macrosSchemeChange,
            macros,
            macrosDirPaths,
            functionContext: macrosFunctionContext,
          });
        }

        const ejsOptions = { async: true, context: macrosFunctionContext, delimiter: EJS_BACKEND_APP_SCHEMA_DELIMETER };
        const expandedModel = await ejs.render(modelContent, {}, ejsOptions);

        const expandedModelPart = parseModel(expandedModel);
        if (expandedModelPart) {
          return mergePartToModel(model, expandedModelPart);
        }
        errors.push(`Invalid model is expanded with macros for file "${jsonFile}". Invalid model: ${expandedModel}`);
      } catch (e) {
        if (e instanceof CallStackError) {
          return errors.push(`Unable to parse model for file "${jsonFile}". ${e.message}`);
        }
        errors.push(`Unable to parse model for file "${jsonFile}". ${e.stack}`);
      }
    });
  });

  if (!_.isEmpty(errors)) {
    throw new Error(`Errors occurred during model combine:\n${errors.join('\n')}`);
  }

  return model;

  function transformPermissionsInPart(part, _errors) {
    const appPermissions = _.get(part, 'interface.app.permissions');
    const newAppPermissions = getTransformedInterfaceAppPermissions(appPermissions, _errors);
    newAppPermissions && _.set(part, 'interface.app.permissions', newAppPermissions);
  }

  function mergePartToModel(wholeModel, newPart) {
    transformPermissionsInPart(newPart, errors);
    _.mergeWith(wholeModel, newPart, (modelVal, newVal) => {
      if (_.isArray(modelVal) && _.isArray(newVal)) {
        return modelVal.concat(newVal);
      }
    });
  }
}

module.exports = {
  combineModels,
};
