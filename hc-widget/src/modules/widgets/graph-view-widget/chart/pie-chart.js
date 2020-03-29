import Chart from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import 'chartjs-plugin-colorschemes/src/plugins/plugin.colorschemes';

import { noDataPlugin } from './no-data-chart-plugin';
import getChartOptions from './charoptions';

Chart.plugins.unregister(ChartDataLabels);

export class PieChart {
  constructor(el, reactionForMedication, medicationName) {
    this.element = el;

    const options = getChartOptions(this.getTitle(medicationName));

    this.chart = new Chart(el, {
      type: 'pie',
      data: this.getData(reactionForMedication),
      options,
      plugins: [ChartDataLabels, noDataPlugin]
    });
  }

  getData(reactionForMedication) {
    return {
      datasets: [{
        data: reactionForMedication.map(r => r.reactionsCount),
      }],
      labels: reactionForMedication.map(r => r.name)
    }
  }

  getTitle(medicationName) {
    return `${medicationName} adverse effects (as % of total)`
  }

  update(reactionForMedication, medicationName) {
    this.chart.options.title.text = this.getTitle(medicationName);
    this.chart.data = this.getData(reactionForMedication);
    this.chart.update();
  }
}
