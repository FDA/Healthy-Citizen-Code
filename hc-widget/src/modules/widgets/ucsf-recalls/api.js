import { rxcuiFromMedicationRequest } from '../../../lib/api/medications-codings/rxcui-from-medication-request';
import { rxcuiCodingsFromUserPreferences } from '../../../lib/api/medications-codings/codings-from-user-preferences';
import { recallsQueryForUSCF } from '../../../lib/api/recalls/recalls-query';
import { fetchMedicationNames } from '../../../lib/api/medications/medication-names';
import {
  forEachInObject,
} from '../../../lib/utils/utils';
import { ResponseError } from '../../../lib/exceptions';

export function fetchRecallsForUCSF(options) {
  return fetchCodings(options)
    .then((codings) => {
      if (!codings.length) {
        throw new ResponseError(ResponseError.RECALLS_EMPTY);
      }

      return fetchRecalls(codings, options.algorithm);
    });
}

function fetchCodings(options) {
  const strategies = {
    userPreferences: ({ udid }) => rxcuiCodingsFromUserPreferences(udid),
    rxcuis: ({ rxcuis }) => Promise.resolve(rxcuis),
  };

  if (strategies[options.dataSource]) {
    return strategies[options.dataSource](options);
  } else {
    return rxcuiFromMedicationRequest(options)
  }
}

function fetchRecalls(codings, algorithm) {
  return recallsQueryForUSCF(codings, algorithm)
    .then(({ list, itemCount }) => {
      if (itemCount <= 0) {
        throw new ResponseError(ResponseError.RECALLS_EMPTY);
      }

      const groupedRecalls = groupRecallsByRxcuiCode(list);
      const rxcuis = Object.keys(groupedRecalls);

      return fetchMedicationNames(rxcuis)
        .then((names) => {
          const mapped = mapRecallsToNames(names, groupedRecalls);
          const isEmpty = Object.keys(mapped) <= 0;

          if (isEmpty) {
            throw new ResponseError(ResponseError.RECALLS_EMPTY);
          }

          return mapped;
        });
    });
}

function groupRecallsByRxcuiCode(recalls) {
  const recallsGroupedBy = {};

  recalls.forEach((recall) => {
    if (recall.rxCuis === undefined) {
      return;
    }

    recall.rxCuis.forEach(({ rxCui }) => {
      const rxcuiRecalls = recallsGroupedBy[rxCui] || [];
      rxcuiRecalls.push(recall);
      recallsGroupedBy[rxCui] = rxcuiRecalls;
    });
  });

  return recallsGroupedBy;
}

/**
 * @param {Object<String, String>} names - key: medication name, value: rxCui
 * @param {Object<String, Object[]>} groupedRecalls - key: rxCui, value: recalls list
 */
function mapRecallsToNames(names, groupedRecalls) {
  const result = {};
  forEachInObject(names, (name, rxcui) => (result[name] = groupedRecalls[rxcui]));

  return result;
}
