/**
 * @module transformers
 * Implements functionality required for "transform" attribute for the app model
 */
module.exports = function () {

    const passportLocalMongoose = require('passport-local-mongoose');

    const m = {};

    m.user = (schema) => {
        schema.plugin(passportLocalMongoose, {
            usernameField: 'login',
            hashField: 'password',
            selectFields: ['piiId', 'phiId', 'login']
            //attemptsField, lastLoginField, limitAttempts, maxAttempts
        });
    };

    return m;
};