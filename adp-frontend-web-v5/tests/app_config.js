const dotenv = require('dotenv');

module.exports = function () {
  dotenv.config({path: '.env'});

  const {
    SERVER_BASE_URL,
    API_URL,
    API_PREFIX,
  } = process.env;
  const serverBaseUrl = SERVER_BASE_URL || API_URL;
  const apiPrefix  = API_PREFIX || '';
  const apiUrl = `${serverBaseUrl}${apiPrefix}`;

  return {
    serverBaseUrl,
    apiPrefix,
    apiUrl,
  }
};
