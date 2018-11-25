const path = require('path');
const _ = require('lodash');
const {getSearchableFields} = require('./openfda-searchable-fields-parser.js');

const LOGIC = {
  AND: '+AND+', // parsing will be done in key order, AND first
  OR: '+',
};

function getParam (group, i) {
  let char;
  let param = '';
  const len = group.length;
  while ((char = group[i]) !== ':' && i <= len) {
    param += char;
    i++;
  }
  i++;
  return {param, i};
}

function getParamValues (group, i, fieldMeta) {
  let isInQuote = false;
  // param values can be present as array - 'serious:1+2'
  const values = [];
  let valuePart = '';
  let prevValueEnd;
  let char;
  const len = group.length;

  while (i < len) {
    char = group[i];

    if (char === '+') {
      if (group.substr(i, LOGIC.AND.length) === LOGIC.AND) {
        // new param start
        values.push(valuePart);
        return {values, i};
      }

      if (isInQuote) {
        // handle space in string value "multiple+myeloma"
        values.push(valuePart);
        valuePart += ' ';
        i++;
        continue;
      } else if (!isInQuote) {
        // if (fieldMeta.type) {
        //
        // }
        // handle multiple params 'serious:1+2'
        values.push(valuePart);
        valuePart = '';
        prevValueEnd = i;
        i++;
        continue;
      }
    }


    if (char === '"') {
      isInQuote = !isInQuote;
      i++;
      continue;
    }

    // handle multiple values with next param 'serious:1+2+receiptdate:20140408'
    if (char === ':' && !isInQuote) {
      if (!prevValueEnd) {

      }
      return {values, i: prevValueEnd};
    }

    valuePart += char;
    i++;
  }
  // all string passed
  values.push(valuePart);
  return {values, i};
}

function getFieldMeta (searchableFields, param) {
  let isExact = false;
  const parts = param.split('.');

  if (parts[parts.length - 1] === 'exact') {
    isExact = true;
    parts.pop();
  }

  const path = ['properties'];
  // handle intermediate paths
  const ending = parts.pop();
  _.forEach(parts, part => {
    path.push(part);
    const pathVal = _.get(searchableFields, path);
    if (!pathVal) {
      throw new Error(`Cannot find param ${param}. Broken path at ${path.join('.')}`);
    }
    if (pathVal.type === 'object') {
      path.push('properties');
    }
    if (pathVal.type === 'array') {
      path.push('items', 'properties');
    }
  });
  path.push(ending);
  const fieldMeta = _.get(searchableFields, path);
  if (!fieldMeta) {
    throw new Error(`Cannot find param ${param}. Broken path at ${path.join('.')}`);
  }
  return {isExact, fieldMeta};
}

function getOperator (group, i) {
  for ([operator, val] of Object.entries(LOGIC)) {
    if (group.substr(i, val.length) === val) {
      return {operator, i: i + val.length};
    }
  }
  return {operator: null, i};
}

function getMongoCondition (paramInfo, operators) {
  const paramConditions = {};
  _.forEach(paramInfo, (info, param) => {
    // some parameters are always exact by meta
    const isExact = info.isExact || info.fieldMeta.is_exact;
    if (!info.values.length) {
      return;
    }
    if (isExact) {
      // exact each value can be expressed as $in
      paramConditions[param] = {[param]: {$in: info.values}};
    } else {
      const regexConditions = info.values.map(val => {
        return {
          [param]: {$regex: new RegExp(_.escapeRegExp(val), 'i')}
        };
      });
      paramConditions[param] = {$and: regexConditions};
    }
  });

  /**
   Openfda handle logical conditions incorrectly. For example: T || F && F = T, since && has bigger priority.
   2 queries:
   1. https://api.fda.gov/drug/event.json?search=patient.reaction.reactionmeddrapt:"Subdural"+occurcountry:"asd"+AND+occurcountry:"qwe"
   2. https://api.fda.gov/drug/event.json?search=patient.reaction.reactionmeddrapt:"Subdural"+(occurcountry:"asd"+AND+occurcountry:"qwe")
   First response has 0 docs, second - 9685.
   So... repeating incorrect logic in this code
   */
  let resultCondition;
  let operatorIndex = 0;
  _.forEach(paramConditions, (condition) => {
    if (!resultCondition) {
      resultCondition = condition;
      return;
    }
    const operator = operators[operatorIndex];
    const mongoOperator = `$${operator.toLowerCase()}`; // $and/$or
    if (!resultCondition[mongoOperator]) {
      resultCondition = {[mongoOperator]: [resultCondition, condition]};
    } else {
      resultCondition[mongoOperator].push(condition);
    }
    operatorIndex++;
  });
  return resultCondition;
}

function parseGroup (group, searchableFields) {
  let index = 0;
  const len = group.length;
  const paramInfo = {};
  const operators = [];

  while (index < len) {
    let {operator, i: operatorI} = getOperator(group, index);
    index !== 0 && operator && operators.push(operator);
    index = operatorI;
    let {param, i: paramI} = getParam(group, index);
    index = paramI;
    const {isExact, fieldMeta} = getFieldMeta(searchableFields, param);
    let {values, i: valuesI} = getParamValues(group, index, fieldMeta);
    index = valuesI;
    paramInfo[param] = {
      fieldMeta,
      isExact,
      values,
    };
  }
  return {paramInfo, operators};
}

/**
 * Transforms openfda search param to mongo condition.
 * @param search openfda 'search' param
 * search examples:
 * 1) 'patient.reaction.reactionmeddrapt:"Subdural"+AND+occurcountry:"ca"'
 * 2) 'patient.drug.medicinalproduct:cetirizine+loratadine+receiptdate:20140408+AND+patient.patientonsetage:46'
 * @param model to which search is applied
 */
function transformQuery (search, model) {
  // TODO: add groupings
  const searchableFields = getSearchableFields(model);

  const {paramInfo, operators} = parseGroup(search, searchableFields);
  const mongoCondition = getMongoCondition(paramInfo, operators);

  return mongoCondition;
}

module.exports = {
  transformQuery
};


