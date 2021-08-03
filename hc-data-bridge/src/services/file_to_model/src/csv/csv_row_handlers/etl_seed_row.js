const _ = require('lodash');
const Promise = require('bluebird');
const JSON5 = require('json5');
const ObjectId = require('mongodb').ObjectID;
const { conditionForActualRecord } =  require('../../../../util/mongo');

const {
  getBooleanFromString,
  getClearedCsvRow,
  getColumnValue,
  stringify,
  getHandledAsSchemeCsvRow,
} = require('../util');

function handleDataSeed(csvRowData, metaInfo, state, options) {
  state.etl.dataSeedPromiseFuncs.push(getDataSeedPromiseFunc(csvRowData, metaInfo, state, options));
  return Promise.resolve();
}

function getDataSeedPromiseFunc(csvRowData, metaInfo, state, options) {
  const { collection } = metaInfo;
  const { seedMongoUrl } = options;
  return async () => {
    const dbConnection = await state.connectionManager.getConnection(seedMongoUrl);
    if (!dbConnection) {
      return;
    }
    try {
      const { doc, upsertCondition } = await getDocInfo(csvRowData, collection, state, dbConnection);
      const res = await dbConnection
        .collection(collection)
        .findOneAndReplace(upsertCondition, {...conditionForActualRecord, ...doc}, { ignoreUndefined: true, upsert: true, returnOriginal: false });
      const isUpdated = _.get(res, 'lastErrorObject.updatedExisting', false);
      const itemAction = isUpdated ? 'Updated' : 'Inserted';
      console.log(`∟ ${itemAction} ${collection} item`, stringify(doc));
    } catch (e) {
      const csvRowMsg = stringify(getClearedCsvRow(csvRowData));
      console.error(`Unable to upsert ${collection} item: ${e.message}.\nCsv row: ${csvRowMsg}\n${e.stack}`);
    }
  };
}

function getValueByType(value, columnName, etlType, schemaType, headersMeta) {
  const headerMeta = headersMeta[columnName];
  const fieldPath = headerMeta ? headerMeta.path : columnName;
  if (schemaType && etlType && schemaType !== etlType) {
    console.error(
      `Schema type ${schemaType} doesn't match ETL type ${etlType} by path ${fieldPath}. ETL type will be used.`
    );
  }
  const LIKE_IN_SCHEMA_ROW = 'LIKE_IN_SCHEMA_ROW';
  const type = etlType || schemaType || LIKE_IN_SCHEMA_ROW;

  const invalidMessage = `Value '${value}' by path '${fieldPath}' is invalid ${type}. It will be skipped.`;
  if (type === 'String') {
    if (!_.isString(value)) {
      console.error(invalidMessage);
      return undefined;
    }
    return value;
  }
  if (type === 'Number') {
    if (Number.isNaN(+value)) {
      console.error(invalidMessage);
      return undefined;
    }
    return +value;
  }
  if (type === 'Boolean') {
    const boolean = getBooleanFromString(value);
    if (boolean === undefined) {
      console.error(invalidMessage);
      return undefined;
    }
    return boolean;
  }
  if (type === 'Date') {
    const date = new Date(value);
    if (date === 'Invalid Date') {
      console.error(invalidMessage);
      return undefined;
    }
    return date;
  }
  if (type === 'Object') {
    try {
      const obj = JSON5.parse(value);
      if (!_.isPlainObject(obj)) {
        console.error(invalidMessage);
        return {};
      }
      return obj;
    } catch (e) {
      console.error(invalidMessage);
      return {};
    }
  }
  if (type === 'Array') {
    try {
      const obj = JSON5.parse(value);
      if (!_.isArray(obj)) {
        console.error(invalidMessage);
        return [];
      }
      return obj;
    } catch (e) {
      console.error(invalidMessage);
      return [];
    }
  }
  if (type === LIKE_IN_SCHEMA_ROW) {
    return getColumnValue(value, headerMeta);
  }
  // TODO: handle Location, Image, Barcode etc?
  return value;
}

function getDocMutationFunc({ doc, csvRowData, value, schema, etlSpec, dbConnection, columnName, headersMeta}) {
  // for etl generated values like 'createdAt' there may be no field in !data tab
  const fieldPath = _.get(headersMeta, `${columnName}.path`, columnName);
  const schemeFieldPath = `fields.${fieldPath.replace(/\./g, '.fields.')}`;
  const schemaField = _.get(schema, schemeFieldPath);
  let schemaFieldType;
  if (schemaField) {
    schemaFieldType = schemaField.type || 'String';
  }

  const etlField = _.get(etlSpec, schemeFieldPath, {});
  const etlFieldType = etlField.type;
  const etlFieldValue = etlField.value;

  if (etlFieldType === 'Delete') {
    return () => _.unset(doc, fieldPath);
  }

  const clearedCsvRow = getClearedCsvRow(csvRowData);
  if (etlFieldValue) {
    if (etlFieldType.includes('LookupObjectID')) {
      return getFuncForLookup();
    }
    return getFuncForSimpleEtlValue();
  }

  const isOneOfSpecsExist = !_.isEmpty(etlSpec) || !_.isEmpty(schema);
  const isTypeMissedInSpecs = !schemaFieldType && !etlFieldType;
  if (isOneOfSpecsExist && isTypeMissedInSpecs) {
    console.warn(`There is no type found for field '${fieldPath}'=${value}. It will be skipped.`);
    return () => {};
  }
  const valueByType = getValueByType(value, columnName, etlFieldType, schemaFieldType, headersMeta);
  return () => _.set(doc, fieldPath, valueByType);

  function getFuncForLookup() {
    const lookupArg = lookup.bind({ dbConnection });
    // TODO: Value funcs should be executed with ready doc, not csvData.
    //  It will require 2 passes through csvRow (determining types with writing into docs then executing value func)
    //  Now there is a hack with getHandledAsSchemeCsvRow
    const handledAsSchemeCsvRow = getHandledAsSchemeCsvRow(csvRowData, headersMeta);
    try {
      const promiseReturningLookups = new Function('ObjectId, _, lookup, Promise', `return ${etlFieldValue}`).call(
        handledAsSchemeCsvRow,
        ObjectId,
        _,
        lookupArg,
        Promise
      );

      if (!promiseReturningLookups.then) {
        console.error(
          `Executed func '${etlFieldValue}' by path '${fieldPath}' is not a thenable(not a Promise). It will be skipped.`
        );
        return () => {};
      }
      return () => promiseReturningLookups.then(lookups => _.set(doc, fieldPath, lookups));
    } catch (e) {
      console.error(
        `Error occurred for lookup by path '${fieldPath}'. ` +
          `Row: ${stringify(handledAsSchemeCsvRow)}. It will be skipped. Error: ${e}`
      );
      return () => {};
    }

    function lookup({ table, foreignKeyFieldName, labelField, dataSpecification, condition }) {
      const isValid =
        _.isString(table) &&
        _.isString(foreignKeyFieldName) &&
        _.isString(labelField) &&
        (_.isUndefined(dataSpecification) || _.isPlainObject(dataSpecification)) &&
        _.isPlainObject(condition);
      if (!isValid) {
        console.error(
          `Invalid lookup data. ` +
            `Fields 'table', 'foreignKeyFieldName', 'labelField' must be strings; ` +
            `field 'condition' must be an object; ` +
            `field 'dataSpecification' must be an object if specified. ` +
            `Returning null lookup.`
        );
        return Promise.resolve(null);
      }

      return this.dbConnection
        .collection(table)
        .findOne(condition)
        .then(lookupDoc => {
          if (!lookupDoc) {
            return null;
          }
          const _id = _.get(lookupDoc, foreignKeyFieldName);
          if (!_id) {
            console.error(`Not found ${foreignKeyFieldName} in ${stringify(lookupDoc)}. Returning null lookup.`);
            return null;
          }
          const label = _.get(lookupDoc, labelField);
          if (!label) {
            console.error(`There is no ${labelField} in ${stringify(lookupDoc)}. Returning null lookup.`);
            return null;
          }

          const lookupObj = { _id, table, label };
          if (dataSpecification) {
            lookupObj.data = dataSpecification;
          }

          return lookupObj;
        });
    }
  }

  function getFuncForSimpleEtlValue() {
    try {
      const funcValue = new Function('', `return ${etlFieldValue}`).call(clearedCsvRow);
      return () => _.set(doc, fieldPath, funcValue);
    } catch (e) {
      const valueByType = getValueByType(value, fieldPath, etlFieldType, schemaFieldType, headersMeta);
      console.error(
        `Error occurred during executing function '${etlFieldValue}', ` +
          `value ${valueByType} will be inserted (according its type). ` +
          `Function context: ${stringify(clearedCsvRow)}`
      );
      return () => _.set(doc, fieldPath, valueByType);
    }
  }
}

function getUpsertCondition(etlSpec = {}, doc) {
  const { value, name } = etlSpec;
  if (!value) {
    return doc;
  }
  try {
    return new Function('', `return ${value}`).call(doc);
  } catch (e) {
    console.error(
      `Unable to get upsert condition for collection '${name}' by value ${value}. ` +
        `All documents fields will be applied as upsert condition`
    );
    return doc;
  }
}

async function getDocInfo(csvRowData, collection, state, dbConnection) {
  const schema = _.get(state.schema.model, ['models', collection], {});
  const etlSpec = _.get(state.etl.model, collection, {});

  const doc = {};
  const docMutationFuncs = [];
  const visitedPaths = [];

  // const clearedCsvRow = getClearedCsvRow(csvRowData);
  _.each(csvRowData, (value, name) => {
    const headerMeta = state.headersMeta[name];
    if (value === '' || headerMeta.isMeta  || headerMeta.isOther || headerMeta.isComment ) {
      return;
    }

    const dataPromiseFunc = getDocMutationFunc({
      doc,
      csvRowData,
      value,
      schema,
      etlSpec,
      dbConnection,
      columnName: name,
      headersMeta: state.headersMeta,
    });
    visitedPaths.push(headerMeta.path);
    docMutationFuncs.push(dataPromiseFunc);
  });
  // etl may contain fields not mentioned in schema
  traverseEtlPaths(etlSpec.fields);

  await Promise.mapSeries(docMutationFuncs, func => func());
  if (csvRowData.Other) {
    try {
      // const other = JSON5.parse(csvRowData.Other);
      const other = new Function('ObjectId, _', `return ${csvRowData.Other}`).call(csvRowData, ObjectId, _);
      _.merge(doc, other);
    } catch (e) {
      console.error(`Cannot evaluate 'Other' column ${csvRowData.Other}. It will be skipped.`);
    }
  }
  const upsertCondition = getUpsertCondition(etlSpec, doc);
  return { doc, upsertCondition };

  function traverseEtlPaths(etlScheme, curPath = '') {
    _.each(etlScheme, (value, name) => {
      const fieldPath = curPath ? `${curPath}.${name}` : name;
      if (visitedPaths.includes(fieldPath)) {
        return;
      }
      const dataPromiseFunc = getDocMutationFunc({
        doc,
        csvRowData,
        value: '', // empty since its not visited earlier
        schema,
        etlSpec,
        dbConnection,
        columnName: name,
        headersMeta: state.headersMeta,
      });
      visitedPaths.push(fieldPath);
      docMutationFuncs.push(dataPromiseFunc);
      if (value.fields) {
        traverseEtlPaths(value.fields, fieldPath);
      }
    });
  }
}

module.exports = handleDataSeed;
