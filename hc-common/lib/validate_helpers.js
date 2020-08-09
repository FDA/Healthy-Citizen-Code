const _ = require('lodash');

const errorCodes = {
    extraField: 1,
    noTypeInModel: 2,
    fieldForSubSchema: 3,
    unhandledError: 4,
    unhandledTypeInModel: 5,
    mustBeBoolean: 6,
    mustBeString: 7,
    maxlengthError: 8,
    minlengthError: 9,
    mustBeNumber: 10,
    notCorrectFormat: 11,
    notFoundList: 12,
    notFoundValueInlist: 13,
    mustBeDate: 14
};

module.exports.functions = {
    extraField: (value, model, key) => {

        if (!model[key]) {// extra field
            return {
                message: 'Model not contain field',
                code: errorCodes.extraField,
                field: key,
                model: model,
                value: value
            }
        }
    },
    noTypeInModel: (value, model, key) => {
        let fieldType = model[key].type;
        if (!fieldType) {
            return {
                message: 'Data in model for field not contain type.',
                code: errorCodes.noTypeInModel,
                field: key,
                model: model,
                value: value
            }
        }
    },
    fieldForSubSchema: (value, model, key) => {
        let fieldType = model[key].type;
        if (_.isObject(fieldType)) {
            return {
                message:'Type in model for field contain subschema or not correct type..',
                code: errorCodes.fieldForSubSchema,
                field: key,
                model: model,
                value: value
            }
        }
    },
    fieldValidateByRulesInModel: (value, model, key, lists) => {
        try {
            const fieldData = model[key];
    
            const validatorsForTypesOfField = {
                "String": validateForString,
                "Date": validateForDate,
                "Number": validateForNumber,
                "Boolean": validateForBoolean,
                "Mixed": validateForMixed
        
            };
            let validateFunction = validatorsForTypesOfField[fieldData.type];
            if (!validateFunction) {
                return {
                    code: 5,
                    message: "Unhandled type in model",
                    model: model,
                    field: key,
                    value: value
                }
            }
            return validateFunction(value, fieldData, key, lists);
        } catch (error) {
            return {
                code: 4,
                error: error,
                message: "Unhandled error",
                model: model,
                field: key,
                value: value
            }
        }
    }
};

const validateForString = (value, fieldData, key, lists) => {
    
    // Validate not enums
    if (!fieldData.list) {
        if (typeof value !== "string") {
            return {
                code: 7,
                message: "Must be string",
                field: key,
                value: value
            }
        }
        if (fieldData.maxlength) { //maxlength for strings, not enums
            if (value.length > fieldData.maxlength) {
                return {
                    code: 8,
                    message: "Must be less then " + fieldData.maxlength + " symbols",
                    field: key,
                    value: value
                }
            }
        }
        if (fieldData.minlength) {
            if (value.length < fieldData.minlength) {
                return {
                    code: 9,
                    message: "Must be more then " + fieldData.minlength + " symbols",
                    field: key,
                    value: value
                }
            }
        }
        if (fieldData.regexp) {
            const regexp = new RegExp(fieldData.regexp);
            if (!regexp.test(value)) {
                return {
                    code: 11,
                    message: "Not correct format",
                    field: key,
                    value: value,
                    regexp: fieldData.regexp
                }
            }
        }
    }
    // validate enums
    else {
        if (!lists[fieldData.list]) {
            return {
                code: 12,
                message: "Not found list with name: " + fieldData.list,
                field: key,
                value: value
            }
        }
        if (!lists[fieldData.list][value]) {
            return {
                code: 13,
                message: "Not found value for list with name: " + fieldData.list,
                field: key,
                value: value
            }
        }
    }
    
};

const validateForDate = (value, fieldData, key) => {
    
    if ( !(new Date(value).getTime() > 0)) {
        return {
            code: 14,
            message: "Must be date",
            field: key,
            value: value
        }
    }
    
};

const validateForNumber = (value, fieldData, key) => {
  if (!_.isNumber(value)) {
      return {
          code: 10,
          message: "Must be number",
          field: key,
          value: value
      }
  }
};

const validateForBoolean = (value, fieldData, key) => { // TODO can be there "true"?
   if (value !== true && value !== false) {
       return {
           code: 6,
           message: "Must be boolean",
           field: key,
           value: value
       }
   }
};

const validateForMixed = (value, fieldData, key) => {
    console.log('Not implemented validation for mixed type');
};

module.exports.errorCodes = errorCodes;

