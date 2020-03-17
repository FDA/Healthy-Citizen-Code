export default function objDrug(medCoding) {
  // Q: how to name, how to lookup
  const GROUP_NAME = 'objDrug';

  return {
    id: medCoding.rxcui[0],
    group: GROUP_NAME,
    label: medCoding.brandName,
    rxcui: medCoding.rxcui[0],
    dependedOnBy: [],
    depends: []
  }
}
