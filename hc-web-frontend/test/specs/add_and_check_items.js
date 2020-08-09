const paramsModule = require('./../tests_params')
    , config = require('../config.json')
    , browserExecutes = require('./../helpers/browserExecutes')
    , _ = require('lodash');

    // , generalTestsParams = paramsModule.params.general
    // , addItemsTestCase = paramsModule.params.addItemsTestCase
    // , userData = require('./../tests_params').newUser
    // , _ = require('lodash')
    // , itemsConfig = require('./../nav_bar_config')
    // , formData = require('./../features/forms/form')
    // , browserExecutes = require('./../helpers/browserExecutes')
    // , config = require('../config.json')
    // , modelWorker = require('./../helpers/modelWorker');

const generalTestSettings = require('./../tests_params').params.general;

const server = require('./../server.js');
const request = require('request');


describe('server response', function () {
    before(function () {
        server.listen(8000);
    });

    // after(function () {
    //     server.close();
    // });
});

// Tests
describe('Main tests', function() {
    let modelJSON, interfaces;
    let schemaUrl = generalTestSettings.backendUrl + generalTestSettings.schemaPath;
    let interfacesUrl = generalTestSettings.backendUrl + generalTestSettings.interfacesPath;
        
    
    // Before
    before(function () {
        browser.url(config.frontEndUrl + '/#/auth/login');
        browser.waitForVisible('input', 15000);
        
        browser.setValue('[name="email"]', 'test@test.com');
        browser.setValue('[name="password"]', 'test');

        browser.waitForEnabled('button[type=submit]', 15000);
        browser.click('button[type=submit]');
    });

    describe('Configs loader', function () {
        browser.call(function () {
            request.get(schemaUrl, function (err, res, body){
                expect(res.statusCode).to.equal(200);
                modelJSON = JSON.parse(res.body).data;
            });
        });

        browser.call(function () {
            request.get(interfacesUrl, function (err, res, body) {
                expect(res.statusCode).to.equal(200);    
                interfaces = JSON.parse(res.body).data;
            });
        });
    });
    
    
    it('should check that dashboard exists', function () {
        this.timeout(10000);

        browser.url(config.frontEndUrl + '/#/home');
        browser.waitForVisible('hc-dashboard-tile', 300000);
    });

    it('should compare menu links with interfaces config', function () {
        
        let firstItem = _.first(browser.getText('.ms-navigation ul li:first-child a span'));
        expect(firstItem).to.equal('Home');
    });



    it('should check the order of menu links', function () {
        
        let menuConfig = interfaces.main_menu;
        
        let i = 2;

        _.each(menuConfig.fields, function (value, key) {
            let itemSelector = `.ms-navigation > ul > li:nth-child(${i}) span`;
            let menuItem = browser.getText(itemSelector);

            if (Array.isArray(menuItem)) {
                expect(menuItem[0]).to.equal(value.fullName);    
            } else {
                expect(menuItem).to.equal(value.fullName);
            }
        
            i++;
        }); 
    });


    it('should check dashboard', function () {
        browser.url(config.frontEndUrl + '/#/home');
        browser.waitForVisible('hc-dashboard-tile', 300000);

        let dashboardItemsLen = browser.getText('.content .widget-group hc-dashboard-tile').length;
        let configDashboardItemsLen = _.keys(interfaces.mainDashboard.fields).length;

        expect(dashboardItemsLen).to.equal(configDashboardItemsLen);
    });
    

    it('should check forms', function () {
        browser.url(browser.getAttribute('.ms-navigation > ul > li:nth-of-type(2) a:first-of-type', 'href')[0]);
        browser.waitForVisible('.submit-button', 300000);
        
        let url = browser.getUrl().split('#')[1];
        let schemaItem = url.split('/').join('.');
        schemaItem = schemaItem.substring(1);
        schemaItem = schemaItem.split('.').join('.fields.');
        schemaItem = _.at(modelJSON, schemaItem);


        browser.click('.submit-button');
        browser.waitForVisible('.form-wrapper md-input-container', 300000);
        it('should compare fields with config', function () {
            this.timeout(10000);
            // console.log('1');
            
            // browser.call(function () {
            //     _.each(schemaItem.fields, function (value, key) {
            //         if (value.visible !== false) {
            //             expect(browser.getAttribute('#' + key, 'id').to.equal(key));
            //         }
            //     });
            // });
        });
        
    });
    

});


// describe('Get schema', function () {
//     let modelJSON;
//     let modelPromise = pullData.getModel();


//     before(function (done) {
//         request.get(schemaUrl, function (err, res, body){
//             console.log('res',res);
//             let modelJSON = res;
//             // done();
//         });
//     });


//     describe('Model checker', function () {
//         this.timeout(10000);


//         it ('should have model loaded', function (done) {
//             console.log(modelJSON);
//             // done();
//         });

//         it('should return 400', function (done) {
//           request.get(schemaUrl, function (err, res, body){
//             console.log(res);
//             // expect(res.statusCode).to.equal(200);
//             // expect(res.body).to.equal('wrong header');
//             // done();
//           });
//         });
        
//     });
 
// });






// const paramsModule = require('./../tests_params')
//     , generalTestsParams = paramsModule.params.general
//     , addItemsTestCase = paramsModule.params.addItemsTestCase
//     , userData = require('./../tests_params').newUser
//     , _ = require('lodash')
//     , itemsConfig = require('./../nav_bar_config')
//     , formData = require('./../features/forms/form')
//     , browserExecutes = require('./../helpers/browserExecutes')
//     , modelWorker = require('./../helpers/modelWorker');

// const loginTestCases = require('./../features/login')
//     , registrationTestCases = require('./../features/registration')
//     , pullData = require('./../helpers/pullData');


// registrationTestCases.registrationPositiveTest(userData);

// loginTestCases.loginPositiveTest(userData);


// describe('Get schema', function() {
    
//     /**
//      * Pull model.json before start tests
//      */
//     let modelJSON;
//     before(function async () {
//         pullData.getModel()
//             .then((model)=> {
//                 modelJSON = model;
//             })
//             .catch((error) => {
//                 console.log('error in pull model.json function');
//             })
//     });
    
//     const openPopup = (selector) => {
//         browser.waitForVisible(selector, 10000);
//         browser.click(selector);
//     };
    
//     describe('Nav bar functionality', function() {
//         this.timeout(addItemsTestCase.timeout);
//         const dataForInsert = {};
//         _.each(itemsConfig, (testData, fieldName) => {
//             const modelPrefix = testData.prefix;
//             const pathToObject = testData.prefix + fieldName;
//             let previousItIsFinish = true;
    
//             /**
//              1) open popup with form for add new item in phi.
//              */
//             let itDescription = 'should open popup for new ' + fieldName + ' form.';
//             if (previousItIsFinish) {
//                 it(itDescription, function () {
//                     previousItIsFinish = false;
//                     if (browser.isVisible('.cancel-button')) {
//                         browser.click('.cancel-button');
//                     }
//                     browser.waitForVisible('ms-navigation', 10000);
//                     browser.url(generalTestsParams.url + testData.path);
//                     openPopup('.submit-button');
//                     previousItIsFinish = true;
//                 });
//             }
//             //
//             /**
//              * 2) generate new form data, insert it in form and submit
//              */
//             if (previousItIsFinish) {
//                 itDescription = 'should add new ' + fieldName + ' to the system';
//                 it(itDescription, function () {
//                     previousItIsFinish = false;
//                     console.log(modelJSON);
//                     const schema = modelWorker.getSubSchema(modelJSON, modelPrefix + fieldName);
//                     dataForInsert[pathToObject] = formData.generateNewFormData(schema, fieldName);
//                     formData.fillAndSubmitForm(dataForInsert[pathToObject]);
//                     previousItIsFinish = true;
//                 });
//             }
            
//             /**
//              *  4) check data of new item in table and open edit form with new element data
//              */
//             if (previousItIsFinish) {
//                 itDescription = 'should open edit form popup for new ' + fieldName;
//                 it(itDescription, function () {
                    
//                     const keys = _.keys(dataForInsert[pathToObject]);
    
//                     // For find new element in table.
                     
                    
//                     let i;
//                     let isEnabledNextButton = true;
//                     let isFoundIndex = false;
//                     let maxDivScroll = browserExecutes.getMaxScrollTop('md-content');
                    
//                     while (isEnabledNextButton && isFoundIndex === false) {
//                         browser.waitForVisible('tr', 10000);
//                         isEnabledNextButton = browser.isEnabled('.next');
//                         i = 1; // cause first it's header
//                         while (i <= 11 && !isFoundIndex) {
//                             i++;
//                             browser.waitForVisible('tr');
//                             const trSelector = 'tr:nth-child(' + i + ')';
//                             const callback = () => {
//                                 console.log('isv: ', browser.isVisible(trSelector));
//                                 return browser.isVisible(trSelector);
//                             };
//                             browserExecutes.findElementInScrollableZoneAndCallCallback('md-content', callback, 0, maxDivScroll);
//                             if (! browser.isVisible(trSelector)) {
//                                 console.log('not visible ', trSelector)
//                             } else {
//                                 let tdTexts = browser.element(trSelector).getText()
//                                 let keysStr = "";
//                                 _.each(keys, (key, index) => {
//                                     const currentInsertedData = dataForInsert[pathToObject][key];
//                                     let insertedDataInBrowserFormat = formData.generateDataByType[currentInsertedData.type][typeof currentInsertedData.list].getData(currentInsertedData);
//                                     keysStr += insertedDataInBrowserFormat + " ";
//                                 });
//                                 console.log(keysStr.slice(0, tdTexts.length), '|||', tdTexts)
//                                 if (keysStr.slice(0, tdTexts.length) === tdTexts) {
//                                     isFoundIndex = true;
//                                 }
//                             }
//                         }
//                         console.log(isFoundIndex, isEnabledNextButton)
//                         if (isFoundIndex === false && isEnabledNextButton) {
//                             console.log('click on next button in table')
//                             browser.click('.next');
//                             browser.waitForVisible('tr', 10000);
//                             maxDivScroll = browserExecutes.getMaxScrollTop('md-content');
//                         }
//                     }
                    
//                     browser.pause(3000)
//                     const trSelector = 'tr:nth-child(' + i + ')';
                    
//                     browser.element(trSelector).click('.update-button');
//                     previousItIsFinish = true;
//                 });
//             }
            
//             /**
//              *  4) check new data in table
//              */
//             if (previousItIsFinish) {
//                 itDescription = 'should check in table new ' + fieldName;
//                 it(itDescription, function () {
//                     previousItIsFinish = false;
//                     formData.checkFormValues(dataForInsert[pathToObject]);
//                     previousItIsFinish = true;
//                 });
//             }
//         });
//     });
// });

