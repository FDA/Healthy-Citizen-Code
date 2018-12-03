import { GraphQLClient } from 'graphql-request';
import { widgetApiUrl } from '../../../config.json';

const options = {
  headers: { 'Content-Type': 'application/json' }
};

const query = ({udid = ''}) => {
  return `{
      userPreferences (filter: {mongoQuery: "{udid: '${udid}'}" }) {
        count
        items {
         _id
          udid
          gender
          age
          geographicRegion
          medications {
            _id
            ndc11
            brandName
            rxcui
          }
        }
        pageInfo {
          pageCount
          itemCount
          hasNextPage
          hasPreviousPage
        }
      }
    }`;
};

const mutate = ({udid = '', gender = '', age = '', geographicRegion = '', medications = []}) => {
  const medicationsList = medications.map(medication => {
      return `{
        _id: "${medication._id}",
        ndc11: "${medication.ndc11}",
        rxcui: "${medication.rxcui}",
        brandName: "${medication.brandName}",
      }`;
    })
  ;
  return `mutation {
      userPreferencesUpsertOne (
        filter: {
          udid: "${udid}"
        },
        record: {
          udid: "${udid}",
          gender: "${gender}",
          age: "${age}",
          geographicRegion: "${geographicRegion}",
          medications: [${medicationsList.join(',')}]
      }) {
        _id
        udid
        gender
        age
        geographicRegion
        medications {
          _id
          ndc11
          brandName
          rxcui
        }
      }
    }`;
};

export function prefrencesQuery(params) {
  const endpoint = `${widgetApiUrl}/graphql`;
  const client = new GraphQLClient(endpoint, options);

  return client.request(query(params))
    .then(resp => {
      const data = resp.userPreferences;

      if (data.count) {
        return data.items[0];
      } else {
        return {medications: []};
      }
    });
}

export function prefrencesMutate(params) {
  const endpoint = `${widgetApiUrl}/graphql`;
  const client = new GraphQLClient(endpoint, options);
  const q = mutate(params);

  return client.request(q);
}
