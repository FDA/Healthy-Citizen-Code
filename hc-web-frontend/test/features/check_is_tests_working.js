
module.exports.testGoogleSearch = () => {
    describe('basic test in google', function () {
        this.timeout(10000);
        
        it('should open google, set input and get new input value', function () {
            browser.url("http://google.com");
            browser.waitForVisible('input', 50000);
            browser.setValue('[name="q"]', "test");
            expect(browser.getValue('[name="q"]')).to.be.a("'test'");
        });
    });
}