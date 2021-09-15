const request = require('request');
const _ = require('lodash');
const envConfig = require('../config').getEnvConfig();

function requestPromise(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (envConfig.debug) {
        console.log('----------------- START LOG -----------------');
        console.log('Request params', JSON.stringify(options, null, 2));
        console.log('Response params', JSON.stringify(response, null, 2));
        console.log('----------------- END LOG  -----------------');
      }

      if (error || response.statusCode > 200) {
        const errorMessage = _.get(error, 'message', '');
        return reject(new Error(`Request to ${options.url} rejected.\n${errorMessage}`));
      }
      resolve(body);
    });
  });
}

module.exports = requestPromise;
