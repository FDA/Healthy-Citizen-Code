import { fetchMedicationsFromUserPreferencesOrMedicationStatement } from '../medications/medications-from-preferences-or-medication-statement';
import { adverseEventsQuery } from './adverse-events-query';
import { userPreferencesFromInlineDataSourceWitNames } from '../medications/inline-datasources';

export function fetchAdverseEventsForMedications(options) {
  return fetchMedications(options)
    .then((userPreferences) => {
      const { algorithm } = options;

      return adverseEventsQuery(userPreferences, algorithm);
    });
}

function fetchMedications(options) {
  if (options.dataSource === 'inline') {
    return userPreferencesFromInlineDataSourceWitNames(options)
      .then(u => addInlineParamsToUserPreferences(u, options))
  } else {
    return fetchMedicationsFromUserPreferencesOrMedicationStatement(options);
  }
}

function addInlineParamsToUserPreferences(userPreferences, options) {
  const { gender, age } = options;

  if (gender) {
    userPreferences.gender = gender === 'male' ? 'M' : 'F';
  }

  if (age) {
    userPreferences.age = age;
  }

  return userPreferences;
}
