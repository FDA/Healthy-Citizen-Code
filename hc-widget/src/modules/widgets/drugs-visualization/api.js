import { fetchMedicationsFromUserPreferencesOrMedicationStatement } from '../../../lib/api/medications/medications-from-preferences-or-medication-statement';
import { ResponseError } from '../../../lib/exceptions';
import { fetchRxClasses } from '../../../lib/api/rx-class/rx-class';
import { fetchInteractionsByRxCuis } from '../../../lib/api/drug-interactions/drug-interactions';

export function getDrugsRelations(options) {
  return fetchMedicationsFromUserPreferencesOrMedicationStatement(options)
    .then(({ medications }) => {
      if (!medications.length) {
        throw new ResponseError(ResponseError.RESPONSE_EMPTY)
      }

      let rxcuis = medications.map(({ rxcui }) => rxcui);

      return Promise.all([fetchRxClasses(rxcuis), fetchInteractionsByRxCuis(rxcuis)])
        .then(([rxClasses, interactionsData]) => {
          return { medications, rxClasses, interactionsData };
        });
    });
}
