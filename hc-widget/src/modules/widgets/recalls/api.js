import { fetchMedicationsFromUserPreferencesOrMedicationStatement } from '../../../lib/api/medications/medications-from-preferences-or-medication-statement';
import { recallsQuery } from '../../../lib/api/recalls/recalls-query';

export function fetchRecalls(options) {
  return fetchMedicationsFromUserPreferencesOrMedicationStatement(options)
    .then(({ medications }) => {
      const { algorithm } = options;

      const promises = medications.map(m => fetchRecallsForMedication(m, algorithm));
      return Promise.all(promises);
    });
}

function fetchRecallsForMedication(medication, algorithm) {
  return recallsQuery(medication.rxcui, algorithm)
    .then((recalls) => {
      return {
        display: medication.display || medication.brandName,
        ...recalls
      };
    });
}
