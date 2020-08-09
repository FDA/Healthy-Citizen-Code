const registrationSettings = require('./../tests_params').params.registrationTestCase;
/**
 * Registrate new user in system
 * @param params {object} - object with params for test. Expected format:
 * {
 *      firstName
 *      lastName
 *      email
 *      password
 *      passwordRepeat
 * }
 */
module.exports.registrationPositiveTest = (params) => {
    describe('registration new user', function() {
        this.timeout(registrationSettings.timeout);
        
        it('should register new test user in system', function () {
            browser.url(registrationSettings.url);
            browser.waitForVisible('input', 15000);
            
            browser.setValue('[name="firstName"]', params.firstName);
            browser.setValue('[name="lastName"]', params.lastName);
            browser.setValue('[name="email"]', params.email);
            browser.setValue('[name="password"]', params.password);
            browser.setValue('[name="repeatPassword"]', params.passwordRepeat);
            
            browser.click('.submit-button');
            browser.waitUntil(function () {
                return browser.getUrl() === registrationSettings.afterRegistrationUrl
            }, 7000, 'expected url: ' + registrationSettings.afterRegistrationUrl + ' after registration new user');
        });
    });
};
