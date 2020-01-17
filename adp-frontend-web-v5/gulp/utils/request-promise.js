const Promise = require('promise');
const request = require('request');
const APP_CONFIG = require('../config').APP_CONFIG();

function requestPromise(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (APP_CONFIG.debug) {
        console.log('----------------- START LOG -----------------');
        console.log('Request params', JSON.stringify(options, 0, 2));
        console.log('Request params', JSON.stringify(response, 0, 2));
        console.log('----------------- END LOG  -----------------');
      }

      if (error) {
        reject(`Request to ${options.url} rejected.`, error);
      }
      resolve(body);
    })
  })
}

module.exports = requestPromise;