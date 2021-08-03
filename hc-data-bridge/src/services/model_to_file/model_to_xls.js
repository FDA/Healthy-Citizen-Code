const _ = require('lodash');
const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const JSON5 = require('json5');
const glob = require('glob');
const path = require('path');
const transformSettings = require('./settings');

const NESTING_CHAR = '*';
const fieldMatch = '.fields';

function transformModelToXls (modelSrcPath, xlsOutputPath, settings = transformSettings) {
  const model = getModel(modelSrcPath);
  const modelMetaInfos = getModelMetaInfos(model, settings);

  _.forEach(modelMetaInfos, (modelMetaInfo) => {
    const xlsDataForModel = getXlsDataForModel(modelMetaInfo.model, modelMetaInfo.columns);
    modelMetaInfo.xlsDataForModel = xlsDataForModel;
  });

  const sheetNameToXlsData = {};
  _.forEach(modelMetaInfos, (modelMetaInfo) => {
    const { sheetName } = modelMetaInfo;
    // insert columns for first row
    const sheetXlsData = _.get(sheetNameToXlsData, `${sheetName}.xlsDataForModel`, [modelMetaInfo.columns]);
    sheetNameToXlsData[sheetName] = sheetXlsData.concat(modelMetaInfo.xlsDataForModel);
  });

  const worksheets = _.map(sheetNameToXlsData, (data, name) => ({ name, data }));
  const worksheetsBuffer = xlsx.build(worksheets);

  const xlsFullPath = path.resolve(process.cwd(), xlsOutputPath);
  fs.ensureDirSync(path.dirname(xlsFullPath));
  fs.writeFileSync(xlsFullPath, worksheetsBuffer);
  return xlsFullPath;
}

/**
 * Get combined model by specified absoliteModelPath
 * @param modelPath can be a directory or a file
 * @returns {{}}
 */
function getModel (modelPath) {
  let files;
  let stats;
  const absoluteModelPath = path.resolve(process.cwd(), modelPath);
  try {
    stats = fs.lstatSync(absoluteModelPath);
  } catch (e) {
    throw new Error(`Unable to read path: '${absoluteModelPath}'`);
  }

  if (stats.isDirectory()) {
    files = _.concat(glob.sync(`${absoluteModelPath}/**/*.json`));
  } else {
    files = [absoluteModelPath];
  }

  let model = {};
  files.forEach((file) => {
    let content = '';
    let parsedContent;
    try {
      content = fs.readFileSync(file, 'utf8');
      parsedContent = JSON5.parse(content);
    } catch (e) {
      throw new Error(`Unable to parse model: "${e}" in file "${file}". Source: \n${content}`);
    }
    model = _.merge(model, parsedContent);
  });
  return model;
}

/**
 * Prepare metaInfo for each section specified in settings
 * @param wholeModel
 * @param settings
 * @returns {Array}
 */
function getModelMetaInfos (wholeModel, settings) {
  const modelNames = Object.keys(settings.tabs.fields);
  const modelMeta = [];
  _.forEach(modelNames, (modelName) => {
    if (wholeModel[modelName]) {
      modelMeta.push({
        sheetName: _.startCase(modelName),
        model: wholeModel[modelName],
        columns: settings.tabs.fields[modelName].columns.concat(['Other']),
      });
    }
  });
  return modelMeta;
}

function countOccurrences (source, str) {
  let num = 0;
  let lastIndex = -1;
  while ((lastIndex = source.indexOf(str, lastIndex + 1)) !== -1) {
    num += 1;
  }
  return num;
}

function getEnding (str, match) {
  return str.substring(str.lastIndexOf(match) + match.length + 1);
}

/**
 * Recursively traverse object and get rows
 * @param obj to traverse
 * @param curPath current object path
 * @param rows Map with key representing full path to new object(needed for Name column),
 * and with value - js object with all other column values
 * @returns {Map<any, any>}
 */
function traverseObj (obj, curPath = '', rows = new Map()) {
  // order is important for excel file
  // so we need to traverse 'fields' field first and then other fields
  const fieldNames = Object.keys(obj);
  const fieldsIndex = fieldNames.indexOf('fields');
  if (fieldsIndex !== -1) {
    fieldNames.splice(fieldsIndex, 1);
    fieldNames.unshift('fields');
  }

  _.forEach(fieldNames, (nestedPath) => {
    const nestedObj = obj[nestedPath];
    const newPath = !curPath ? nestedPath : `${curPath}.${nestedPath}`;
    if (_.isPlainObject(nestedObj)) {
      const isObjectInsideObject = newPath.includes(fieldMatch) && getEnding(newPath, fieldMatch).includes('.');
      if (isObjectInsideObject) {
        // do not traverse 2 objects in a row like '_something_.fields.obj1.obj2'
        // set whole '_something_.fields.obj1.obj2' as json
        rows.set(curPath, _.merge(rows.get(curPath), { [nestedPath]: nestedObj }));
      } else {
        if (!newPath.endsWith('fields')) {
          // create obj path to write nested fields (it can be even empty):
          // obj
          // * nested1
          // ** nested2
          rows.set(newPath, _.merge(rows.get(newPath), {}));
        }
        traverseObj(nestedObj, newPath, rows);
      }
    } else {
      rows.set(curPath, _.merge(rows.get(curPath), { [nestedPath]: nestedObj }));
    }
  });
  return rows;
}

function getXlsDataForModel (model, headers) {
  const traversedModel = traverseObj(model);
  const xlsData = [];

  traversedModel.forEach((obj, path) => {
    const fieldsOccurrences = countOccurrences(path, fieldMatch);
    let name;
    if (fieldsOccurrences) {
      const nestingString = NESTING_CHAR.repeat(fieldsOccurrences);
      const pathEnding = getEnding(path, fieldMatch);
      name = `${nestingString} ${pathEnding}`;
    } else {
      name = path;
    }
    const row = getRow({ ...obj, name }, headers);
    xlsData.push(row);
  });
  return xlsData;

  function getRow (obj, headers) {
    const row = [];
    _.forEach(headers, (header) => {
      // excel uses startCase, json uses camelCase
      const camelCasedHeader = _.camelCase(header);
      const headerVal = obj[camelCasedHeader];
      if (headerVal !== undefined) {
        if (_.isObject(headerVal)) {
          row.push(JSON.stringify(headerVal, null, 2));
        } else {
          row.push(headerVal);
        }
      } else {
        row.push('');
      }
    });

    // calculate 'Other' header
    const objHeaders = _.keys(obj);
    const otherHeaders = objHeaders.filter(h => !headers.includes(_.startCase(h)));
    const otherValues = {};
    _.forEach(otherHeaders, (otherHeader) => {
      otherValues[otherHeader] = obj[otherHeader];
    });
    // change value for 'Other' header (last position)
    if (_.isEmpty(otherValues)) {
      row.splice(-1, 1, '');
    } else {
      row.splice(-1, 1, JSON.stringify(otherValues, null, 2));
    }
    return row;
  }
}

module.exports = { transformModelToXls };
