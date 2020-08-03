;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpListsService', AdpListsService);

  function AdpListsService(
    ErrorHelpers,
    APP_CONFIG,
    AdpPath,
    $http,
    $cacheFactory
  ) {
    function getDataSource(args) {
      var listValue = args.fieldSchema.list;

      if (_.isPlainObject(listValue)) {
        return getListOfOptions(listValue);
      } else {
        return getDynamicListDataSource(args);
      }
    }

    function getDynamicListDataSource(args) {
      return new DevExpress.data.DataSource({
        load: function () {
          return requestDynamicList(args)
            .then(function (data) {
              return getListOfOptions(data);
            })
            .catch(function (error) {
              ErrorHelpers.handleError(error, 'Error trying to get list value from remote.');
            });
        },
        byKey: function (key) {
          return { key: key, value: key };
        }
      });
    }

    function requestDynamicList(args) {
      return requestList(endpointWithParams(args));
    }

    function requestFullDynamicList(schemaPath, action) {
      return requestList(endpoint(schemaPath, action));
    }

    function requestList(endpoint) {
      return $http.get(endpoint)
        .then(function (res) {
          return _.get(res, 'data.data', {});
        });
    }

    function endpointWithParams(args) {
      var schemaPath = AdpPath.schemaPath([args.modelSchema.schemaName, args.path]);
      var action = args.action;

      return [endpoint(schemaPath, action), evalListParams(args)].join('&');
    }

    function endpoint(schemaPath, action) {
      var queryParams = { listFieldPath: schemaPath, action: action };
      return [APP_CONFIG.apiUrl, 'getList'].join('/') + '?' + objToQueryString(queryParams);
    }

    function objToQueryString(obj) {
      return _.entries(obj)
        .map(function (entry) {
          return entry.join('=');
        })
        .join('&');
    }

    function evalListParams(args) {
      var paramsString = _.get(args, 'fieldSchema.dynamicList.params', null);
      if (paramsString) {
        try {
          return 'listParams'.concat('=', encodeURIComponent(_.template(paramsString).call(args)));
        } catch (e) {
          console.error('Error while try evaluate .ejs template params for list with args: ', args, e);
        }
      }
    }

    function requestListsForSchemaAndCache(schema, action) {
      var paths = findPathsForLists(schema.fields);

      var requestForPathAndCache = function (path) {
        var schemaPath = AdpPath.schemaPath([schema.schemaName, path]);

        return requestFullDynamicList(schemaPath, action)
          .then(_.partial(putListToCache, schema.schemaName, path));
      };

      return Promise.all(paths.map(requestForPathAndCache));
    }

    function findPathsForLists(fields) {
      var result = [];

      function findHelper(obj, prefix) {
        _.forEach(obj, function (value, key) {
          var currentPath = (prefix || '') + key;
          if (value.fields) {
            findHelper(value.fields, currentPath + '.')
          } else if (_.startsWith(value.type, 'List')) {
            result.push(currentPath);
          }
        })
      }

      findHelper(fields);

      return result;
    }

    function putListToCache(schemaName, listPath, list) {
      var cacheStore = $cacheFactory.get(schemaName) || $cacheFactory(schemaName);
      cacheStore.put(listPath, list);
    }

    function getListFromCache(schemaName, listPath) {
      var cacheStore = $cacheFactory.get(schemaName) || $cacheFactory(schemaName);
      return cacheStore.get(listPath);
    }

    function dropCache(schemaName) {
      var cacheStore = $cacheFactory.get(schemaName);
      cacheStore && cacheStore.removeAll();
    }

    function getListOfOptions(list) {
      return _.map(list, function (value, key) {
        return { value: key, label: value };
      });
    }

    function getListValueByLabel(values, list) {
      var valuesToSearch = _.isArray(values) ? values : [values];

      var foundLabels = _.map(valuesToSearch, function (value) {
        return _.findKey(list, function (item) {
          return item === value;
        })
      });

      return _.compact(foundLabels);
    }

    return {
      getDataSource: getDataSource,
      requestDynamicList: requestDynamicList,
      requestFullDynamicList: requestFullDynamicList,
      getListValueByLabel: getListValueByLabel,
      requestListsForSchemaAndCache: requestListsForSchemaAndCache,
      getListFromCache: getListFromCache,
      dropCache: dropCache,
    };
  }
})();
