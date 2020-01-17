export function fhirRequest(endpoint, options) {
  const request = {
    headers: _getHeaders(options),
  };

  return new Request(endpoint, request);
}

function _getHeaders({ fhirAccessToken }) {
  const headers = {};

  if (fhirAccessToken !== undefined) {
    headers.Authorization = `Bearer ${fhirAccessToken}`;
  }

  return headers;
}
