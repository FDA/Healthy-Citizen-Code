import _map from 'lodash.map';
import _Highcharts from '../../../lib/highcharts';

import $ from '../../../lib/dom';
import tpl from './graph-view-widget.hbs';

import getChartOptions from './charoptions';
import {adverseEventsQuery, prefrencesQuery} from '../../queries';
import {widgetError} from "../../../lib/utils";

const prepareData = data => {
  let results = {};

  // count reaction occurencies for eacg medication
  data.forEach(events => {
    const resultForMedication = {};
    results[events.display] = resultForMedication;

    events.list.forEach(event => {
      event.patient.reaction.forEach(reaction => {
        resultForMedication[reaction.reactionmeddrapt] = resultForMedication[reaction.reactionmeddrapt] || 0;
        resultForMedication[reaction.reactionmeddrapt]++;
      });
    });
  }, {});

  // sort and remap as chart data
  Object.keys(results).forEach(medName => {
    const current = _map(results[medName], (count, reaction) => [reaction, count]);
    current.sort((a, b) => b[1] - a[1]);

    results[medName] = current.splice(0,10).map(reaction => {
      return {name: reaction[0], y: reaction[1]};
    });
  });

  return results;
};

export default class NdcLookup {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    this.$loader = $('<div class="loader-wrap"><div class="loader"></div></div>');
    this.$el.append(this.$loader);

    this.fetchData()
      .catch(err => {
        console.error(err);
        widgetError(err.message);
      });
  }

  fetchData() {
    return prefrencesQuery({udid: this.options.udid})
      .then(data => {
        if ('medications' in data) {
          return adverseEventsQuery(data);
        } else {
          throw new Error('Unable to get adverse events. Medication list is empty.');
        }
      })
      .then(data => this.init(data));
  }

  init(data) {
    this.results = prepareData(data);

    // TODO add check for empty
    if (Object.keys(this.results).length) {
      this.build();
      this.bindEvents();
      this.initialRender();
    } else {
      throw new Error('Unable to get adverse events.');
    }
  }

  build() {
    this.widgetBody = $(tpl({results: this.results})).get(0);
    this.$loader.remove();
    this.$el.append(this.widgetBody);
  }

  bindEvents() {
    this.widgetBody.addEventListener('click', (e) => this.onClick(e));
  }

  initialRender() {
    const chartEl = this.widgetBody.querySelector('.js-charts-container');
    const medicationName = Object.keys(this.results)[0];
    const options = getChartOptions(this.results[medicationName], medicationName);

    const firstMenuLink = this.widgetBody.querySelector('.js-link');
    firstMenuLink.classList.add('is-active');

    this.chartInstance = new _Highcharts.Chart(chartEl, options);
  }

  onClick(e) {
    e.preventDefault();
    if (!e.target.classList.contains('js-link')) {
      return;
    }

    const active = this.widgetBody.querySelector('.js-link.is-active');
    const medicationName = e.target.dataset.name;
    const data = this.results[medicationName];
    const options = getChartOptions(data, medicationName);

    active.classList.toggle('is-active');
    e.target.classList.toggle('is-active');

    this.chartInstance.update(options);
    if (this.chartInstance.hasData()) {
      this.chartInstance.hideNoData();
    } else {
      this.chartInstance.showNoData();
    }
  }
}
