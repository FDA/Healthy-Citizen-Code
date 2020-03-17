import { recallsQueryByRxcuis } from '../../../lib/api/recalls/recalls-query-by-rxcuis';
import { fetchMedicationsFromUserPreferencesOrMedicationRequest } from '../../../lib/api/medications/medications-from-preferences-or-medication-request';
import { ResponseError } from '../../../lib/exceptions';

export function fetchRecallsForUCSF(options) {
  return fetchMedications(options)
    .then((userPreferences) => {
      if (!userPreferences.medications.length) {
        throw new ResponseError(ResponseError.RECALLS_EMPTY);
      }

      return recallsQueryByRxcuis(userPreferences, options.algorithm, mongoQueryForUCSF);
    });
}

function fetchMedications(options) {
  if (options.dataSource === 'inline') {
    return mapRxcuiToUserPreferences(options);
  } else {
    return fetchMedicationsFromUserPreferencesOrMedicationRequest(options);
  }
}

function mapRxcuiToUserPreferences({ drugs }) {
  const medications = drugs.map((rxcui) => ({ rxcui: [rxcui] }));

  return Promise.resolve({ medications });
}

function mongoQueryForUCSF(rxcuis) {
  return {
    'rxCuis.rxCui': { $in: rxcuis },
    status: 'Ongoing',
    centerRecommendedDepth: 'consumerEndUser'
  };
}
