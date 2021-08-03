const rp = require('request-promise');
const _ = require('lodash');
const fs = require('fs');
const { createRowWithResultHeaders, writeToCsv } = require('../file_to_model/src/xls/xls_to_csv');

const getJson = (uri, headers) => rp({ uri, headers, json: true });

const attrsToParse = [
  'attribute',
  'type',
  'fullName',
  'description',
  'minLength',
  'maxLength',
  'list',
  'unique',
  'required',
  'foreignKey',
];

const objectFieldsToSkip = ['defaultSortBy', 'lookup', 'actions', 'scopes'];

const multiRecordsTypes = ['Array', 'Subschema'];

/**
 * Recursively parses json in format 'object_path' -> 'object'.
 * @param src source json
 * @param path path to insert in result json
 * @param result result json
 * @returns {*}
 */
const parseJson = (src, path, result) => {
  const lastPath = path.substring(path.lastIndexOf('.') + 1);
  if (objectFieldsToSkip.includes(lastPath)) {
    return;
  }

  if (!_.isObject(src) && attrsToParse.includes(lastPath)) {
    result[path] = src;
  } else if (_.isArray(src)) {
    _.forEach(src, (arrayElem, index) => {
      const { simpleObj, complicatedFields } = getJsonSimpleValues(arrayElem);
      const newPath = `${path}[${index}]`;
      if (!_.isEmpty(simpleObj)) {
        result[newPath] = simpleObj;
      }
      _.forEach(complicatedFields, (objectField) => {
        parseJson(arrayElem[objectField], `${newPath}.${objectField}`, result);
      });
    });
  } else if (_.isObject(src)) {
    const { simpleObj, complicatedFields } = getJsonSimpleValues(src);
    let newPath = path;
    if (multiRecordsTypes.includes(src.type)) {
      newPath = `${path}[]`;
    }
    if (!_.isEmpty(simpleObj)) {
      result[newPath] = simpleObj;
    }

    _.forEach(complicatedFields, (complicatedField) => {
      if (complicatedField === 'fields') {
        // Skip 'fields' in newPath
        // phis.fields -> phis; phis.encounters.fields -> phis.encounters[]
      } else {
        newPath = path ? `${path}.${complicatedField}` : complicatedField;
      }
      parseJson(src[complicatedField], newPath, result);
    });
  }
  return result;
};

const getJsonSimpleValues = (src) => {
  const simpleObj = {};
  const complicatedFields = [];
  _.forEach(src, (elem, field) => {
    // handle lookup
    if (field === 'lookup') {
      if (_.isPlainObject(elem.table)) {
        const foreignKeys = _.reduce(
          elem.table,
          (res, val) => {
            res.push(`${val.table}.${val.foreignKey}`);
            return res;
          },
          []
        );
        simpleObj.foreignKey = foreignKeys.join(', ');
      } else {
        simpleObj.foreignKey = `${elem.table}.${elem.foreignKey}`;
      }
      return;
    }
    // handle validate
    if (field === 'validate') {
      _.forEach(elem, (validateObj) => {
        if (validateObj.validator === 'maxLength') {
          simpleObj.maxLength = _.get(validateObj, 'arguments.length', '');
        } else if (validateObj.validator === 'minLength') {
          simpleObj.minLength = _.get(validateObj, 'arguments.length', '');
        }
      });
      return;
    }

    // handle other fields
    const isWritableAttr = attrsToParse.includes(field);
    if (!_.isObject(elem) && isWritableAttr) {
      simpleObj[field] = elem;
    } else if (_.isArray(elem)) {
      // if its array of simple values then concatenate it in one string
      if (!_.isObject(elem[0] || '')) {
        if (isWritableAttr) {
          simpleObj[field] = JSON.stringify(elem);
        }
      } else {
        complicatedFields.push(field);
      }
    } else if (_.isObject(elem)) {
      complicatedFields.push(field);
    }
  });

  if (_.keys(simpleObj).length !== 0) {
    // even if there are no length validators among all fields, we should write it to not empty object
    if (_.isNil(simpleObj.minLength)) {
      simpleObj.minLength = '';
    }
    if (_.isNil(simpleObj.maxLength)) {
      simpleObj.maxLength = '';
    }
    if (!simpleObj.unique) {
      simpleObj.unique = 'false';
    }
    if (!simpleObj.required) {
      simpleObj.required = 'false';
    }
  }

  return { simpleObj, complicatedFields };
};

const getFirstLevelFieldNames = (src) => {
  const fieldNames = [];
  // traverse 0 level
  _.forEach(src, (obj, key0) => {
    // traverse 1 level
    _.forEach(obj, (__, key1) => {
      if (!fieldNames.includes(key1)) {
        fieldNames.push(key1);
      }
    });
  });
  return fieldNames;
};

const getCSVRow = (attribute, obj, headers) => {
  const resultHeaders = headers;
  const srcHeaders = ['attribute'].concat(_.keys(obj));
  const srcRow = [attribute].concat(_.values(obj));
  return createRowWithResultHeaders(resultHeaders, srcHeaders, srcRow);
};

const getSchemeInCsv = ({ schemeUrl, outputSchemePath, headers }) => {
  fs.writeFileSync(outputSchemePath, '');
  return getJson(schemeUrl, headers).then((response) => {
    const parsedJson = parseJson(response.data, '', {});

    const fieldNames = getFirstLevelFieldNames(parsedJson);
    const csvHeaders = ['attribute'].concat(fieldNames);
    // write headers
    let promise = writeToCsv(outputSchemePath, [csvHeaders]);
    _.forEach(parsedJson, (obj, attribute) => {
      const csvRow = getCSVRow(attribute, obj, csvHeaders);
      promise = promise.then(() => writeToCsv(outputSchemePath, [csvRow]));
    });
    return promise;
  });
};

module.exports = { getSchemeInCsv };
