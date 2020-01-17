import { importFromFhir } from '../../../lib/api/medications-codings/import-from-fhir/import-from-fhir';

export function importMedicationsFromDstu2(dstu2Url, fhirId) {
  return importFromFhir({ dataSource: 'dstu2', dstu2Url, fhirId })
    .then(mapData);
}

function mapData(data) {
  return data.map(item => {
    return {
      ndc11: item.code,
      brandName: item.display,
      rxcui: [item.rxcui],
    }
  })
}
