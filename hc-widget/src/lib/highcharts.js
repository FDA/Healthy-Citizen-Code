import Nodata from 'highcharts/modules/no-data-to-display.src';

let Highcharts;

if (window.Highcharts) {
  Highcharts = window.Highcharts;
} else {
  Highcharts = require('highcharts');
}
Nodata(Highcharts);

export default Highcharts;