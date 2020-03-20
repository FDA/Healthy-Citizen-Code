/**
 * @typedef Medication
 * @property rxcui: String[]
 * @property brandName: String
 */

import { preferencesQuery } from '../user-preferences/user-preferences'
import { rxcuiFromMedicationRequest } from '../medications-codings/rxcui-from-medication-request'
import { resolveRxCuiByNdc } from '../medications-codings/resolve-rxcui-by-ndc'

/**
 *
 * @param options
 *
 * @return {Promise<{} | {
 *  medications: Medication[]
 *  gender: String
 *  gender: String
 *  age: String
 *  geographicRegion: String
 * }>}
 */
export function fetchMedicationsFromUserPreferencesOrMedicationRequest(options) {
  if (options.dataSource === 'userPreferences') {
    return preferencesQuery(options.udid)
      .then(mapRxcuiUserPreferences);
  } else {
    return rxcuiFromMedicationRequest(options)
      .then(mapRxcuiCodingToUserPreferences);
  }
}

function mapRxcuiUserPreferences({ medications, ...other }) {
  const promises = medications.map(fetchRxcuiWithTtyIn);

  return Promise.all(promises)
    .then(medications => medications.filter(v => v))
    .then((medications) => {
      return { medications, ...other };
    })
}

function fetchRxcuiWithTtyIn(medication) {
  return resolveRxCuiByNdc(medication.ndc11)
    .then((rxcui) => {
      if (!rxcui) {
        return null;
      }

      medication.rxcui = rxcui;
      return medication;
    })
}

function mapRxcuiCodingToUserPreferences(rxcuis) {
  return {
    medications: rxcuis.map(rxcui => ({ rxcui }))
  }
}
