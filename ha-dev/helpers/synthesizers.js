const _ = require("lodash");
module.exports = function () {

    return {
        udid: function (path, appModelPart, userContext, next) {
            const val = _.get(this, path);
            let udid = _.get(userContext, "session.udid");
            if (!udid) {
                throw "UDID was not specified";
            } else if (userContext.method === "POST") {
                _.set(this, path, udid);
            }
            next();
        }
    };
};
