import { GraphQLClient } from 'graphql-request';
import { hcUrl } from '../../../config.json';

const options = {
  headers: { 'Content-Type': 'application/json' }
};

const requestFormatter = {
  age({age}) {
    if (age) {
      let ageParam = age.split('-');

      // 200 - is magical here, because we need some really high value for right age range boundary
      // 200 is seems ok, because nobody lived that much yet
      return {begin: Number(ageParam[0]), end: Number(ageParam[1]) || 200 }
    } else {
      return {begin: 0, end: 200 }
    }
  },

  gender({gender}) {
    // mapping pagweb values to opendfda
    // check API reference for patientsex for more details https://open.fda.gov/drug/event/reference/
    const sexes = {
      'M': '1',
      'F': '2'
    };

    return sexes[gender] || '0';
  }
};

const mongoQuery = ({age, gender, rxcui}) => {
  const q = {
    $and: [
      { "rawData.patient.patientonsetageInt": {"$gt": age.begin} },
      { "rawData.patient.patientonsetageInt": {"$lt": age.end} },
      { "rawData.patient.patientonsetageunit": "801" },
      { "rawData.patient.patientsex": gender },
      {
        "rawData.patient.drug": {
          "$elemMatch": {
            "openfda.rxcui": rxcui,
            "drugcharacterization": { "$in":["1","3"] }
          }
        }
      }
    ]
  };

  return JSON.stringify(q).replace(/"/g, '\\"');
};

const queryBody = (params) => {
  const {rxcui} = params;

  return `
    q${rxcui}:drugEvents(filter:
      {
        mongoQuery: "${mongoQuery(params)}"
      }) {
        pageInfo {
          pageCount
          itemCount
          hasNextPage
          hasPreviousPage
          perPage
          currentPage
        }
        items {
          _id
          id
          rawData
        }
      }
  `
};

const createQuery = requests => {
  const body = requests.map(r => queryBody(r)).join('\n');
  return `query { ${body} }`;
};

export function adverseEventsQuery(params) {
  const endpoint = `${hcUrl}/graphql`;
  const client = new GraphQLClient(endpoint, options);

  let age = requestFormatter.age(params);
  let gender = requestFormatter.gender(params);

  const requests = params.medications.map(medication => {
    const rxcui = medication.rxcui;
    const brandName = medication.brandName;

    return {age, gender, rxcui, brandName};
  });

  const query = createQuery(requests);

  return client.request(query)
    .then(resp => {
      return requests.map(({rxcui, brandName}) => {
        const r = resp['q' + rxcui];
        return {
          display: brandName,
          total: r.pageInfo.itemCount,
          list: r.items.map(i => i.rawData)
        }
      });
    });
}