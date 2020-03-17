import { createGraphqlClient } from '../graphql/grapql-client';
import { ResponseError } from '../../exceptions';

/**
 * @typedef Medication
 * @property rxcui: String[]
 * @property brandName: String
 */

/** @typedef AdverseEventsListing
 * @property display: String - medication name
 * @property list: AdverseEvent[]
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
 *
 * @returns Promise{<AdverseEventsListing[]>}
 */
export function adverseEventsQuery(userPreferences, algorithm ='openfda') {
  const client = createGraphqlClient();
  const query = getBatchQuery(userPreferences, algorithm);

  return client.request(query)
    .then((data) => mapToAdverseEventsListing(data, userPreferences.medications))
    .catch(err => {
      if (err.response.data) {
        return mapToAdverseEventsListing(err.response.data, userPreferences.medications);
      } else {
        throw new ResponseError(ResponseError.ADVERSE_EVENTS_EMPTY);
      }
    });
}

function getBatchQuery(userPreferences, algorithm) {
  const mongoQueryBuilder = getMongoQueryBuilder(userPreferences);

  const parts = userPreferences.medications
    .map(({ rxcui }) => {
      const mongoQuery = mongoQueryBuilder(rxcui[0]);
      return getQueryForEvent(rxcui[0], algorithm, mongoQuery);
    })
    .join('');

  return `query {
    ${parts}
  }`
}

function getQueryForEvent(rxcui, algorithm, mongoQuery) {
  const collectionName = getCollectionName(algorithm);

  return `q${rxcui}:${collectionName} (
      filter: { mongoQuery: "${mongoQuery}" },
      perPage: 2000
    ) {
      pageInfo {
        itemCount
      }
      items {
        safetyReportId
        serious
        receiptDate
        patientOnSetAge
        patientOnSetAgeUnit
        patientSex
        drugs {
          openfda {
            rxCuis {
              rxCui
            }
          }
          drugCharacterization
          medicinalProduct
        }
        reactions {
          reactionMedDraPT
        }
      }
    }`;
}


function getCollectionName(algorithm) {
  const collections = {
    openfda: 'aesOpenfdaDrugs',
    conceptant: 'aesFaers',
  };

  return collections[algorithm];
}

function getMongoQueryBuilder({ age, gender }) {
  let ageRange = getAge(age);
  let formattedGender = getGender(gender);

  return function (rxcui) {
    const q = {
      $and: [
        { patientOnSetAge: { $gt: ageRange.begin } },
        { patientOnSetAge: { $lt: ageRange.end } },
        { patientOnSetAgeUnit: '801' },
        { drugs:
            {
              $elemMatch: {
                'openfda.rxCuis.rxCui': rxcui,
                drugCharacterization: { $in:['1','3'] },
              },
            },
        }
      ]
    }

    if (formattedGender) {
      q.patientSex = formattedGender;
    }

    return JSON.stringify(q).replace(/"/g, '\\"');
  };
}

function getAge(age) {
  if (!age) {
    return {begin: 0, end: 200}
  }
  let ageParam = age.split('-');

  // 200 - is magical here, because we need some really high value for right age range boundary
  // 200 is seems ok, because nobody lived that much yet
  return {begin: Number(ageParam[0]), end: Number(ageParam[1]) || 200 }
}

function getGender(gender) {
  // mapping pagweb values to opendfda
  // check API reference for patientsex for more details https://open.fda.gov/drug/event/reference/
  const sexes = {
    'M': '1',
    'F': '2'
  };

  return sexes[gender];
}

function mapToAdverseEventsListing(data, medications) {
  return medications
    .filter(({ rxcui }) => {
      const itemKey = `q${rxcui}`;
      return !!data[itemKey];
    })
    .map(({ rxcui, display, brandName }) => {
      const itemKey = `q${rxcui}`;

      return {
        display: (display || brandName),
        list: data[itemKey].items,
        itemCount: data[itemKey].pageInfo.itemCount,
      };
    });
}
