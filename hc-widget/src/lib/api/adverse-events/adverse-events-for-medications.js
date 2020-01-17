import { fetchMedicationsFromUserPreferencesOrMedicationStatement } from '../medications/medications-from-preferences-or-medication-statement';
import { adverseEventsQuery } from './adverse-events-query';

export function fetchAdverseEventsForMedications(options) {
  return fetchMedicationsFromUserPreferencesOrMedicationStatement(options)
    .then((preferences) => {
      const { algorithm } = options;

      return adverseEventsQuery({ algorithm, ...preferences });
    });
}
