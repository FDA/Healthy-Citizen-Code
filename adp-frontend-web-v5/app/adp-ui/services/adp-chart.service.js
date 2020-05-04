;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .factory('AdpChartService', AdpChartService);

  /** @ngInject */
  function AdpChartService (
    APP_CONFIG,
    $q,
    $http
  ){
    function fetchData(data) {
      return data.type === 'url' ?
        _request(data) :
        $q.when(data);
    }

    function _request(params) {
      var req = {
        method: params.method.toUpperCase(),
        url: APP_CONFIG.apiUrl + params.link
      };

      return $http(req)
        .then(function (res) {
          return res.data.data;
        });
    }

    function evalOptions(options, dataset, chartIndex) {
      _.each(options, function (option, key) {
        var isObject = _.isObject(option);

        if (isObject && option.type === 'function') {
          var args = option.arguments || [];
          options[key] = new Function(args.join(','), option.code);
        }

        if (isObject && option.type === 'code') {
          options[key] = new Function(
            ['chartIndex', 'dataset'],
            'return ' + option.code
          )(chartIndex, dataset);
        }

        if (isObject || _.isArray(option)) {
          evalOptions(option, dataset, chartIndex);
        }
      });

      return options;
    }

    return {
      fetchData: fetchData,
      evalOptions: evalOptions,
    };
  }
})();
