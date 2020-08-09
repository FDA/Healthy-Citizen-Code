const _ = require('lodash')
    , lists = require('./../src/data_model/lists')
    , errors = require('./../errors/errors');

const isSubSchema = (model) => {
    return _.isArray(model)
};

/*
    Function for validate body, before insert it to database
    @param model - object with model structure. Can be sub-schema. Expect model in mongoose format
    @param request - body from req.
    Request param will be changed after function. All extra fields will be remove. Fields for subschemas will be delete too.
 */
const findAndRemoveExtraFieldInRequestObject = function (model, request) {
    if (!model) {
        throw errors.generateError("InternalServerError", "findAndRemoveExtraFieldInRequestObject must get first param with schema model");
    }
    if (!request) {
        throw errors.generateError("BadRequestError", "Empty request params");
    }
    if (_.isObject(model) && (!model.type || typeof model.type!== 'string')) {
        _.each(request, function (value, key) {
            if (!model[key] || isSubSchema(model[key])) { // extra fields
                delete request[key];
            } else if (model[key].list) { // validate enums values
                const listName = model[key].list;
                const listValueFromRequest = request[key];
                // if (!lists[listName][listValueFromRequest]) {
                //     throw {status: 400, error: "Not found value for key " + listValueFromRequest + " in list"}
                // }
            }
        });
        return true;
    } else {
        throw errors.generateError("InternalServerError", "Not correct model for validate");
    }
};

module.exports.validate = function (model, requestObj) {
    let requestObjCopy = _.cloneDeep(requestObj);
    findAndRemoveExtraFieldInRequestObject(model, requestObjCopy);
    return requestObjCopy;
};