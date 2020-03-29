export const noDataPlugin = {
  afterDraw: function(chart) {
    if (chart.data.datasets[0].data.length) {
      return;
    }

    let ctx = chart.chart.ctx;
    let width = chart.chart.width;
    let height = chart.chart.height;

    chart.clear();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data to display', width / 2, height / 2);
    ctx.restore();
  }
};
