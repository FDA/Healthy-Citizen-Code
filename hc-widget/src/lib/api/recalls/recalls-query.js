import { createGraphqlClient } from '../graphql/grapql-client';
import { ResponseError } from '../../exceptions'
import { createRecallQuery } from './query';

/**
 * @typedef Medication
 * @property rxcui: String[]
 * @property brandName: String
 */

/** @typedef RecallsListing
 * @property display: String - medication name
 * @property list: Recall[]
 * @property itemCount: Number
 */

/**
 * Fetch recalls by rxcui codes list.
 * Implements algorithm that accepts as input userPreferences object, which contains medication list
 * with brandName and rxcui list. Recalls are fetched for each Medication returning RecallsListing.
 *
 * @param {Object} userPreferences
 * @params {Medication[]} userPreferences.medications
 * @param {'openfda'|'conceptant'} algorithm
 * @param {Function} mongoQueryFn
 *
 * @returns Promise{<RecallsListing[]>}
 */
export function recallsQuery(userPreferences, algorithm = 'openfda', mongoQueryFn) {
  const promises = userPreferences.medications.map(m => makeRecallRequest(m, algorithm, mongoQueryFn(m.rxcui)));

  return Promise.all(promises)
    .then((recallListings) => {
      const recalls = recallListings.filter(v => v !== null);
      if (!recalls.length) {
        throw new ResponseError(ResponseError.RECALLS_EMPTY);
      }
      return recalls;
    });
}

/**
 *
 * @param {Medication} medication
 * @param {String} algorithm
 * @param {Object} mongoQuery
 * @returns Promise{<RecallsListing[]>}
 */
function makeRecallRequest(medication, algorithm, mongoQuery) {
  const collectionName = getCollectionName(algorithm);
  const query = createRecallQuery(collectionName);
  const variables = { mongoQuery: JSON.stringify(mongoQuery) };

  const client = createGraphqlClient();
  return client.request(query, variables)
    .then((res) => {
      const { items, pageInfo } = res[collectionName];

      if (!items.length) {
        throw new ResponseError(ResponseError.RESPONSE_EMPTY);
      }

      return {
        display: medication.brandName,
        list: items,
        itemCount: pageInfo.itemCount,
      };
    })
    .catch(function handleError(err) {
      if (err instanceof ResponseError) {
        return null;
      }

      console.log(err);
      throw err;
    });
}

function getCollectionName(algorithm = 'openfda') {
  const collections = {
    openfda: 'recallsOpenfdaDrugs',
    conceptant: 'recallsRes',
  };

  return collections[algorithm];
}
