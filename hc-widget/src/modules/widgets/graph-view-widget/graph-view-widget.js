import _map from 'lodash.map';
import Highcharts from '../../../lib/utils/highcharts-wrapper';

import $ from '../../../lib/utils/dom';
import tpl from './graph-view-widget.hbs';

import getChartOptions from './charoptions';
import { fetchAdverseEventsForMedications } from '../../../lib/api/adverse-events/adverse-events-for-medications';
import { showErrorToUser } from "../../../lib/utils/utils";
import { ResponseError } from '../../../lib/exceptions';

const prepareData = data => {
  let results = {};

  // count reaction occurencies for each medication
  data.forEach(events => {
    const resultForMedication = {};
    results[events.display] = resultForMedication;

    events.list.forEach((event) => {
      event.reactions.forEach((reaction) => {
        resultForMedication[reaction.reactionMedDraPT] = resultForMedication[reaction.reactionMedDraPT] || 0;
        resultForMedication[reaction.reactionMedDraPT]++;
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

export default class GraphViewWidget {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    this.$loader = $('<div class="loader-wrap"><div class="loader"></div></div>');
    this.$el.append(this.$loader);

    this.fetchData()
      .catch((err) => {
        console.error(err);
        showErrorToUser(ResponseError.ADVERSE_EVENTS_EMPTY);
      });
  }

  fetchData() {
    return fetchAdverseEventsForMedications(this.options)
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
      throw new ResponseError(ResponseError.ADVERSE_EVENTS_EMPTY);
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

    this.chartInstance = new Highcharts.Chart(chartEl, options);
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
