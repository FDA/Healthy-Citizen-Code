import { recallsQuery } from '../../../lib/api/recalls/recalls-query';
import { ResponseError } from '../../../lib/exceptions';
import { fetchMedicationsFromUserPreferencesOrMedicationStatement } from '../../../lib/api/medications/medications-from-preferences-or-medication-statement'
import { userPreferencesFromInlineDataSource } from '../../../lib/api/medications/inline-datasources'
import { recallsQueryByRxcuis } from '../../../lib/api/recalls/recalls-query-by-rxcuis'

export function fetchRecalls(options) {
  if (options.dataSource === 'inline') {
    return fetchRecallsByRxcui(options);
  } else {
    return fetchRecallsByMedication(options);
  }
}

function fetchRecallsByRxcui(options) {
  return userPreferencesFromInlineDataSource(options)
    .then((userPreferences) => {
      return recallsQueryByRxcuis(userPreferences, options.algorithm, mongoQuery);
    });
}

function fetchRecallsByMedication(options) {
  return fetchMedicationsFromUserPreferencesOrMedicationStatement(options)
    .then((userPreferences) => {
      if (!userPreferences.medications.length) {
        throw new ResponseError(ResponseError.RECALLS_EMPTY);
      }

      return recallsQuery(userPreferences, options.algorithm, mongoQuery);
    });
}

function mongoQuery(rxcuis) {
  return {
    'rxCuis.rxCui': { $in: rxcuis },
    status: 'Ongoing',
  };
}
