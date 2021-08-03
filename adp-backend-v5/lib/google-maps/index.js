const googleMaps = require('@google/maps');

module.exports = (googleApiKey) =>
  googleMaps.createClient({
    key: googleApiKey,
    Promise: require('bluebird'),
  });
