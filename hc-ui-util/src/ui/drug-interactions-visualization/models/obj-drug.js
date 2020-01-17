export default function objDrug(medCoding) {
  // Q: how to name, how to lookup
  const id = medCoding.rxcui[0];
  const GROUP_NAME = 'objDrug';

  return {
    id,
    group: GROUP_NAME,
    label: medCoding.brandName,
    ndc: medCoding.ndc,
    rxcui: medCoding.rxcui[0],
    dependedOnBy: [],
    depends: [],
  };
}
