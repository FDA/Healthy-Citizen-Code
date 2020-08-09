const loginSettings = require('./../tests_params').params.loginTestCase;
/**
 * Positive test on login page, should login to the site. //TODO while expect opened login page
 * @param params {object} - params for test. Expected format:
 * {
 *      email,
 *      password,
 * }
 */
module.exports.loginPositiveTest = (params) => {
    describe('login positive test', function() {
        this.timeout(loginSettings.timeout);
        it('should login to the system', function () {
            browser.waitForVisible('input', 15000);
            browser.setValue('[name="email"]', params.email);
            browser.setValue('[name="password"]', params.password);
            browser.click('.submit-button');
            browser.waitUntil(function () {
                return browser.getUrl() === loginSettings.afterLoginUrl;
            }, 7000, 'expected url: ' + loginSettings.afterLoginUrl + ' after success login');
        });
    });
};

// module.exports.loginNegativeTest = () => {
    // describe('login test cases', function() {
        // it('should return error after login - password is not correct', function () {
        //     browser.waitForVisible('input', 10000);
        //
        //     browser.url(generalTestsParams.url + loginTestCase.url);
        //     browser.setValue('[name="email"]', userData.email);
        //     browser.setValue('[name="password"]', userData.password + userData.password);
        //
        //     browser.click('.submit-button');
        //     expect(browser.getText('.errors li')).to.be("Authentication failed. Wrong email/password.");
        // });
    // }
// }