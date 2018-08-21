const rp = require('request-promise');

const baseURI = 'https://rxnav.nlm.nih.gov/REST/interaction';

/**
 * Example: https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=88014&sources=ONCHigh
 * @param rxcui id
 * @param sources
 */
const findDrugInteractions = (rxcui, sources) => rp(`${baseURI}/interaction.json?rxcui=${rxcui}&sources=${sources || ''}`)
  .then(res => JSON.parse(res));
// Usage:
// findDrugInteractions(88014)
//   .then(res => {
//     console.log(JSON.stringify(JSON.parse(res), null, 2));
//   });

/**
 * Example: https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=207106+152923+656659
 * @param rxcuis array of ids
 */
const findInteractionsFromList = rxcuis => rp(`${baseURI}/list.json?rxcuis=${rxcuis.join('+')}`)
  .then(res => JSON.parse(res));
// Usage:
// findInteractionsFromList([207106, 152923, 656659])
//   .then(res => {
//     console.log(JSON.stringify(JSON.parse(res), null, 2));
//   });

module.exports = {
  findDrugInteractions,
  findInteractionsFromList,
};
