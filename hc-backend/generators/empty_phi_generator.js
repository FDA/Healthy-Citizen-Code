const modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
    , modelsJson = require('./../src/data_model/model-v2')

    , _ = require('lodash');

module.exports = function () {
    let emptyPhi = modelInstanceGenerator(modelsJson.models.phi, "empty");
    _.each(emptyPhi, function (value, key) {
        if(_.isArray(value)) {
            emptyPhi[key] = [];
        }
    });
    return emptyPhi
};

module.exports.generatePhiSubSchema = (subSchemaName) => {
    let model = modelsJson.models.phi[subSchemaName][0];
    let newItem = {};

    _.each(model, function (value, key) {
        if (value.type && !value.type.type) {
            if (value.list)
                newItem[key] = [];
            else {
                newItem[key] = "";
            }
        } else {
            newItem[key] = [];
        }
    });
    return newItem;
};