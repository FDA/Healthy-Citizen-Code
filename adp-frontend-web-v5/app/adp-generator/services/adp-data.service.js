;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpDataService', AdpDataService);

  /** @ngInject */
  function AdpDataService (
    AdpSessionService,
    $http,
    APP_CONFIG
  ) {
    return {
      getDashboardData: getDashboardData,
    };

    // TODO update action for single page controller
    // function getSingleRecordData(params) {
    //   var getUrl = getResourceUrl(params.link);
    //
    //   return $http.get(getUrl)
    //     .then(function (response) {
    //       var data = _.isArray(response.data.data) ? response.data.data[0] : response.data.data;
    //       return data || {};
    //     })
    //     .then(function (data) {
    //       return appDb.schema.set(params.fieldName, data)
    //         .then(function () {
    //           return data;
    //         });
    //     })
    //     .catch(function (err) {
    //       console.warn('Data for fetch ' + params.fieldName + ' failed. Falling back to cache', err);
    //       return appDb.schema.get(params.fieldName)
    //     });
    // }

    // TODO: move to dashboard module
    function getDashboardData (dashboardName) {
      var getUrl = getDashboardUrl(dashboardName);

      return $http.get(getUrl)
        .then(function (res) {
          return res.data.data;
        });
    }

    // TODO: move to dashboard module
    function getDashboardUrl (dashboardName) {
      return APP_CONFIG.apiUrl + '/dashboards/' + dashboardName + '/data';
    }
  }
})();
