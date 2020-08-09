const Email = require('./../models/email')
    , generator = require('../lib/generator')
    , errors = require('./../errors/errors');

module.exports.generateEmailModel = function (email) {
    return new Promise(function (resolve, reject) {
        try {
            let emailData = new Email();
            emailData.email = email;
            emailData.passcode = generator.generateDigits(6);
            emailData.save(function (error, doc) {
                if (error) {
                    return reject(errors.generateError("InternalServerError", error));
                }
                resolve(doc);
            });
        } catch (error) {
            return reject(errors.errorsHandling("InternalServerError", error));
        }
    });
};