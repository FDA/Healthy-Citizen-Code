const _ = require('lodash');

const findInvisiblePaths = function (model) {
    let arrayWithInvisiblePath = [];
    if (_.isArray(model)) {
        for (let i=0; i<model.length; i++) {
            let innerArray = findInvisiblePaths(model[i]);
            if (innerArray.length > 0) {
                _.each(innerArray, function (innerArrayItem) {
                    arrayWithInvisiblePath.push("[" + i + "]." + innerArrayItem);
                })
            }
        }
    } else if (_.isObject(model)) {
        _.each(model, function (value, key) {
            if (value.visible === false) {
                arrayWithInvisiblePath.push(key);
            } else {
                let innerArray = findInvisiblePaths(value);
                if (innerArray.length > 0) {
                    _.each(innerArray, function (innerArrayItem) {
                        if (innerArrayItem[0] === "[") {
                            arrayWithInvisiblePath.push(key + innerArrayItem);
                        } else {
                            arrayWithInvisiblePath.push(key + "." + innerArrayItem);
                        }
                    })
                }
            }
        })
    }
    return arrayWithInvisiblePath;
};

module.exports = function (model, instance) {
    let invisibleFieldsPaths = findInvisiblePaths(model);
    _.each(invisibleFieldsPaths, function (path) {
        _.unset(instance, path);
    });
    return instance
};

