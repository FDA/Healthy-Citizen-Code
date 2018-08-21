;(function () {
  angular
    .module('app.adpCommon')
    .factory('AdpGeoLocationService', AdpGeoLocationService);

  function AdpGeoLocationService(
    GoogleMapsApi,
    APP_CONFIG,
    GeoCoder,
    $q
  ) {
    return {
      reverseGeocode: reverseGeocode,
      getLocation: getLocation,
      geocode: geocode,
      isReady: isReady
    };

    function isReady() {
      var url = _configureURL();
      return GoogleMapsApi.load(url);
    }

    function _configureURL() {
      var BASE_URL = 'https://maps.google.com/maps/api/js';
      var params = {
        libraries: 'places',
        v: '3.29',
        key: APP_CONFIG.googleApiKey
      };

      var queryParamsString = _.map(params, function(value, key) {
        return [key, value].join('=');
      }).join('&');

      return [BASE_URL, queryParamsString].join('?');
    }

    /**
     * Get current location
     * @return Position(Position{})
     */
    function getLocation() {
      return $q(function(resolve, reject) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            resolve([position.coords.latitude, position.coords.longitude]);
          });
        } else {
          reject('Geolocation is not supported by this browser.');
        }
      });
    }

    /**
     * Convert human readable format of location to latitude and longitude
     * @param address string
     * @return Promise(latlng[])]
     */
    function geocode(address) {
      return GeoCoder.geocode({'address': address})
        .then(function(result) {
          if (result[0].types.indexOf('street_address') > -1) {
            return result[0];
          } else {
            return { name: address }
          }
        }, function(error) {
          console.log('Geocode was not successful for the following reason: ' + error);
        });
    }

    /**
     * Convert latitude and longitude to human readable location format
     * @param coords[lat, lng]
     * @return Promise{string}
     */
    function reverseGeocode(coords) {
      return GeoCoder.geocode({
        'location': {
          "lat" : coords[0],
          "lng" : coords[1]
        }
      })
      .then(function(results) {
        return results[0].formatted_address;
      }, function(error) {
        console.log('Geocode was not successful for the following reason: ' + error);
      });
    }
  }
})();