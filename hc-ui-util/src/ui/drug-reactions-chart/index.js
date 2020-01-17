import chartOptions from './chart-options';

/**
 * @typedef {Object} Medication
 * @property {String} brandName
 * @property {String[]} rxcui
 * @property {String[]} ndc
 */

/**
 * Object describing reactions as pair Name - Count
 * @typedef {Object<String, Number>[]} Reactions
 */

/**
 * @param {Reactions} reactions
 * @param {Number} end - amount of reaction to return
 * @returns {Object<{name: String, y: Number}>[]} - return sorted in decreased order first n number of reactions
 */
function _getMostFrequentReactions(reactions, end = 10) {
  const reactionsArray = Object.keys(reactions).map(name => {
    return { name, y: reactions[name] };
  });

  reactionsArray.sort((a, b) => {
    return b.y - a.y;
  });

  return reactionsArray.slice(0, end);
}

/**
 *
 * @param {HTMLElement} element
 * @param {Object} data
 * @param {Medication} data.medication
 * @param {Reactions} data.reactions
 *
 * @returns {Highcharts.Chart}
 */
export function drugReactionsChart(element, data) {
  const { medication, reactions } = data;
  const chartData = _getMostFrequentReactions(reactions[medication.brandName]);

  const options = chartOptions({ medication, chartData });
  // eslint-disable-next-line new-cap
  return new Highcharts.chart(element, options);
}
