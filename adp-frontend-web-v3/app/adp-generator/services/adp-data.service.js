;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpDataService', AdpDataService);

  /** @ngInject */
  function AdpDataService (
    AdpSessionService,
    $http,
    CONSTANTS
  ) {
    return {
      getData: getData,
      getSingleRecordData: getSingleRecordData,
      getResourceUrl: getResourceUrl,
      getDashboardData: getDashboardData,
      getDashboardUrl: getDashboardUrl,
      getNestedData: getNestedData,
      createRecord: createRecord,
      updateRecord: updateRecord,
      deleteRecord: deleteRecord,
      createNestedRecord: createNestedRecord,
      updateNestedRecord: updateNestedRecord,
      deleteNestedRecord: deleteNestedRecord
    };

    function getData(link) {
      var getUrl = getResourceUrl(link);

      return $http.get(getUrl);
    }

    function getSingleRecordData(link, id) {
      var getUrl = getResourceUrl(link);
      if (id) getUrl += '/' + id;

      return $http.get(getUrl)
        .then(function (response) {
          response.data.data = _.isArray(response.data.data) ? response.data.data[0] : response.data.data;
          response.data.data = response.data.data || {};

          return response;
        });
    }

    function getResourceUrl(link) {
      var user = AdpSessionService.getUser();
      var ids = getIds(user);

      var getUrl = _
        .chain(link.split('/'))
        .map(function (val) {
          var urlPart;
          if (val in ids) {
            urlPart = [val, ids[val]].join('/');
          } else {
            urlPart = val;
          }

          return urlPart;
        })
        .filter(function (s) { return !!s; })
        .value();

      if (isNestedPage(link)) {
        getUrl.pop();
      }

      return [CONSTANTS.apiUrl, getUrl.join('/')].join('/');
    }

    function getDashboardData (dashboardName) {
      var getUrl = getDashboardUrl(dashboardName);

      return $http.get(getUrl);
    }

    function getDashboardUrl (dashboardName) {
      return CONSTANTS.apiUrl + '/dashboards/' + dashboardName + '/data';
    }

    function createRecord(link, data) {
      var apiUrl = getResourceUrl(link);

      return $http.post(apiUrl, { 'data': data });
    }

    function updateRecord(link, data, id) {
      var apiUrl = _.isUndefined(id) ? getResourceUrl(link) : [getResourceUrl(link), id].join('/');

      return $http.put(apiUrl, { 'data': data });
    }

    function deleteRecord(link, id) {
      var apiUrl = _.isUndefined(id) ? getResourceUrl(link) : [getResourceUrl(link), id].join('/');

      return $http.delete(apiUrl);
    }

    function createNestedRecord(link, data, fieldName) {
      var apiUrl = [getResourceUrl(link), data.parentId, fieldName].join('/');

      return $http.post(apiUrl, { 'data': data });
    }

    function updateNestedRecord(link, data, fieldName, id) {
      var apiUrl = [getResourceUrl(link), data.parentId, fieldName, id].join('/');

      return $http.put(apiUrl, { 'data': data });
    }

    function deleteNestedRecord(link, parentId, fieldName, childId) {
      var apiUrl = [getResourceUrl(link), parentId, fieldName, childId].join('/');

      return $http.delete(apiUrl);
    }

    function getNestedData(data, name) {
      var result = _.map(data, function (m) {
        return m[name];
      });

      return _.flatten(result);
    }

    function isNestedPage(link) {
      return !!(link.split('/').length > 3);
    }

    function getIds(user) {
      var ids = {};

      _.map(user, function (val, key) {
        if (key.slice('-2') === 'Id') {
          var idKey = key.slice(0, -2) + 's';
          ids[idKey] = val;
        }
      });

      return ids;
    }

  }
})();
