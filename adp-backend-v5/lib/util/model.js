const RJSON = require('relaxed-json');
const _ = require('lodash');
const fs = require('fs-extra');
const glob = require('glob');

const { getTransformedInterfaceAppPermissions } = require('../access/transform-permissions');

function combineModels(modelSources, log = () => {}) {
  const model = {};
  const errors = [];

  _.each(modelSources, (modelSource, index) => {
    if (_.isPlainObject(modelSource)) {
      log(`Merging modelSources object with index ${index}`);
      transformPermissionsInPart(modelSource, errors);
      mergePartToModel(model, modelSource);
    }
    if (_.isString(modelSource)) {
      log('Merging', modelSource);
      let jsonFiles;
      if (!modelSource.endsWith('json')) {
        jsonFiles = glob.sync(`${modelSource}/**/*.json`);
      } else {
        jsonFiles = glob.sync(modelSource);
      }
      _.each(jsonFiles, jsonFile => {
        try {
          const modelPart = RJSON.parse(fs.readFileSync(jsonFile, 'utf8'));
          transformPermissionsInPart(modelPart, errors);
          mergePartToModel(model, modelPart);
        } catch (e) {
          throw new Error(`Unable to parse model: "${e}" in file "${jsonFile}"`);
        }
      });
    }
  });

  if (!_.isEmpty(errors)) {
    throw new Error(`Errors occurred during model combine: ${errors.join('\n')}`);
  }

  return model;

  function transformPermissionsInPart(part, _errors) {
    const appPermissions = _.get(part, 'interface.app.permissions');
    const newAppPermissions = getTransformedInterfaceAppPermissions(appPermissions, _errors);
    newAppPermissions && _.set(part, 'interface.app.permissions', newAppPermissions);
  }

  function mergePartToModel(_model, newPart) {
    _.mergeWith(_model, newPart, (modelVal, newVal) => {
      if (_.isArray(modelVal) && _.isArray(newVal)) {
        return modelVal.concat(newVal);
      }
    });
  }
}

module.exports = {
  combineModels,
};
