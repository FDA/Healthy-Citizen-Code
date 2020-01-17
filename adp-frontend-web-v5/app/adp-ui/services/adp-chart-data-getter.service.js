;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .factory('AdpChartDataGetterService', AdpChartDataGetterService);

  /** @ngInject */
  function AdpChartDataGetterService (DATE_FORMAT) {
    var dataSetters = {
      'areaspline': function (data, options) {
        var categories = _.map(data[0].data, function (_i, key) {
          return moment(key).format(DATE_FORMAT);
        });


        var stats = _.map(data, function (item) {
          var data = _.clone(item);
          data.data = _.map(data.data, function (v) {
            return v;
          });
          return data;
        });

        options.xAxis = { categories: categories };
        options.series = stats;

        return options;
      },
      'bar': function (data, options) {
        options.xAxis = { categories: data.categories };
        options.series = data.series;

        return options;
      },
      'column': function (data, options) {
        options.series = data.series;
        return options;
      },
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

        options.series = data.series;

        return options;
      }
    };

    function setData(model, data) {
      var chartType = _getChartType(model.specification);
      return dataSetters[chartType](data, model.specification);
    }

    function _getChartType(options) {
      var types = ['solidgauge', 'pie', 'bar', 'areaspline'];
      if (types.indexOf(options.chart.type) > -1) {
        return options.chart.type;
      }

      return 'default';
    }

    return {
      setData: setData
    };
  }
})();
