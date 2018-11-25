import Iframe from '../../iframe';

export default function getChartOptions(reactions, medicationName) {
  return {
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false,
      type: 'pie',
      backgroundColor: 'rgba(255, 255, 255, 0)',
      events: {
        redraw: function () {
          Iframe.updateIframeHeight();
        }
      }
    },
    title: {
      text: `${medicationName} adverse effects (as % of total)`
    },
    lang: {
      'noData': 'Unable to retrieve data'
    },
    legend: {
      align: 'right',
      verticalAlign: 'top',
      layout: 'vertical',
      x: 0,
      y: 100,
      itemMarginBottom: 10
    },
    credits: false,
    tooltip: {
      pointFormat: '<b>{point.name}<br>{point.percentage:.1f}%</b>'
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        showInLegend: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '{point.percentage:.1f} %',
          distance: -50,
          filter: {
            property: 'percentage',
            operator: '>',
            value: 4
          }
        }
      }
    },
    series: [{
      type: 'pie',
      name: 'Reaction',
      data: reactions
    }]
  }
};