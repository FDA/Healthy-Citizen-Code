/**
 * @typedef {Object} Medication
 * @property {String} brandName
 * @property {String[]} rxcui
 * @property {String[]} ndc
 */

/**
 * Object describing reactions as pair Name - Count
 * @typedef {Object<String, Number>} Reactions
 */

/**
 * Details https://open.fda.gov/apis/
 * @typedef {Object} AdverseEvent
 */

/**
 * @param {AdverseEvent[]} adverseEvents events list
 * @returns {Object<String, Reactions>}} object containing reactions as value and brandName as key
 */
export function getReactionsCount(adverseEvents) {
  const reactions = {};

  adverseEvents.forEach(event => {
    const { brandName } = event;
    reactions[brandName] = _countReactionForEvent(event);
  });

  return reactions;
}

/**
 * @param {AdverseEvent} event
 * @returns {Reactions}
 */
export function _countReactionForEvent(event) {
  const { list } = event;
  const reactionsCount = {};

  list.forEach(reactions => {
    reactions.forEach(({ reactionMedDraPT }) => {
      reactionsCount[reactionMedDraPT] = reactionsCount[reactionMedDraPT] || 0;
      reactionsCount[reactionMedDraPT]++;
    });
  });

  return reactionsCount;
}
