import { createGraphqlClient } from '../graphql/grapql-client';
import {
  handleResponse,
  handleError
} from '../graphql/graphql.helpers';

/**
 * Fetch recalls by rxcui codes list.
 *
 * @param {String} rxcui
 * @param {'openfda'|'conceptant'} algorithm
 *
 * @returns Promise{<rxcui<String>, Recalls[]>}
 */
export function recallsQuery(rxcui, algorithm) {
  return query(rxcui, algorithm, mongoQuery(rxcui));
}

/**
 *
 * @param {String[]} rxcuis
 * @param {String} algorithm
 */
export function recallsQueryForUSCF(rxcuis, algorithm) {
  return query(rxcuis, algorithm, mongoQueryForUCSF(rxcuis));
}


function query(rxcui, algorithm, mongoQuery) {
  const client = createGraphqlClient();
  const query = getQuery(rxcui, algorithm, mongoQuery);

  return client.request(query)
    .then((data) => handleResponse(data, getCollectionName(algorithm)))
    .catch(handleError);
}

function getCollectionName(algorithm = 'openfda') {
  const collections = {
    openfda: 'recallsOpenfdaDrugs',
    conceptant: 'recallsRes',
  };


  return collections[algorithm];
}

function getQuery(rxcui, algorithm, mongoQuery) {
  const collectionName = getCollectionName(algorithm);

  return `query {
    ${collectionName} (
      filter: {
        mongoQuery: "${mongoQuery}" 
      }
    ) {
      pageInfo {
        itemCount
      }
      items {
        recallInitiationDate
        status
        classification
        recallingFirm
        distributionPattern
        reasonForRecall
        codeInfo
        productDescription
        rxCuis { rxCui }
      }
    }
  }`;
}

function mongoQuery(rxcui) {
  const q = {
    'rxCuis.rxCui': rxcui,
    status: 'Ongoing',
  };

  return JSON.stringify(q).replace(/"/g, '\\"');
}

function mongoQueryForUCSF(rxcuis) {
  const q = {
    'rxCuis.rxCui': { $in: rxcuis },
    status: 'Ongoing',
    centerRecommendedDepth: 'consumerEndUser'
  };

  return JSON.stringify(q).replace(/"/g, '\\"');
}
