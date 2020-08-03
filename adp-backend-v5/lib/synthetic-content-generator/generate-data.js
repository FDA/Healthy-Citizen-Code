const Promise = require('bluebird');
const _ = require('lodash');
const { random } = require('../util/random');
const ScgError = require('./errors/scg-error');

async function generateDataByModel({ appLib, functions, model, env, log }) {
  const unifiedContext = {
    row: {},
    modelSchema: model,
    fieldSchema: model,
    path: [],
    schemaPath: [],
    config: env,
    generators: functions,
  };
  await generateObjectField({ appLib, functions, unifiedContext, log });

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

async function generateDataByField({ appLib, functions, unifiedContext, log }) {
  const { fieldSchema } = unifiedContext;
  const { type } = fieldSchema;

  if (type === 'Group') {
    return;
  }
  if (type === 'Array') {
    return generateArrayField({ appLib, functions, unifiedContext, log });
  }
  if (type === 'Object') {
    return generateObjectField({ appLib, functions, unifiedContext, log });
  }
  if (type === 'Mixed') {
    return generateMixedField({ functions, unifiedContext, log });
  }

  const generatorName = getGeneratorName(fieldSchema);
  const generatorFunc = functions[generatorName];
  if (!generatorFunc) {
    const { path } = unifiedContext;
    throw new Error(`Unable to find generator function '${generatorName}' for path '${path.join('.')}'`);
  }

  const isMultiple = isMultipleType(fieldSchema);
  const params = await getGeneratorParams({ fieldSchema, unifiedContext, appLib });
  const contextWithParams = { ...unifiedContext, params };
  if (isMultiple) {
    return generateMultipleFieldData(generatorFunc, contextWithParams);
  }
  return generatorFunc.call(contextWithParams);
}

async function getGeneratorParams({ fieldSchema, unifiedContext, appLib }) {
  const { type, generatorSpecification = {}, list } = fieldSchema;
  const fieldParams = {};
  if (['LookupObjectID', 'LookupObjectID[]'].includes(type)) {
    fieldParams.lookup = fieldSchema.lookup;
  }
  if (type === 'TreeSelector') {
    const treeSelectorTableName = _.keys(fieldSchema.table).filter((key) => key !== 'id')[0];
    fieldParams.tableSpec = fieldSchema.table[treeSelectorTableName];
  }

  if (list) {
    const { modelSchema, schemaPath } = unifiedContext;
    const listPath = `${modelSchema.schemaName}.${schemaPath.join('.')}`;
    const requestDynamicList = true;
    const { getListForUser, getAllAppPermissionsSet } = appLib.accessUtil;
    // give all permissions to retrieve all list values
    const userPermissions = getAllAppPermissionsSet();
    const inlineContext = {};
    const listSpec = await getListForUser(userPermissions, inlineContext, listPath, requestDynamicList);
    fieldParams.listKeys = _.keys(listSpec.values);
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
  // and lookup/treeselector are dependent from existing records
  // it should be uploaded sequentially
  const uploadedSequentially = ['scgFile', 'scgAudio', 'scgVideo', 'scgImage', 'scgLookupObjectID', 'scgTreeSelector'];
  const promiseFunc = uploadedSequentially.includes(generatorFunc.name) ? Promise.mapSeries : Promise.map;

  const elemNumber = random.integer(0, 10);
  const result = await promiseFunc([...Array(elemNumber).keys()], () => generatorFunc.call(unifiedContext));

  return compactArrayResult(result);
}

async function generateArrayField({ appLib, functions, unifiedContext, log }) {
  const elemNumber = random.integer(0, 10);
  await Promise.map([...Array(elemNumber).keys()], (i) => {
    const nestedContext = { ...unifiedContext, path: unifiedContext.path.concat(i) };
    return generateObjectField({ appLib, functions, unifiedContext: nestedContext, log });
  });
}

function compactArrayResult(result) {
  const compact = _.compact(result);
  if (compact.length) {
    return compact;
  }
}

async function generateObjectField({ appLib, functions, unifiedContext, log }) {
  const objSpec = unifiedContext.fieldSchema;
  for (const [fieldName, fieldSchema] of Object.entries(objSpec.fields)) {
    const nestedPath = unifiedContext.path.concat(fieldName);
    const nestedContext = {
      ...unifiedContext,
      fieldSchema,
      path: nestedPath,
      schemaPath: unifiedContext.schemaPath.concat('fields', fieldName),
      // add index, indexes, parentData once it's necessary in generator functions
    };

    try {
      const fieldData = await generateDataByField({ appLib, functions, unifiedContext: nestedContext, log });
      if (fieldData !== undefined) {
        _.set(unifiedContext.row, nestedPath, fieldData);
      }
    } catch (e) {
      if (e instanceof ScgError) {
        log.error(e.message);
      } else {
        log.error(e.stack);
      }
    }
  }
}

function generateMixedField() {}

async function generateDocs({ appLib, env, functions, collectionName, count, log, onDocInsert = _.noop() }) {
  const { models } = appLib.appModel;
  const {
    transformers,
    errors: { ValidationError },
    butil: { stringifyObj },
  } = appLib;
  const model = models[collectionName];

  for (let i = 0; i < count; i++) {
    const record = await generateDataByModel({ appLib, functions, model, env, log });

    try {
      await transformers.preSaveTransformData(collectionName, {}, record, []);
    } catch (e) {
      const msg = `Generated '${collectionName}' record failed validation. It will be skipped.`;
      if (e instanceof ValidationError) {
        log.error(`${msg}\n${e.message}`);
      } else {
        log.error(`${msg}\n${e.stack}\nRecord:${stringifyObj(record)}`);
      }
      continue;
    }

    const response = await appLib.db.model(collectionName).collection.insertOne(record);
    const insertedDoc = response.ops[0];
    onDocInsert({ collectionName, insertedDoc });
  }
}

module.exports = {
  generateDataByModel,
  generateDocs,
};
