const dotenv = require('dotenv');

module.exports = function () {
  dotenv.config({path: '.env'});

  return {
    "apiUrl": process.env.API_URL
  }
};