const RELATION_GROUPS = {
  DISEASE: 'relDrugDisease',
  EPC: 'relDrugPharmaClass',
  PE: 'relDrugPhysiologicEffect',
  CHEM: 'relDrugIngredient',
};

// source is Drug
// target rxClass
export default function drugToRxClass(drugObj, rxClassObj, drugInfo) {
  // group
  // rel<Source><Target>

  // subgroup
  // rel<Source><Target>_<rxclassDrugInfo.rxclassMinConceptItem.rela>
  const { classType } = drugInfo.rxclassMinConceptItem;
  const rela = drugInfo.rela || '';
  const group = RELATION_GROUPS[classType];
  const SUB_GROUP_NAME = rela ? `${group}.${rela}` : undefined;
  drugObj.depends.push(`${rxClassObj.id}`);

  return {
    id: `${drugObj.id}.${rxClassObj.id}`,
    source: drugObj.id,
    target: rxClassObj.id,
    group,
    subgroup: SUB_GROUP_NAME,
    dependedOnBy: [drugObj.id],
    label() {
      return this.definition().label || rela;
    },
  };
}
