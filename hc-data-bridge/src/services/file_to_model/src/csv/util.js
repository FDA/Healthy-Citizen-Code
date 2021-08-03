const JSON5 = require('json5');
const _ = require('lodash');
const { stringify: jsStringify } = require('javascript-stringify');

// const { getNameByFullName } = require('../../../gen_app_model_by_fhir/helper');
const { NESTING_CHAR } = require('../consts');

const AS_IS_PREFIX = '@@__RETURN_AS_IS__@@';

function getBooleanFromString(val) {
  if (!_.isString(val)) {
    return undefined;
  }
  const lowerCasedVal = val.toLowerCase();
  if (lowerCasedVal === 'true' || lowerCasedVal === 'false') {
    return JSON.parse(lowerCasedVal);
  }
  return undefined;
}

function replaceNbsp(str) {
  return str.replace(new RegExp(String.fromCharCode(160), 'g'), ' ');
}

function getColumnValue(srcData, headerMeta) {
  if (!srcData || !_.isString(srcData)) {
    return undefined;
  }
  const data = replaceNbsp(srcData);

  const modifiers = _.get(headerMeta, 'modifiers', {});
  if (modifiers.returnAsIs) {
    // for example it's needed for macros
    // { "scopes": "<%=this.M('allListValues')%>" } should be { "scopes": <%=this.M('allListValues')%> }
    return `${AS_IS_PREFIX}${data}`;
  }

  const isStringValue = data[0] === '"' && data[data.length - 1] === '"';
  if (isStringValue) {
    return data.slice(1, -1);
  }

  if (modifiers.isString) {
    return data;
  }

  const booleanVal = getBooleanFromString(data);
  const isHandledAsBoolean = !_.isUndefined(booleanVal);
  if (isHandledAsBoolean) {
    return booleanVal;
  }

  const isHandledAsIs = data.startsWith('{') || data.startsWith('[');
  if (isHandledAsIs) {
    return `${AS_IS_PREFIX}${data}`;
  }
  // if there are many strings its complex value
  if (data.indexOf('\n') !== -1) {
    const strings = data.split(/\r?\n/);
    // check whether its array or object
    const firstStringParts = strings[0].split(': ');
    const valuesType = firstStringParts.length > 1 ? 'Object' : 'Array';
    if (valuesType === 'Object') {
      return getJsonObjectColumnStrings(strings, headerMeta);
    }
    return strings;
  }
  // simple string
  const stringParts = data.split(': ');
  const valueType = stringParts.length > 1 ? 'Object' : 'String';
  if (valueType === 'Object') {
    return getJsonObjectColumnStrings([data], headerMeta);
  }
  return data;
}

function getJsonObjectColumnStrings(strings, headerMeta) {
  const result = {};
  _.forEach(strings, (string) => {
    const [key, value] = string.split(': ');
    result[key] = getColumnValue(value, headerMeta);
  });
  return result;
}

function handleStateForCsvRow(csvRowData, state) {
  const nameVal = csvRowData.Name || '';
  if (nameVal.startsWith(NESTING_CHAR)) {
    // sometimes excel may contain 160 ASCII(non-breaking space) char, replace it with space
    const name = replaceNbsp(nameVal);

    // '* Name' -> 'models.tasks.fields.name'
    // transform name and get nested path with save
    const [nestingChars, fieldFullName] = name.split(' ');
    const curRowNestedLvl = nestingChars.length;

    // HC-1417: change leave fields as is, do not camelCase it.
    // const fieldName = getNameByFullName(fieldFullName);
    const fieldName = fieldFullName;

    state.nestedState[curRowNestedLvl] = `${state.nestedState[curRowNestedLvl - 1]}.fields.${fieldName}`;
    if (state.nestedLvl + 1 >= curRowNestedLvl) {
      const previousLevel = curRowNestedLvl - 1;
      const previousPath = state.nestedState[previousLevel];
      state.nestedLvl = curRowNestedLvl;
      state.currentPath = `${previousPath}.fields.${fieldName}`;
    } else {
      const message =
        'Wrong row format.\n' +
        `  Current path (${state.currentPath}) nested level - ${state.nestedLvl}\n` +
        `  For name (${name}) nested level - ${curRowNestedLvl}\n` +
        `  It could be ${state.nestedLvl + 1} at max. Please fix nested level for name above and try again.`;
      // console.log(message);
      throw new Error(message);
    }
  } else {
    // transform name and save initial path
    state.nestedLvl = 0;
    const nameParts = nameVal.split('.');
    const transformedNameParts = [];
    _.forEach(nameParts, (namePart) => {
      // HC-1417: change leave fields as is, do not camelCase it.
      // transformedNameParts.push(getNameByFullName(namePart));
      transformedNameParts.push(namePart);
    });
    state.nestedState[state.nestedLvl] = transformedNameParts.join('.');
    state.currentPath = state.nestedState[state.nestedLvl];
  }
}

function getClearedCsvRow(csvRowData) {
  return _.reduce(
    csvRowData,
    (res, val, key) => {
      if (val) {
        const fieldPath = key.split('.').map(_.camelCase).join('.');
        _.set(res, fieldPath, val);
      }
      return res;
    },
    {}
  );
}

function getHandledAsSchemeCsvRow(csvRowData, headersMeta) {
  return _.reduce(
    csvRowData,
    (res, val, key) => {
      const headerMeta = headersMeta[key];
      const value = getColumnValue(val, headerMeta);
      if (value) {
        _.set(res, headerMeta.path, value);
      }
      return res;
    },
    {}
  );
}

function stringify(obj) {
  return JSON.stringify(obj, null, 2);
}

function stringifyModel(model, indent = 2) {
  return jsStringify(
    model,
    function (value, indentStr, stringify) {
      if (typeof value === 'string' && value.startsWith(AS_IS_PREFIX)) {
        return value.replace(AS_IS_PREFIX, '');
      }

      return stringify(value);
    },
    indent
  );
}

module.exports = {
  getBooleanFromString,
  getColumnValue,
  handleStateForCsvRow,
  getClearedCsvRow,
  stringify,
  getHandledAsSchemeCsvRow,
  replaceNbsp,
  stringifyModel,
};
