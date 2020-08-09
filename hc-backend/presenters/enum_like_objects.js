const lists = require('./../src/data_model/lists')
    , _ = require('lodash');

const findEnumsInModel = function (model) {
    let arrayWithEnumsPath = [];
    if (_.isArray(model)) {
        for (let i=0; i<model.length; i++) {
            let innerArray = findEnumsInModel(model[i]);
            if (innerArray.length > 0) {
                _.each(innerArray, function (innerArrayItem) {
                    arrayWithEnumsPath.push("[" + i + "]." + innerArrayItem);
                })
            }
        }
    } else if (_.isObject(model)) {
        _.each(model, function (value, key) {
            if (value.list) {
                arrayWithEnumsPath.push(key);
            } else {
                let innerArray = findEnumsInModel(value);
                if (innerArray.length > 0) {
                    _.each(innerArray, function (innerArrayItem) {
                        if (innerArrayItem[0] === "[") {
                            arrayWithEnumsPath.push(key + innerArrayItem);
                        }else {
                            arrayWithEnumsPath.push(key + "." + innerArrayItem);
                        }
                    })
                }
            }
        })
    }
    return arrayWithEnumsPath;
};

/* This function need, because findEnumsInModel function can found only paths like a "a[0]b". It path in model, but
    we need paths to all objects in arrays - a[0]b, a[1]b, a[2]b.
    returned value:
    [
        {
            listPath: "here path to list for current enum in model"
            enumPaths: [ here path to enums in object]
        }
    ]
*/
const addPathsForAllEnumsInObj = (listsPaths, objectsWithEnums) => {
    let allNewPaths = [];
    _.each(listsPaths, function (path) {
        let newPaths = [];
        let pathsBetweenArrays = path.split("[0]");
        if (pathsBetweenArrays.length > 1) {
            for(let i=1; i<pathsBetweenArrays.length; i++) {
                if (newPaths.length === 0) {
                    newPaths.push(pathsBetweenArrays[0]);
                } else {
                    for (let j=0; j<newPaths.length; j++) {
                        newPaths[j] = newPaths[j] + pathsBetweenArrays[i];
                    }
                }
                let updatedNewPaths = [];
                _.each(newPaths, function (newPath) {
                    let currentArray = _.get(objectsWithEnums, newPath);
                    if (currentArray && _.isArray(currentArray) && currentArray.length > 0) {
                        for (let currentArrayIndex=0; currentArrayIndex < currentArray.length; currentArrayIndex++) {
                            updatedNewPaths.push(newPath + "[" + currentArrayIndex + "]");
                        }
                    }
                });
                newPaths = updatedNewPaths;
            }
    
            for(let i=0; i<newPaths.length; i++) {
                newPaths[i] = newPaths[i] + pathsBetweenArrays[pathsBetweenArrays.length - 1];
            }
            let newObjWithAllPathes = {listPath: path, enumPaths: []};
            _.each(newPaths, function (newPath) {
                if (newPath) newObjWithAllPathes.enumPaths.push(newPath);
            });
            allNewPaths.push(newObjWithAllPathes);
        } else {
            let obj = _.get(objectsWithEnums, path);
            if (obj && _.isArray(obj) && obj.length > 0) {
                allNewPaths.push({listPath: path, enumPaths: [path]});
            }
        }
    });
    return allNewPaths;
};

const generateEnumObj = function (enumArray, list) {
    let enums = [];
    let enumObj;
    _.each(enumArray, function (currentEnum) {
        if (currentEnum !== "") {
            enumObj = {};
            enumObj[currentEnum] = list[currentEnum];
            enums.push(enumObj);
        } else {
            enums.push(enumObj);
        }
    });
    return enums
};

module.exports = function (model, objectsWithEnums) {
    
    let listsPaths = findEnumsInModel(model);
    
    let allPaths = addPathsForAllEnumsInObj(listsPaths, objectsWithEnums);
    let listEndValue, listName, currentList, enumStringArray, enumObjectsArray;
    _.each(allPaths, function (pathObj) {
        listEndValue = _.get(model, pathObj.listPath);
        
        if (listEndValue) {
            listName = listEndValue.list;
            currentList = lists[listName];
            
            _.each(pathObj.enumPaths, function (enumPath) {
                enumStringArray = _.get(objectsWithEnums, enumPath);
                if (enumStringArray) {
                    enumObjectsArray = generateEnumObj(enumStringArray, currentList);
                    if (enumPath.indexOf('.') === -1 && enumPath.indexOf('[') === -1) {
                        objectsWithEnums[enumPath][0] = enumObjectsArray[0];
                    } else {
                        _.set(objectsWithEnums, enumPath, enumObjectsArray);
                    }
                }
            })
        }
    });
    return objectsWithEnums;
};