import { resolveRxCuiByNdc } from '../medications-codings/resolve-rxcui-by-ndc';
import { ResponseError } from '../../exceptions';
import { fetchMedicationNames } from './medication-names'

/**
 * Get get rxcui from inline params and map to userPreferences
 * @param options
 * @return {Promise<{userPreferences}>}
 */
export function userPreferencesFromInlineDataSource(options) {
  const { drugs } = options;

  return getRxcuisByNdcs(drugs)
    .then(mapRxcuiToUserPreferences);
}

function mapRxcuiToUserPreferences(rxcuis) {
  const medications = rxcuis.map((rxcui) => ({ rxcui: [rxcui] }));
  return { medications };
}

function getRxcuisByNdcs(ndcs) {
  return Promise.all(ndcs.map(resolveRxCuiByNdc))
    .then((rxcuis) => {
      const result = rxcuis.filter(item => !!item).flat();
      if (!result.length) {
        throw new ResponseError(ResponseError.RECALLS_EMPTY);
      }

      return result;
    });
}

export function userPreferencesFromInlineDataSourceWitNames(options) {
  return userPreferencesFromInlineDataSource(options)
    .then(mapNamesToMedications);
}

function mapNamesToMedications({ medications }) {
  let rxcuis = medications.map(({ rxcui }) => rxcui).flat();

  return fetchMedicationNames(rxcuis)
    .then((rxcuiToNameMap) => {
      medications.forEach(m => (m.brandName = rxcuiToNameMap[m.rxcui[0]]));
      const filteredMedications = medications.filter(m => !!m.brandName);

      return { medications: filteredMedications };
    });
}
