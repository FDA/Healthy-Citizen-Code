const rxClass = {
  exist,
  create,
  hasType,
};
export default rxClass;

// store this data in factory
const CLASS_TYPES = {
  DISEASE: 'objDisease',
  EPC: 'objPharmaClass',
  PE: 'objPhysiologicEffect',
  CHEM: 'objIngredient',
};

const CLASS_TYPES_NAMES = Object.keys(CLASS_TYPES);

function create(drugInfo) {
  const objName = getName(drugInfo);
  const { classType } = drugInfo.rxclassMinConceptItem;
  const { className } = drugInfo.rxclassMinConceptItem;

  return {
    id: objName,
    group: CLASS_TYPES[classType],
    label: className,
    dependedOnBy: [],
    depends: [],
  };
}

function hasType(drugInfo) {
  const { classType } = drugInfo.rxclassMinConceptItem;
  return CLASS_TYPES_NAMES.includes(classType);
}

function getName(drugInfo) {
  // <rxclassDrugInfo.rxclassMinConceptItem.classType>.<rxclassDrugInfo.rxclassMinConceptItem.classId>
  const { classType } = drugInfo.rxclassMinConceptItem;
  const { classId } = drugInfo.rxclassMinConceptItem;

  return `${classType}.${classId}`;
}

function exist(drugInfo, nodes) {
  const name = getName(drugInfo);

  return !!nodes[name];
}
