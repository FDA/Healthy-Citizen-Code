import { createGraphqlClient } from '../graphql/grapql-client';
import { ResponseError } from '../../exceptions'

/**
 * Fetch medication names for each RxCui code
 * @param rxcuis String[]
 * @return {Promise<{}>} rxcui to medication map
 */
export function fetchMedicationNames(rxcuis) {
  const client = createGraphqlClient();

  return client.request(getQuery(), { rxcuis })
    .then(({ getDrugsRxnormConsoSingleMedicationNames }) => {
      return getDrugsRxnormConsoSingleMedicationNames.rxcuiToMedicationName;
    })
    .then((names) => {
      const result = {};
      for (const [rxcui, name] of Object.entries(names)) {
        if (name) result[rxcui] = name;
      }

      if (Object.keys(result).length === 0) {
        throw new ResponseError(ResponseError.MEDICATION_NAMES_EMPTY);
      }

      return result;
    });
}

function getQuery() {
  return `query q($rxcuis: [String]!) {
    getDrugsRxnormConsoSingleMedicationNames(rxcuis: $rxcuis) {
      rxcuiToMedicationName
    }
  }`;
}
