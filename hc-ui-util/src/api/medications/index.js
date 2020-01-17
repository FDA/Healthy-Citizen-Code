const RXNAV_REST_ENDPOINT = 'https://rxnav.nlm.nih.gov/REST';

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

const _handleResponse = function(res) {
  if (res.status !== 200) {
    throw 'Invalid response';
  }
  return res.json();
};

export default {
  /**
   * Get list of RxClasses by medications list
   * @param {Medication[]} medications
   * @returns {Promise<RxClass[]>}
   */
  getRxClasses(medications) {
    const _getRxClass = function(medication) {
      const { rxcui } = medication;
      const endpoint = `${RXNAV_REST_ENDPOINT}/rxclass/class/byRxcui.json?rxcui=${rxcui}`;

      return fetch(endpoint).then(_handleResponse);
    };

    return Promise.all(medications.map(_getRxClass));
  },

  /**
   * Get list if DrugInteractions by medications list
   * @param {Medication[]} medications
   * @returns {Promise<DrugInteraction[]>}
   */
  findDrugsInteractions(medications) {
    const rxcuis = medications.map(m => m.rxcui).join('+');

    return fetch(`${RXNAV_REST_ENDPOINT}/interaction/list.json?rxcuis=${rxcuis}`).then(_handleResponse);
  },

  /**
   * Short hand method for retriving rxClasses and Interaction Data in parallel.
   * Also return medications from arguments.
   *
   * @param {Medication[]} medications
   * @returns {Promise<{medications: Medication[], rxClasses: Object, interactionsData: Object}[] | never>}
   */
  getRxClassesAndInteractionData(medications) {
    return Promise.all([this.getRxClasses(medications), this.findDrugsInteractions(medications)]).then(
      ([rxClasses, interactionsData]) => {
        return { medications, rxClasses, interactionsData };
      }
    );
  },

  /**
   * Resolve ndc code to list of rxcui codes
   *
   * @param {String} ndc
   * @returns {Promise<String[] | never>}
   */
  getRxcuiByNdc(ndc) {
    return fetch(`${RXNAV_REST_ENDPOINT}/rxcui.json?idtype=NDC&id=${ndc}`)
      .then(_handleResponse)
      .then(json => {
        const { idGroup } = json;
        if (!(idGroup && idGroup.rxnormId)) {
          throw { message: 'Medication not found', type: 'DataRequestError' };
        }

        return idGroup.rxnormId;
      });
  },
};
