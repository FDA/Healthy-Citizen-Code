export default function objDrug(medCoding) {
  // Q: how to name, how to lookup
  let id = medCoding.rxcui[0];
  const GROUP_NAME = 'objDrug';
  return {
    id: id,
    group: GROUP_NAME,
    label: medCoding.display,
    ndc: medCoding.code,
    rxcui: medCoding.rxcui[0],
    dependedOnBy: [],
    depends: []
  }
}