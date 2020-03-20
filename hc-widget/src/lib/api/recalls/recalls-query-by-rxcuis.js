import { createRecallQuery } from './query'
import { createGraphqlClient } from '../graphql/grapql-client'
import { fetchMedicationNames } from '../medications/medication-names'
import { ResponseError } from '../../exceptions'

/**
 * Medication without names
 * @type Medication
 * @property rxcui: String[]
 */

/** @typedef RecallsListing
 * @property display: String - medication name
 * @property list: Recall[]
 * @property itemCount: Number
 */

/**
 * Fetch recalls by rxcui codes list only.
 *
 * Implements algorithm that accepts as input userPreferences object, which contains medication
 * with rxcui code only.

 * Algorithm steps:
 * - Recalls are fetched as batch
 * - Group recalls by rxcui
 * - fetch Medication Name forEach rxcui in group
 * - remap GroupedRecalls to associated recalls list
 * - remap Groups to RecallListing[]
 *
 * @param {Object} userPreferences
 * @params {Medication[]} userPreferences.medications
 * @param {'openfda'|'conceptant'} algorithm
 * @param {Function} mongoQueryFn
 *
 * @returns Promise{<RecallListing]>}
 */
export function recallsQueryByRxcuis(userPreferences, algorithm= 'openfda', mongoQueryFn) {
  const rxcuis = userPreferences.medications.map(m => m.rxcui).flat();

  return fetchRecalls(rxcuis, algorithm, mongoQueryFn(rxcuis))
    .then(groupRecallByRxcui)
    .then(mapRecallsToNames)
    .then(createListing);
}

function fetchRecalls(rxcuis, algorithm, mongoQuery) {
  const collectionName = getCollectionName(algorithm);
  const query = createRecallQuery(collectionName);
  const variables = { mongoQuery: JSON.stringify(mongoQuery) };

  const client = createGraphqlClient();
  return client.request(query, variables)
    .then(res => res[collectionName])
    .then(data => {
      if (data.pageInfo.itemCount === 0) {
        throw new ResponseError(ResponseError.RESPONSE_EMPTY);
      }

      return data;
    })
}

function groupRecallByRxcui(recalls) {
  const groupedRecalls = {};

  recalls.items.forEach((recall) => {
    if (!recall.rxCuis) {
      return;
    }

    recall.rxCuis.forEach(({ rxCui }) => {
      const rxcuiRecalls = groupedRecalls[rxCui] || [];
      rxcuiRecalls.push(recall);
      groupedRecalls[rxCui] = rxcuiRecalls;
    });
  });

  return groupedRecalls;
}

function mapRecallsToNames(groupedRecalls) {
  const rxcuis = Object.keys(groupedRecalls);

  return fetchMedicationNames(rxcuis)
    .then((names) => {
      const result = {};
      for (const [rxcui, name] of Object.entries(names)) {
        result[name] = groupedRecalls[rxcui];
      }

      return result;
    });
}

function createListing(recallsGroupedByName) {
  return Object.keys(recallsGroupedByName).map((name) => ({
    list: recallsGroupedByName[name],
    itemCount: recallsGroupedByName[name].length,
    display: name,
  }));
}

function getCollectionName(algorithm = 'openfda') {
  const collections = {
    openfda: 'recallsOpenfdaDrugs',
    conceptant: 'recallsRes',
  };

  return collections[algorithm];
}
