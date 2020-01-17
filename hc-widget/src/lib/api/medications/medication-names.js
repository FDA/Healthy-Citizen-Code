import { createGraphqlClient } from '../graphql/grapql-client';
import { mapValues } from '../../utils/utils';

/**
 * Fetch medication names for each RxCui code
 * @param rxcuis String[]
 * @return {Promise<{} | never>}
 */
export function fetchMedicationNames(rxcuis) {
  const client = createGraphqlClient();
  const query = getQuery(rxcuis);

  return client.request(query)
    .then(({ drugsRxnormConso }) => drugsRxnormConso.items)
    .then(groupByRxcui);
}

function getQuery(rxcuis) {
  return `query {
    drugsRxnormConso(
      perPage: 100,
      filter: { 
        mongoQuery: "{'rxcui': {$in: [${rxcuis.map(i => `'${i}'`)}] } }" 
      }
    ) {
      items {
        rxcui
        tty
        str
      }
    }
  }`;
}

function groupByRxcui(names) {
  const namesGroupedBy = {};

  names.forEach((nameObj) => {
    const namesList = namesGroupedBy[nameObj.rxcui] || [];
    namesGroupedBy[nameObj.rxcui] = namesList;

    if (nameObj.str) {
      namesList.push(nameObj.str);
    }
  });

  return mapValues(namesGroupedBy, names => names[0].toUpperCase());
}
