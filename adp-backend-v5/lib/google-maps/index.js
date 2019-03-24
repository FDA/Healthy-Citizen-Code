const googleMapsClient = require('@google/maps').createClient({
  key: process.env.GOOGLE_API_KEY,
  Promise: require('bluebird'),
});

module.exports = googleMapsClient;
