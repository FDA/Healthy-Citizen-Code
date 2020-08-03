import _map from 'lodash.map';
import { PieChart } from './chart/pie-chart';

import $ from '../../../lib/utils/dom';
import tpl from './graph-view-widget.hbs';

import { fetchAdverseEventsForMedications } from '../../../lib/api/adverse-events/adverse-events-for-medications';
import { showErrorToUser, updateIframeHeight } from '../../../lib/utils/utils'
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
      return {name: reaction[0], reactionsCount: reaction[1]};
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
        showErrorToUser(node, ResponseError.ADVERSE_EVENTS_EMPTY);
      });
  }

  fetchData() {
    return fetchAdverseEventsForMedications(this.options)
      .then(data => this.init(data));
  }

  init(data) {
    this.reactions = prepareData(data);

    if (Object.keys(this.reactions).length) {
      this.build();
      this.bindEvents();
      this.initialRender();
    } else {
      throw new ResponseError(ResponseError.ADVERSE_EVENTS_EMPTY);
    }
  }

  build() {
    this.widgetBody = $(tpl({results: this.reactions})).get(0);
    this.$loader.remove();
    this.$el.append(this.widgetBody);
    updateIframeHeight();
  }

  bindEvents() {
    this.widgetBody.addEventListener('click', (e) => this.onClick(e));
  }

  initialRender() {
    const firstMenuLink = this.widgetBody.querySelector('.js-link');
    firstMenuLink.classList.add('is-active');

    const chartEl = this.widgetBody.querySelector('.js-charts-container canvas');
    const medicationName = Object.keys(this.reactions)[0];
    const reactionForMedication = this.reactions[medicationName];

    this.chart = new PieChart(chartEl, reactionForMedication, medicationName);
  }

  onClick(e) {
    e.preventDefault();
    if (!e.target.classList.contains('js-link')) {
      return;
    }

    const active = this.widgetBody.querySelector('.js-link.is-active');

    active.classList.toggle('is-active');
    e.target.classList.toggle('is-active');

    const medicationName = e.target.dataset.name;
    const reactionForMedication = this.reactions[medicationName];

    this.chart.update(reactionForMedication, medicationName);
  }
}
