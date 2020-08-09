const _ = require('lodash')
    , validateFunctions = require('./validate_helpers').functions
    , errorCodes = require('./validate_helpers').errorCodes;


const validators = [
    'extraField',
    'noTypeInModel',
    'fieldForSubSchema',
    'fieldValidateByRulesInModel'
];

let listsForValidationEnums;

const iterateObject = (object, model, errors) => {
    _.each(object, function (value, key) {
        let result;
        
        _.each(validators, function (validateFunctionName) {
           if (!result) {
               result = validateFunctions[validateFunctionName](value, model, key, listsForValidationEnums);
               if (typeof result === "object") {
                   errors[result.field] = _.cloneDeep(result);
                   return
               }
           }
       })
    })
};

const initLists = (lists) => {
    if (!lists && !listsForValidationEnums) {
        throw new Error('Param list is required');
    } else if (lists) {
        listsForValidationEnums = lists;
    }
};

const validations = {
    /**
     * Function for validate object with model validation rules for fields.
     * @param object {object} - for validate
     * @param model {object} - model in model.json file format with level of nesting for current model
     * @param lists {object} - all lists for validate enums, you can push this param one time, and its will be saved, until not override new lists param
     * @returns {*} if no errors after validate return true, else return array with errors
     */
    validateObjectWithModel: (object, model, lists) => {
        if (!object) { throw new Error("param object is required!")}
        if (!model) { throw new Error("param model is required!")}
        initLists(lists);
        let errors = {};
        iterateObject(object, model, errors);
        if (!_.isEmpty(errors)) {
            return errors;
        }
        return true;
    },
    /**
     * Map with error codes
     */
    errorCodes: errorCodes
};
module.exports = validations;