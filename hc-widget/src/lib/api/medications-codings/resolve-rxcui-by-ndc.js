import { get } from '../../utils/utils';
import { RXNAV_ENDPOINT } from '../../../constants';

/**
 *
 * @param {String} ndc
 * @return {Promise<String[]>} list of rxcui
 */
export function resolveRxCuiByNdc(ndc) {
  return fetch(`${RXNAV_ENDPOINT}/rxcui.json?idtype=NDC&id=${ndc}`)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .then(json => {
      return get(json, 'idGroup.rxnormId.0', null);
    })
    .catch(() => null);
}
