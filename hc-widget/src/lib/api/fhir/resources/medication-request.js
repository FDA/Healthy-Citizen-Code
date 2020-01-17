import { fetchResource } from '../fetch-resource';

export function MedicationRequest(options) {
  const endpoint = selectEndpoint(options);
  return fetchResource(endpoint, options);
}

function selectEndpoint(options) {
  const endpoints = {
    stu3({ stu3Url, fhirId }) {
      return `${stu3Url}/MedicationRequest?_include=MedicationRequest:patient&subject:Patient=${fhirId}&_format=json`;
    },
    dstu2({ dstu2Url, fhirId }) {
      return `${dstu2Url}/MedicationOrder?patient=${fhirId}`;
    },
    epicStu3: epicStu3Endpoint,
    epicStu3WithOauth2: epicStu3Endpoint,
  };

  const { dataSource } = options;
  return endpoints[dataSource](options);
}

function epicStu3Endpoint({ patientStu3, fhirServerUrl }) {
  return `${fhirServerUrl}/MedicationRequest?patient=${patientStu3}&_include=MedicationRequest:medication`;
}
