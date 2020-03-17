import { fetchMedicationsFromUserPreferencesOrMedicationStatement } from '../../../lib/api/medications/medications-from-preferences-or-medication-statement';
import { ResponseError } from '../../../lib/exceptions';
import { fetchRxClasses } from '../../../lib/api/rx-class/rx-class';
import { fetchInteractionsByRxCuis } from '../../../lib/api/drug-interactions/drug-interactions';
import { userPreferencesFromInlineDataSourceWitNames } from '../../../lib/api/medications/inline-datasources';

export function getDrugsRelations(options) {
  return fetchMedications(options)
    .then(({ medications }) => {
      if (!medications.length) {
        throw new ResponseError(ResponseError.RESPONSE_EMPTY)
      }

      let rxcuis = medications.map(({ rxcui }) => rxcui).flat();
      return Promise.all([
          fetchRxClasses(rxcuis),
          fetchInteractionsByRxCuis(rxcuis),
        ])
        .then(([rxClasses, interactionsData]) => {
          return { medications, rxClasses, interactionsData };
        });
    });
}

function fetchMedications(options) {
  if (options.dataSource === 'inline') {
    return userPreferencesFromInlineDataSourceWitNames(options);
  } else {
    return fetchMedicationsFromUserPreferencesOrMedicationStatement(options);
  }
}
