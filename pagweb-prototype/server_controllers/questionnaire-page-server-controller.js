/**
 * Implements endpoints of various dashboards
 * @returns {{}}
 */
module.exports = function (globalMongoose) {
    const fs = require('fs');
    const _ = require("lodash");
    const async = require('async');

    const mongoose = globalMongoose;

    let m = {};

    m.init = (appLib) => {
        appLib.addRoute('get', `/questionnaire/data`, [appLib.isAuthenticated, m.testData]);
    };

    m.testData = (req, res, next) => {
        /**
         * This method is a placeholder, in theory PAG website should not need any server endpoints
         */
        res.json(200, {success: true, message: "Test"});
        next();
    };

    return m;
};