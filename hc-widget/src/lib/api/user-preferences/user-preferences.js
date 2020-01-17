import { createGraphqlClient } from '../graphql/grapql-client';
import { pick } from '../../utils/utils';
import CONFIG from '../../../config';

export function preferencesQuery(udid) {
  const client = createGraphqlClient(`${CONFIG.WIDGET_API_URL}/graphql`);

  return client.request(query(udid))
    .then(resp => {
      const data = resp.userPreferences;

      if (data.count) {
        return data.items[0];
      } else {
        return { medications: [] };
      }
    });
}

function query(udid = '') {
  return `{
      userPreferences (filter: { udid: "${udid}" }) {
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
          }
        }
      }
    }`;
}


export function preferencesMutate(params) {
  const client = createGraphqlClient(`${CONFIG.WIDGET_API_URL}/graphql`);
  const q = mutate(params.udid);


  return client.request(q, { record: getRecord(params) });
}

function getRecord(params) {
  const recordKeys = ['udid', 'age', 'gender', 'geographicRegion', 'medications'];

  return pick(params, ...recordKeys)
}

function mutate(udid = '') {
  return `mutation m($record: userPreferencesInputWithoutId) {
      userPreferencesUpsertOne (
        filter: { udid: "${udid}" },
        record: $record
      ) {
        _id
        udid
        gender
        age
        geographicRegion
        medications {
          _id
          ndc11
          brandName
        }
      }
    }`;
}
