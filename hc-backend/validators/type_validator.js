
// TODO save remove it. Just use lodash
var isArray = function (a) {
    return (typeof a == "object") && (a instanceof Array);
};
module.exports.isArray = isArray;