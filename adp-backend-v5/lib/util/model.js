const RJSON = require('relaxed-json');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');
const glob = require('glob');
const ejs = require('ejs');
const { CallStackError } = require('../errors');
const { mergeFiles } = require('../public-files-controller');

const { getTransformedInterfaceAppPermissions } = require('../access/transform-permissions');

function getMacrosesSchemeChange(schemeBefore, schemeAfter) {
  if (schemeBefore === schemeAfter) {
    return null;
  }

  const schemeChange = {};
  _.each(schemeAfter, (val, key) => {
    if (!_.isEqual(schemeAfter[key], schemeBefore[key])) {
      schemeChange[key] = schemeAfter[key];
    }
  });
  return schemeChange;
}

async function updateMacroses({ macrosesSchemeChange, macroses, macrosDirPaths, functionContext }) {
  await Promise.mapSeries(_.entries(macrosesSchemeChange), async ([macrosName, macrosSpec]) => {
    macroses[macrosName] = {};
    const macros = macroses[macrosName];
    macros.parameters = getMacrosParameters(macrosSpec.parameters);
    macros.func = await getMacrosFunc(macrosSpec, functionContext);
  });

  return macroses;

  async function getMacrosFunc(macrosSpec, context) {
    // specify ejs context to make context functions visible for ejs when called recursively
    const ejsOptions = { context };
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
  const macroses = {};
  let macrosesScheme = {};

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

    const macrosFunctionContext = { ...appModelProcessors, macroses };
    if (_.isFunction(appModelProcessors.M)) {
      appModelProcessors.M = appModelProcessors.M.bind(macrosFunctionContext);
    }

    return Promise.mapSeries(jsonFiles, async jsonFile => {
      try {
        const modelContent = await fs.readFile(jsonFile, 'utf8');
        const modelPart = parseModel(modelContent);
        if (modelPart) {
          // merge valid json models to
          // 1) know macros specification (it must not include macroses)
          // 2) speed up merging models without macroses
          return mergePartToModel(model, modelPart);
        }

        // Macroses from model may override macroses from core, therefore macroses are changed during parsing process
        const macrosesSchemeChange = getMacrosesSchemeChange(macrosesScheme, model.macros);
        macrosesScheme = model.macros;
        await updateMacroses({
          macrosesSchemeChange,
          macroses,
          macrosDirPaths,
          functionContext: macrosFunctionContext,
        });

        const options = { async: true, context: macrosFunctionContext };
        const expandedModel = await ejs.render(modelContent, {}, options);

        const expandedModelPart = parseModel(expandedModel);
        if (expandedModelPart) {
          return mergePartToModel(model, expandedModelPart);
        }
        errors.push(`Invalid model is expanded with macroses for file "${jsonFile}". Invalid model: ${expandedModel}`);
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
