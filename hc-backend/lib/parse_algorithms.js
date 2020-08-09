const _ = require('lodash');

/*
    Function for build correct paths in deep Model with SubSchemas.
    @param pathToModel - path ti fields in mongoose model. Now after parse model.json we has path with 0 index in arrays.
    @param params - params from req. Expected params for fields - "fieldName" + "Id".
    @param withEndArrayIndex - flag for build strategy. If true - build end of path with index from params, else (or undefined) - not.
    Check tests for more information
    
    @return array with objects like a:
        {
            path: path to sub-schema
            id: sub-schema id
        }
 */

module.exports.parseReqParamsForDynamicRoutesAndBuildPaths  = (pathToModel, params, withEndArrayIndex) => {
    const isLastIndex = (index, lastIndexForAlgorithm) => {
        return index === lastIndexForAlgorithm - 1;
    };
    
    let correctPaths = [];
    let splittedPathToModel = pathToModel.split("[0]");
    let lastIndexForAlgorithm = splittedPathToModel.length - 1;
    for (let i=0; i < lastIndexForAlgorithm; i++) { // we use for because pathToModel had format like a a.b[0].f ... a[0]
        let innerArray = splittedPathToModel[i].split('.');
        let fieldWithArray = innerArray[innerArray.length - 1];
        let currentParamId = params[fieldWithArray + "Id"];
        let arrPart = splittedPathToModel[i];
        if (arrPart[0] === ".") {
            arrPart = arrPart.substr(1)
        }
        let newItem = {path: arrPart};
        if (currentParamId) {
            if (!isLastIndex(i, lastIndexForAlgorithm) || (withEndArrayIndex === true)) {
                newItem.id = currentParamId;
            }
        } else {
            if (!isLastIndex(i, lastIndexForAlgorithm) ||
                (isLastIndex(i, lastIndexForAlgorithm) && withEndArrayIndex === true)) {
                throw { error: "params not contain Id for field " + fieldWithArray }
            }
        }
        correctPaths.push(newItem)
        
    }
    return correctPaths;
};
