const RELATION_GROUPS = {
  'DISEASE': 'relDrugDisease',
  'EPC': 'relDrugPharmaClass',
  'PE': 'relDrugPhysiologicEffect',
  'CHEM': 'relDrugIngredient'
};

// source is Drug
// target rxClass
export default function drugToRxClass(drugObj, rxClassObj, drugInfo) {
  // group
  // rel<Source><Target>

  // subgroup
  // rel<Source><Target>_<rxclassDrugInfo.rxclassMinConceptItem.rela>
  let classType = drugInfo.rxclassMinConceptItem.classType;
  let rela = drugInfo.rela || '';
  let group = RELATION_GROUPS[classType];
  const SUB_GROUP_NAME = rela ? `${group}.${rela}` : undefined;
  drugObj.depends.push("" + rxClassObj.id);

  return {
    id: `${drugObj.id}.${rxClassObj.id}`,
    source: drugObj.id,
    target: rxClassObj.id,
    group: group,
    subgroup: SUB_GROUP_NAME,
    dependedOnBy: [drugObj.id],
    label() {
      return this.definition().label || rela;
    }
  }
}