
const auth = require("./../routes/auth")
    , SubSchemasCrudController = require('./../controllers/sub_schemas_crud_controller').SubSchemasDynamicController
    , logger = require('log4js').getLogger()
    , dynamicRoutesConfig = require('./../src/data_model/dynamic_routes_config.json')
    , _ = require('lodash');

const basicPathInUrl = "/api/phi/";

const methodsForConfig = {
    getTypes: (key) => {
        return (req, res) => {
            const types = [];
            _.each(dynamicRoutesConfig[key].items, function (item) {
                types.push(item.type);
            });
            res.json({status: 200, data: types})
        }
    }
};

const addRoutesFromConfigSettings = (key, app) => {
    if (dynamicRoutesConfig[key]) {
        const config = dynamicRoutesConfig[key];
        _.each(config.additionalRoutFunctions, function (routData) {
            if (routData.isAuth) {
                app[routData.requestType]('/api/' + key + "/" + routData.urlEndPart, auth.isAuthenticated, methodsForConfig[routData.functionName](key));
            } else {
                app[routData.requestType]('/api/' + key + "/" + routData.urlEndPart, methodsForConfig[routData.functionName]);
            }
        })
    }
};

let levelOfNesting = 0;
// TODO split big function to little
const parseArray = (modelJson, Model, app, routingPath, value, key, pathInObject) => {
    let subSchemasDynamicController = new SubSchemasCrudController(Model, key, "phi", pathInObject);
    let validationFunctions = {
        readAll: [],
        readById: [],
        create: [],
        update: [],
        deleteById: []
    };
    if (dynamicRoutesConfig[key]) {
        validationFunctions = dynamicRoutesConfig[key].firstValidationFunctionsForMethods;
    }
    const buildNewRout = routingPath +  key;
    const subSchemaRoutingId = "/id/:" + key + "Id";
    app.get(buildNewRout,                      auth.isAuthenticated, subSchemasDynamicController.readAll(   validationFunctions.readAll));
    app.get(buildNewRout + subSchemaRoutingId, auth.isAuthenticated, subSchemasDynamicController.readById(  validationFunctions.readById));
    app.post(buildNewRout,                     auth.isAuthenticated, subSchemasDynamicController.create(    validationFunctions.create));
    app.put(buildNewRout + subSchemaRoutingId, auth.isAuthenticated, subSchemasDynamicController.update(    validationFunctions.update));
    app.del(buildNewRout + subSchemaRoutingId, auth.isAuthenticated, subSchemasDynamicController.deleteById(validationFunctions.deleteById));
    
    // Its correct only for child shemas on level 2.
    if (levelOfNesting === 1) { // find subshemas for fields on level of first level of nesting
        _.each(modelJson[key], function (parentDocValue, parentDocKey) {
           if (parentDocKey === 0) {//it's parent array
                _.each(parentDocValue, function (childDocValue, childDocKey) {
                    if (_.isArray(childDocValue)) {
                        const urlForGetAllSubshcmas = basicPathInUrl + key + "/" + childDocKey
                        app.get(urlForGetAllSubshcmas, auth.isAuthenticated, subSchemasDynamicController.readAllFromChildSchema(childDocKey));
                        logger.warn("generate endpoint for GET ", urlForGetAllSubshcmas)
                    }
                })
           }
        });
    }
    
    logger.warn('Generate endpoints for ', buildNewRout);
    addRoutesFromConfigSettings(key, app);
    _.each(value, function (subModel, index) {
        buildAndBindNewRoutes(subModel, Model, app, buildNewRout + subSchemaRoutingId + "/", pathInObject);
    });
};

const parseObject = (modelJson, Model, app, routingPath, value, pathInObject) => {
    _.each(value, function (subModel, key) {
        buildAndBindNewRoutes(subModel, Model, app, routingPath + "/key", pathInObject, pathInObject);
    });
};


const buildAndBindNewRoutes = (modelJson, Model, app, routingPath, pathInObject) => {
    levelOfNesting++;
    _.each(modelJson, function (value, key) {
        let newPathInObject = pathInObject;
        if (newPathInObject !== "") {
            newPathInObject = newPathInObject + ".";
        }
        newPathInObject = newPathInObject + key;
        if (value.type && (typeof value.type === "string")) {
            return
        }
        if (_.isArray(value)) {
            newPathInObject = newPathInObject + "[0]";
            parseArray(modelJson, Model, app, routingPath, value, key, newPathInObject);
        } else if (_.isObject(value)) {
            parseObject(modelJson, Model, app, routingPath, value, newPathInObject);
        }
    });
    levelOfNesting--;
};

module.exports.addDynamicRoutes = (modelJson, Model, app) => {
    buildAndBindNewRoutes(modelJson, Model, app, basicPathInUrl, "");
};