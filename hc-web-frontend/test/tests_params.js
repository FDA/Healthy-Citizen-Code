const _ = require('lodash')
    , config = require('./config.json');

module.exports.params = {
    general: {
        url: config.frontEndUrl,
        backendUrl: config.backendUrl,
        schemaPath: "/schemas",
        interfacesPath: "/interface"
    },
    registrationTestCase: {
        url: config.frontEndUrl + "/#/auth/register",
        afterRegistrationUrl: config.frontEndUrl + "/#/auth/login",
        timeout: 30000
    },
    loginTestCase: {
        url: config.frontEndUrl + "/#/auth/login",
        afterLoginUrl: config.frontEndUrl + "/#/home",
        timeout: 30000
    },
    homeTestCase: {
        url: "/#/home"
    },
    addItemsTestCase: {
        timeout: 600000
    }
};

const generateNewUser = () =>  {
    const user = {firstName: "Jonny",
        lastName: "Doridan",
        email: "tester" + _.random(0, 999999) + "@gmail.com",
        password: "qweqweqwe",
        passwordRepeat: "qweqweqwe"
    };
    // console.log('Generate new user: ', user);
    return user;
};

module.exports.newUser = generateNewUser;