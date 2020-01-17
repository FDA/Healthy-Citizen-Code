import { ResponseError } from '../../exceptions';
import { RXNAV_ENDPOINT } from '../../../constants';

export function fetchRxClass(rxcui) {
  const endpoint = `${RXNAV_ENDPOINT}/rxclass/class/byRxcui.json?rxcui=${rxcui}`;

  return fetch(endpoint)
    .then(handleResponse)
    .catch((err) => {
      if (err instanceof ResponseError) {
        return null;
      }
      throw err;
    });
}

export function fetchRxClasses(rxcuis) {
  return Promise.all(rxcuis.map(fetchRxClass))
    .then(data => data.filter(v => v));
}

function handleResponse(res) {
  if (res.status !== 200) {
    throw new ResponseError(ResponseError.RESPONSE_EMPTY);
  }
  return res.json();
}
