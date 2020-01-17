import { linkDrugs } from './link-drugs';
import { renderDrugInteractions } from './render';

/**
 * @typedef {Object} Medication
 * @property {String} brandName
 * @property {String[]} rxcui
 * @property {String[]} ndc
 */

/**
 * Details https://rxnav.nlm.nih.gov/RxClassIntro.html
 * @typedef {Object} RxClass
 */

/**
 * Details https://rxnav.nlm.nih.gov/InteractionAPIs.html#
 * @typedef DrugInteraction
 *
 */

/**
 *
 * @param {SVGElement} svg
 * @param {Object} data
 * @param {Medication[]} data.medications
 * @param {RxClass[]} data.rxClasses
 * @param {DrugInteraction[]} data.interactionsData
 */
export function drugInteractionsVisualization(svg, data) {
  const nodesAndLinks = linkDrugs(data);
  renderDrugInteractions(svg, nodesAndLinks);
  // TODO: manage element destruction
}
