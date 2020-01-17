import { ResponseError } from '../../exceptions';
import { fhirRequest } from './fhir-request';

export function fetchResource(endpoint, options) {
  const requestInit = fhirRequest(endpoint, options);

  return fetch(requestInit)
    .then(_handleError);
}

function _handleError(res) {
  if (res.ok) {
    return res.json();
  }

  throw new ResponseError(ResponseError.FHIR_SERVER_ERROR);
}
