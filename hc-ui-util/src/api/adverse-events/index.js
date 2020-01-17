import { GraphQLClient } from 'graphql-request';
import { getReactionsCount } from './reactions-helpers';
import { adverseEventQuery, formatAdverseEventResponse } from './adverse-events-helpers';

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

export default {
  /**
   * TODO: add version for AE request by single medication
   * @param params Object{
   *    age?: String, gender?: String,
   *    list: Medication[]
   *  }
   *
   *  params.age - age of the patient of Adverse Even in year, when the event first occurred.
   *  string with "-" delimiter, example: "0-10", "10-25"
   *
   *  gender: patient's gender. Possible values: "M" | "F" | None
   *
   * @returns {Promise<
   *  {
   *    brandName: String,
   *    total: Number,
   *    list: AdverseEvent[]
   * }[] | never
   *  >}
   */
  getAdverseEvents(params) {
    const options = {
      headers: { 'Content-Type': 'application/json' },
    };

    const endpoint = `${this.CONFIG.HA_DEV_URL}/graphql`;
    const client = new GraphQLClient(endpoint, options);
    const query = adverseEventQuery(params);

    return client
      .request(query)
      .then(resp => formatAdverseEventResponse(resp, params.medications))
      .then(events => {
        if (!events.length) {
          throw { message: "Provided medications doesn't have adverse events reported.", type: 'DataRequestError' };
        }

        return events;
      });
  },

  /**
   * Count Adverse Event Effects for medications list.
   * @param {Medication[]} medications
   *
   * @returns {Promise<{brandName: Reactions}>}
   */
  getReactions(medications, gender) {
    return this.getAdverseEvents({ medications, gender }).then(events => getReactionsCount(events));
  },
};
