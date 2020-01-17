import { RXNAV_ENDPOINT } from '../../../constants';

export function fetchInteractionsByRxCuis(rxCui) {
  return fetch(`${RXNAV_ENDPOINT}/interaction/list.json?rxcuis=${rxCui.join('+')}`)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .catch((err) => {
      console.log(err);
      return null;
    });
}
