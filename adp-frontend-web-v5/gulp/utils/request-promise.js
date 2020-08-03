const request = require('request');
const APP_CONFIG = require('../config').APP_CONFIG();

function requestPromise(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (APP_CONFIG.debug) {
        console.log('----------------- START LOG -----------------');
        console.log('Request params', JSON.stringify(options, null, 2));
        console.log('Response params', JSON.stringify(response, null, 2));
        console.log('----------------- END LOG  -----------------');
      }

      if (error || response.statusCode > 200) {
        reject(`Request to ${options.url} rejected.`, error);
      }
      resolve(body);
    })
  })
}

module.exports = requestPromise;
