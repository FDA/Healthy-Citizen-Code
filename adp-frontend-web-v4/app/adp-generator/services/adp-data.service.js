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

    function getData(params) {
      var endpoint = getResourceUrl(params.link);

      return $http.get(endpoint)
        .then(function (response) {
          return response.data.data || {};
        })
        .then(function (data) {
          return appDb.schema.set(params.fieldName, data)
            .then(function () {
              return data;
            });
        })
        .catch(function (err) {
          if (err.status === -1) {
            console.warn('Data for fetch ' + params.fieldName + ' failed. Falling back to cache', err);
            return appDb.schema.get(params.fieldName);

            return;
          }
        });
    }

    function getSingleRecordData(params) {
      var getUrl = getResourceUrl(params.link);

      return $http.get(getUrl)
        .then(function (response) {
          var data = _.isArray(response.data.data) ? response.data.data[0] : response.data.data;
          return data || {};
        })
        .then(function (data) {
          return appDb.schema.set(params.fieldName, data)
            .then(function () {
              return data;
            });
        })
        .catch(function (err) {
          console.warn('Data for fetch ' + params.fieldName + ' failed. Falling back to cache', err);
          return appDb.schema.get(params.fieldName)
        });
    }

    function getResourceUrl(link) {
      // var user = lsService.getUser();
      // var ids = getIds(user);
      //
      // var getUrl = _
      //   .chain(link.split('/'))
      //   .map(function (val) {
      //     var urlPart;
      //     if (val in ids) {
      //       urlPart = [val, ids[val]].join('/');
      //     } else {
      //       urlPart = val;
      //     }
      //
      //     return urlPart;
      //   })
      //   .filter(function (s) { return !!s; })
      //   .value();
      //
      // if (isNestedPage(link)) {
      //   getUrl.pop();
      // }

      return APP_CONFIG.apiUrl + link;
    }

    function getDashboardData (dashboardName) {
      var getUrl = getDashboardUrl(dashboardName);

      return $http.get(getUrl)
        .then(function (res) {
          return res.data.data;
        });
    }

    function getDashboardUrl (dashboardName) {
      return APP_CONFIG.apiUrl + '/dashboards/' + dashboardName + '/data';
    }

    function createRecord(link, data) {
      var apiUrl = getResourceUrl(link);

      return $http.post(apiUrl, { 'data': data });
    }

    function updateRecord(link, data) {
      var id = data._id;
      var apiUrl =  getResourceUrl(link);

      if (!_.isUndefined(id)) {
        apiUrl = apiUrl + '/' + id;
      }

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
