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
        var categories = _.map(data, function (item) {
          return item.questionnaire.questionnaireName;
        });

        var stats = _.reduce(data, function (result, item) {
          _.each(item.stats, function (stat, key) {
            result[key] = result[key] || [];
            result[key].push(stat);
          });
          return result;
        }, {});

        options.xAxis = { categories: categories };
        options.series = _.map(stats, function (stats, key) {
          return {
            name: key,
            data: stats
          }
        });

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
