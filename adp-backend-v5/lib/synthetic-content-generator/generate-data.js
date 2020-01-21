const Promise = require('bluebird');
const _ = require('lodash');
const { random } = require('../util/random');
const ScgError = require('./errors/scg-error');

async function generateDataByModel({ functions, model, env }) {
  const unifiedContext = {
    row: {},
    modelSchema: model,
    path: [],
    config: env,
  };
  await generateObjectField(functions, unifiedContext);

  const generatorSpecifications = _.castArray(model.generatorSpecification);
  for (const generatorSpecification of generatorSpecifications) {
    // eslint-disable-next-line
    await generateFieldsForRecord(functions, generatorSpecification, unifiedContext);
  }

  return unifiedContext.row;
}

async function generateFieldsForRecord(functions, generatorSpecification, unifiedContext) {
  const generatorName = _.get(generatorSpecification, 'generator');
  const generatorFunc = functions[generatorName];
  if (!generatorFunc) {
    throw new Error(`Unable to find record-wide generator function '${generatorName}'`);
  }
  const params = _.get(generatorSpecification, 'params', {});
  const contextWithParams = { ...unifiedContext, params };
  return generatorFunc.call(contextWithParams);
}

function generateDataByField(functions, unifiedContext) {
  const { modelSchema } = unifiedContext;
  const { type } = modelSchema;

  if (type === 'Group') {
    return;
  }
  if (type === 'Array') {
    return generateArrayField(functions, unifiedContext);
  }
  if (type === 'Object') {
    return generateObjectField(functions, unifiedContext);
  }
  if (type === 'Mixed') {
    return generateMixedField(functions, unifiedContext);
  }

  const generatorName = getGeneratorName(modelSchema);
  const generatorFunc = functions[generatorName];
  if (!generatorFunc) {
    const { path } = unifiedContext;
    throw new Error(`Unable to find generator function '${generatorName}' for path '${path.join('.')}'`);
  }

  const isMultiple = isMultipleType(modelSchema);
  const params = getGeneratorParams(modelSchema);
  const contextWithParams = { ...unifiedContext, params };
  if (isMultiple) {
    return generateMultipleFieldData(generatorFunc, contextWithParams);
  }
  return generatorFunc.call(contextWithParams);
}

function getGeneratorParams(fieldSpec) {
  const { type, generatorSpecification = {}, list } = fieldSpec;
  const fieldParams = {};
  if (['LookupObjectID', 'LookupObjectID[]'].includes(type)) {
    fieldParams.lookup = fieldSpec.lookup;
  }
  if (type === 'TreeSelector') {
    const treeSelectorTableName = _.keys(fieldSpec.table).filter(key => key !== 'id')[0];
    fieldParams.tableSpec = fieldSpec.table[treeSelectorTableName];
  }

  if (list) {
    fieldParams.listKeys = _.keys(list);
    fieldParams.isArrayList = type.endsWith('[]');
  }

  return _.merge(fieldParams, generatorSpecification.params || {});
}

function isMultipleType(fieldSpec) {
  const { type, list } = fieldSpec;
  if (list) {
    return false;
  }
  return type.endsWith('[]');
}

function getGeneratorName(fieldSpec) {
  const { type, generatorSpecification = {}, list } = fieldSpec;
  if (generatorSpecification.generator) {
    return generatorSpecification.generator;
  }

  if (list) {
    return list.isDynamicList ? `scgDynamicList` : `scgList`;
  }

  const isMultiple = isMultipleType(fieldSpec);
  const ending = isMultiple ? type.replace('[]', '') : type;
  return `scg${ending}`;
}

async function generateMultipleFieldData(generatorFunc, unifiedContext) {
  // since file should avoid race condition with uploading 2 same files (dups are compared by hash and not being reuploaded)
  // and lookup/treeselector are dependant from existing records
  // it should be uploaded sequentially
  const uploadedSequentially = ['scgFile', 'scgAudio', 'scgVideo', 'scgImage', 'scgLookupObjectID', 'scgTreeSelector'];
  const promiseFunc = uploadedSequentially.includes(generatorFunc.name) ? Promise.mapSeries : Promise.map;

  const elemNumber = random.integer(0, 10);
  const result = await promiseFunc([...Array(elemNumber).keys()], () => generatorFunc.call(unifiedContext));

  return compactArrayResult(result);
}

async function generateArrayField(functions, unifiedContext) {
  const elemNumber = random.integer(0, 10);
  await Promise.map([...Array(elemNumber).keys()], i => {
    const nestedContext = { ...unifiedContext, path: unifiedContext.path.concat(i) };
    return generateObjectField(functions, nestedContext);
  });
}

function compactArrayResult(result) {
  const compact = _.compact(result);
  if (compact.length) {
    return compact;
  }
}

async function generateObjectField(functions, unifiedContext) {
  const objSpec = unifiedContext.modelSchema;
  for (const [fieldName, fieldSpec] of Object.entries(objSpec.fields)) {
    const nestedPath = unifiedContext.path.concat(fieldName);
    const nestedContext = {
      ...unifiedContext,
      modelSchema: fieldSpec,
      path: nestedPath,
      // add index, indexes, parentData once it necessary in generator functions
    };

    try {
      const fieldData = await generateDataByField(functions, nestedContext);
      if (fieldData !== undefined) {
        _.set(unifiedContext.row, nestedPath, fieldData);
      }
    } catch (e) {
      if (e instanceof ScgError) {
        console.error(e.message);
      } else {
        console.error(e.stack);
      }
    }
  }
}

function generateMixedField() {}

module.exports = {
  generateDataByModel,
};
