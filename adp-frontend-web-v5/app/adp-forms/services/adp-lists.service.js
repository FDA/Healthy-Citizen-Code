;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpListsService', AdpListsService);

  function AdpListsService(
    ErrorHelpers,
    APP_CONFIG,
    AdpPath,
    $http
  ) {
    function getDataSource(args) {
      var listValue = args.modelSchema.list;

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
      return $http.get(evalEndpoint(args))
        .then(function (res) {
          return _.get(res, 'data.data', {});
        });
    }

    function evalEndpoint(args) {
      var listSchemaPath = AdpPath.schemaPath([args.appSchema.schemaName, args.path].join('.'));
      var endpoint = [APP_CONFIG.apiUrl, 'getList'].join('/') + '?listFieldPath=' + listSchemaPath;

      var paramsString = _.get(args, 'modelSchema.dynamicList.params', null);
      if (paramsString) {
        try {
          endpoint += '&listParams=' + encodeURIComponent(_.template(paramsString).call(args));
        } catch (e) {
          console.error('Error while try evaluate .ejs template params for list with args: ', args, e);
        }
      }

      return endpoint;
    }

    function getListOfOptions(list) {
      return _.map(list, function (value, key) {
        return { value: key, label: value };
      });
    }


    function getListValueByLabel(values, list) {
      var foundLabels = _.map(values, function (value) {
        return _.findKey(list, function (item) {
          return item === value;
        })
      });

      return _.compact(foundLabels);
    }


    return {
      getDataSource: getDataSource,
      requestDynamicList: requestDynamicList,
      getListValueByLabel: getListValueByLabel,
    };
  }
})();
