module.exports = function (mongoose) {
    const m = {
        addOne: function (path, appModelPart, next) {
            _.set(this, path, _.get(this, path) + 1);
            next();
        },
        appendQ: function (path, appModelPart, next) {
            _.set(this, path, _.get(this, path) + "Q");
            next();
        },
        appendW: function (path, appModelPart, next) {
            _.set(this, path, _.get(this, path) + "W");
            next();
        },
        assignD: function (path, appModelPart, next) {
            path.should.equal("");
            _.set(this, "d", new Date("2017-01-01"));
            next();
        },
    };
    return m;
};