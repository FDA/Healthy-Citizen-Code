const dotenv = require('dotenv');

module.exports = function () {
  dotenv.config({path: '.env'});

  const serverBaseUrl = process.env.SERVER_BASE_URL;
  const apiPrefix  = process.env.API_PREFIX || '';
  const apiUrl = `${serverBaseUrl}${apiPrefix}`;

  return {
    serverBaseUrl,
    apiPrefix,
    apiUrl,
  }
};
