const _ = require('lodash');

module.exports.isFieldSubSchema = (data) => {
    return !data.type || (typeof data.type !== 'string')
};

module.exports.getSubSchema = (modelJSON, path) => {
    let schema = _.get(modelJSON, path);
    if (_.isArray(schema)) {
        schema = schema[0];
    }
    return schema;
};
