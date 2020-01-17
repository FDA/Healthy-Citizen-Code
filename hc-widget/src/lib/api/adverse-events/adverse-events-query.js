import { createGraphqlClient } from '../graphql/grapql-client';

// { medications, age, gender, geogrpahicRegion, algorithm }
export function adverseEventsQuery(params) {
  const client = createGraphqlClient();
  const collectionName = getCollectionName(params.algorithm);
  const query = getBatchQuery(params, collectionName);

  return client.request(query)
    .then((data) => handleResponse(data, params.medications))
}

function getBatchQuery(params, collectionName) {
  const parts = params.medications
    .map(({ rxcui }) => getQueryForEvent(rxcui, params, collectionName))
    .join('');

  return `query {
    ${parts}
  }`
}

function getQueryForEvent(rxcui, params, collectionName) {
  return `q${rxcui}:${collectionName} (
      filter: { mongoQuery: "${mongoQuery(rxcui, params)}" },
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


function getCollectionName(name = 'openfda') {
  const collections = {
    openfda: 'aesOpenfdaDrugs',
    conceptant: 'aesFaers',
  };


  return collections[name];
}

function mongoQuery(rxcui, { age, gender }) {
  let ageRange = getAge(age);
  let formattedGender = getGender(gender);

  const q = {
    $and: [
      { patientOnSetAge: { $gt: ageRange.begin} },
      { patientOnSetAge: { $lt: ageRange.end} },
      { patientOnSetAgeUnit: '801' },
      { patientSex: formattedGender },
      { drugs:
        {
          $elemMatch: {
            'openfda.rxCuis.rxCui': rxcui,
            drugCharacterization: { $in:['1','3'] },
          },
        },
      }
    ]
  };

  return JSON.stringify(q).replace(/"/g, '\\"');
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

  return sexes[gender] || '0';
}

function handleResponse(data, medications) {
  return medications.map(({ rxcui, display, brandName }) => {
    const itemKey = `q${rxcui}`;

    return {
      display: (display || brandName),
      list: data[itemKey].items,
      itemCount: data[itemKey].pageInfo.itemCount,
    };
  })
}
