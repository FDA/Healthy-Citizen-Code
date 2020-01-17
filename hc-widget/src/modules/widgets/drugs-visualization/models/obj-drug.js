export default function objDrug(medCoding) {
  // Q: how to name, how to lookup
  const GROUP_NAME = 'objDrug';

  return {
    id: medCoding.rxcui,
    group: GROUP_NAME,
    label: medCoding.brandName,
    rxcui: medCoding.rxcui,
    dependedOnBy: [],
    depends: []
  }
}
