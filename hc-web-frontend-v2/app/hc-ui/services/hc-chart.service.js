;(function () {
  'use strict';

  angular
    .module('app.hcUi')
    .factory('HcChartService', HcChartService);

  /** @ngInject */
  function HcChartService (
    CONSTANTS,
    $q,
    $http
  ){
    var dataSetters = {
      'pie': function (data, options) {
        options.series[0].data = data;

        return options;
      },
      'solidgauge': function (data, options) {
        options.series = options.series.map(function (item, index) {
          var dataItem = item;

          dataItem.data[0]['y'] = data[index];
          return dataItem;
        });

        return options;
      },
      'default': function (data, options) {
        options.series = options.series.map(function (item, index) {
          return {
            name: item.name,
            data: data[index]
          };
        });

        return options;
      }
    };

    function setData(model) {
      var promise = model.data.type === 'url' ? _request(model.data) : $q.when(model.data);

      return promise
        .then(function (response) {
          var data = !!response.data ? response.data.data : response;
          return _setData(model, data);
        });
    }

    // real data setter
    function _setData(model, data) {
      var chartType = getChartType(model.specification);
      return dataSetters[chartType](data, model.specification);
    }

    function _request(params) {
      return $http({
        method: params.method.toUpperCase(),
        url: CONSTANTS.apiUrl + params.link
      });
    }

    function getChartType(options) {
      if (options.chart.type === 'solidgauge' || options.chart.type === 'pie') {
        return options.chart.type;
      }

      return 'default';
    }

    function evalOptions(options, dataset, chartIndex) {
      _.each(options, function (option, key) {
        var isObject = _.isObject(option);

        if (isObject && option.type === 'function') {
          options[key] = new Function(option['arguments'].join(','), option.code);
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
      setData: setData,
      evalOptions: evalOptions
    };
  }
})();
