export function fhirRequest(endpoint, options) {
  const request = {
    headers: _getHeaders(options),
  };

  return new Request(endpoint, request);
}

function _getHeaders({ epicAccessToken, fhirAccessToken, dataSource }) {
  const headers = {};
  const token = epicAccessToken || fhirAccessToken;

  if (['epicStu3WithOauth2', 'epicStu3'].includes(dataSource)) {
    headers.Accept = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
