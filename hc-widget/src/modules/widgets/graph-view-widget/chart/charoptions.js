import { Aspect6 } from 'chartjs-plugin-colorschemes/src/colorschemes/colorschemes.office'
import { updateIframeHeight } from '../../../../lib/utils/utils';

const countPercent = (value, data) => {
  let sum = data.reduce((a, b) => a + b, 0);
  return (value * 100 / sum).toFixed(2)+"%";
}

export default function getChartOptions(title) {
  return {
    animation: {
      // using as after Draw event
      onComplete: updateIframeHeight,
    },
    title: {
      display: true,
      text: title,
      position: 'top',
      fontSize: 20,
      fontColor: '#333'
    },
    responsive:true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
    },
    tooltips: {
      position: 'nearest',
      mode: 'point',
      intersect: false,
    },
    plugins: {
      datalabels: {
        formatter: (value, ctx) => {
          const data = ctx.chart.data.datasets[0].data;
          return countPercent(value, data);
        },
        color: '#fff',
      },
      colorschemes: {
        scheme: Aspect6
      }
    }
  }
};
