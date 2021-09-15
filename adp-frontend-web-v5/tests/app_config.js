const dotenv = require('dotenv');
const { buildAppConfig } = require('../gulp/config');

let appConfig;
module.exports = async () => {
  if (!appConfig) {
    dotenv.config({ path: '.env' });
    const config = await buildAppConfig();
    appConfig = config.runtimeConfig;
  }
  return appConfig;
};
