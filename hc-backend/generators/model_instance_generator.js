"use strict";
const generateString = require('../lib/randomstring');
const numberGenerator = require('./../generators/number_generator');
const dateGenerator = require('./../generators/date_generator');
const booleanGenerator = require('./../generators/boolean_generator');
const isArray = require('./../validators/type_validator').isArray;
var lists = require('./../src/data_model/lists');
const _ = require("lodash");

/* expected object:
 {
 type: Function
 enum: [] - possible
 maxlength - possible
 }
 */

const formatDate = function (date) {
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    return year + "/" + month + "/" + day
};

const generateRandomEnum = function (enumObj, maximumValues = 1) {
    let keyNumber;
    let enumValues;
    if (enumObj.length < maximumValues) {
        maximumValues = enumObj.length
    }
    const randomEnumValuesCount =  numberGenerator.generate(1, maximumValues);
    // TODO refactoring here - remove extra double code.
    if (isArray(enumObj)) {
        let enumObjCopy = Object.assign([], enumObj);
        for (var i=0; i < enumObj.length - randomEnumValuesCount; i++){ //fix here
            keyNumber = numberGenerator.generate(0, enumObjCopy.length - 1);
            enumObjCopy.splice(keyNumber, 1);
        }
        enumValues = enumObjCopy;
    } else if (typeof enumObj === 'object' && enumObj !== null) {
        let keys = Object.keys(enumObj);
        for (var i=0; i < enumObj.length - randomEnumValuesCount; i++) {  //fix here
            keyNumber = numberGenerator.generate(0, keys.length - 1);
            keys.splice(keyNumber, 1);
        }
        enumValues = keys;
    } else {
        enumValues = enumObj;
    }
    return enumValues;
};


const jsonObjToMongoose = function (obj) {
    var newObj = _.cloneDeep(obj);
    return newObj
};

const mongooseObjectGenerator = function (obj) {
    var newObj = jsonObjToMongoose(obj);
    const setObjType = {
        "Date": Date,
        "String": String,
        "Number": Number,
        "Boolean": Boolean,
        "Mixed": String // TODO !
    };
    newObj.type = setObjType[newObj.type];
    if (typeof obj.type === "function") {
        newObj.type = obj.type
    }
    if (newObj.list) {
        newObj.type = [String]
    }

    if (newObj.list) {
        newObj.enum = _.keys(lists[newObj.list])
    }
    if (newObj.matches){
        newObj.matches = new RegExp(newObj.matches);
    }
    if (newObj.regexp){
        newObj.regexp = new RegExp(newObj.regexp);
    }
    return newObj;
};

const formObjectGenerator = function (obj) {
    var newObj = jsonObjToMongoose(obj);
    if (obj.list) {
        newObj.enum = lists[newObj.list];
        if (!newObj.enum) {
            newObj.enum = []
        }
    }
    return newObj;
};

const instanceObjectGenerator = function (formParamsObject) {
    const typesHandlers = {
        "String": function () {
            let result = generateString.generate();
            if (formParamsObject.enum) {
                result = generateRandomEnum(formParamsObject.enum, formParamsObject.maxlength)
            } else if (formParamsObject.match) {
                result = "";
                result = result.substring(0, formParamsObject.maxlength);
            } else if (formParamsObject.maxlength) {
                result = result.substring(0, formParamsObject.maxlength);
            }
            return result;
        },
        "Date": function () {
            let date = dateGenerator.generate();
            return formatDate(date);
        },
        "Number": function () {
            let min, max;
            if (formParamsObject.minValue) {
                min = formParamsObject.minValue;
            }
            if (formParamsObject.maxValue) {
                max = formParamsObject.maxValue;
            }
            return numberGenerator.generate(min, max);
        },
        "Boolean": function () {
            return booleanGenerator.generate();
        },
        "object": function () {
            if (formParamsObject.type[0]) { // case for multiselects - type === [String]
                return generateRandomEnum(formParamsObject.enum, formParamsObject.maxlength)
            }
        }
    };
    let type = formParamsObject.type;
    if (typeof type === "function") {
        type = type.name;
    }
    if (typeof type === "object") {
        type = "object";
    }
    return typesHandlers[type]();
};

const emptyObjectGenerator = function (formParamsObject) {
      return ""
};

const handlersGenerateObjectWIthStrategy = {
    "instance": instanceObjectGenerator,
    "mongoose": mongooseObjectGenerator,
    "form": formObjectGenerator,
    "empty": emptyObjectGenerator
};


// TODO add functionality for auto generation fields.
// Find in source object elements for generate.
const generation = function (instance, strategy) {
    const isRequiredField = function (field) {
        return field.type && field["generated"] === true
    };

    if (isArray(instance)) {
        for (let i = 0; i < instance.length; i++) {
            // TODO refactoring there
            if (instance[i]["generated"]=== true)
                console.log(instance[i])
            if (isRequiredField(instance[i]) && strategy === "form") { // need for remove generated field for form
                delete instance[i];
            } else {
                instance[i] = generation(instance[i], strategy);
            }

        }
        return instance
    } else if (typeof instance === 'object' && instance !== null) {
        if (instance.type && !instance.type.type) {
            return handlersGenerateObjectWIthStrategy[strategy](instance);
        }
        else {
            let keys = Object.keys(instance);
            for (let i = 0; i < keys.length; i++) {
                if(isRequiredField(instance[keys[i]]) && strategy === "form") {
                    delete instance[keys[i]];
                } else {
                    instance[keys[i]] = generation(instance[keys[i]], strategy);
                }
            }
            return instance;
        }
    } else {
        return instance;
    }
};


const operationMapForDependencies = {
    "Date": function (operation, minDate, maxDate) {
        if (operation == ">") {
            var a = maxDate;
            maxDate = minDate;
            minDate = a;
        }
        let date = dateGenerator.generate(minDate, maxDate);
        return formatDate(date);
    }
};

// Correct model for dependencies.
const correctModel = function (modelInstance, dependenciesInModel) {
    _.each(dependenciesInModel, function (dependency) {
        var changedObject = modelInstance;
        for (let i = 0; i < dependency["path"].length; i++) {
            changedObject = changedObject[dependency.path[i]];
        }
        const leftValue = changedObject[dependency.leftOperand];
        const newRightOperand = operationMapForDependencies[dependency.type](dependency.operation, leftValue);
        changedObject[dependency.rightOperand] = newRightOperand;
    });
    return modelInstance
};

const modelInstanceGenerate = function (model, strategy, dependenciesInModel) {
    // var modelInstance = JSON.parse(JSON.stringify(model));
    var modelInstance = _.cloneDeep(model);
    modelInstance = generation(modelInstance, strategy);
    if (dependenciesInModel) {
        modelInstance = correctModel(modelInstance, dependenciesInModel);
    }
    return modelInstance;
};

module.exports.modelInstanceGenerate = modelInstanceGenerate;
