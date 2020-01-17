const dotenv = require('dotenv');

module.exports = function () {
  dotenv.config({path: '.env.test'});

  return {
    "hostUrl": process.env.HOST_URL,
    "apiUrl": process.env.API_URL,
    "basicAuth": {
      "username": process.env.BASIC_AUTH_USERNAME,
      "password": process.env.BASIC_AUTH_PWD
    },
    "user": {
      "login": process.env.USER_LOGIN,
      "password": process.env.USER_PWD
    },
    "showBrowser": process.env.SHOW_BROWSER === 'true'
  }
};