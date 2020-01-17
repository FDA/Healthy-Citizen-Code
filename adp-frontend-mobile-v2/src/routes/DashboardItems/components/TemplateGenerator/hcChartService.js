import _ from 'lodash';
import Config from '../../../../config/index';
import {parseJSON, checkStatus} from '../../../../helpers/fetch';
import logger from '../../../../services/logger';

// import Highcharts options to get colors
const Highcharts = require('./highcharts-options-6.0.1');
Highcharts.getOptions();

const dataSetters = {
  'pie': function (data, options) {
    options.series[0].data = data;

    return options;
  },
  'solidgauge': function (data, options) {
    options.series = options.series.map(function (item, index) {
      const dataItem = item;

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

const setData = (model) => {
  const promise = model.data.type === 'url' ? _request(model.data) : Promise.resolve(model.data);

  return promise
    .then(response => {
      const data = response.data ? response.data : response;
      return _setData(model, data);
    })
    .catch(err => {
      logger.error(`Error while getting ${JSON.stringify(model.data)}` + err);
      return void(0);
    });
};

// real data setter
const _setData = (model, data) => {
  const chartType = getChartType(model.specification);
  return dataSetters[chartType](data, model.specification);
};

const _request = (params) => {
  const url = Config.api.host + params.link;
  let method = params.method.toUpperCase();
  return fetch(url, {method})
    .then(checkStatus)
    .then(parseJSON);
};

const getChartType = (options) => {
  if (options.chart.type === 'solidgauge' || options.chart.type === 'pie') {
    return options.chart.type;
  }
  return 'default';
};

const evalOptions = (options, dataset, chartIndex) => {
  _.forEach(options, function (option, key) {
    const isObject = _.isObject(option);
    try {
      if (isObject && option.type === 'function') {
        options[key] = new Function(option['arguments'].join(','), option.code);
      }

      if (isObject && option.type === 'code') {
        // inject own 'Highcharts' object to pull constants from it.
        const generatedFunc = new Function(
          ['Highcharts', 'chartIndex', 'dataset'],
          'return ' + option.code
        );
        options[key] = generatedFunc(Highcharts, chartIndex, dataset);
      }
    } catch (e) {
      console.log(`Error during evalOptions in 'code' field: ${option.code}. ${e}`);
      return;
    }

    if (isObject || _.isArray(option)) {
      evalOptions(option, dataset, chartIndex);
    }
  });

  return options;
};

const getSpecification = (interfaceCharts, testDashboardChart) => {
  const chartId = _.get(testDashboardChart, "parameters.chartId");
  const chartInterface = interfaceCharts[chartId];
  if (!chartInterface) {
    return void(0);
  }

  if (chartInterface.data) {
    return setData(chartInterface)
      .then((options) => {
        return evalOptions(options);
      })
      .catch(err => {
        logger.error(err);
        return void(0);
      });
  } else {
    return Promise.resolve(evalOptions(chartInterface.specification));
  }
};

module.exports = {
  getSpecification
};
