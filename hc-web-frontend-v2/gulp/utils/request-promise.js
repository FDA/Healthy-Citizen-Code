const Promise = require('promise');
const request = require('request');

function requestPromise(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        reject('Request rejected: ', error);
      }
      resolve(body);
    })
  })
}

module.exports = requestPromise;