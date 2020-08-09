const _ = require('lodash');

// const findField = function (obj, key, value) {
//     let result = false;
//     if (_.isArray(obj)) {
//         _.each(obj, function (item) {
//             if (findField(item, key, value)) {
//                 result = true;
//                 return;
//             }
//         });
//     } else if (_.isObject(obj)) {
//         _.each(obj, function (iteratedObjValue, iteratedObjKey) {
//             if (iteratedObjKey === key && iteratedObjValue) {
//                 result = true;
//                 return
//             }
//             else if (_.isObject(iteratedObjValue)) {
//                 if (findField(iteratedObjValue, key, value)) {
//                     result = true;
//                     return;
//                 }
//             }
//         })
//     }
//     if (result) {
//         return result;
//     }
//     return result;
// };


module.exports.isExist = function (objForValidate, verifiableKey, verifiableValue) {
    const compareFunction = function (a, b) {
        // TODO may be later will be add functionality for compare objects
        return !(a === b);
    };
    
    const validate = function (item) {
        return compareFunction(item[verifiableKey], verifiableValue);
    };
    let result = [];
    if (_.isArray(objForValidate)) {
        for (let i=0; i<objForValidate.length; i++ ) {
            if (!validate(objForValidate[i])) {
                result.push(i);
            }
        }
    }
    if (_.isObject(objForValidate)) {
        if (!validate(objForValidate)) {
            result = true
        }
    }
    if (result.length === 0) {
        result = false;
    }
    return result;
};