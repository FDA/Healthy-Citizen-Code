const rxClass = {
  exist,
  create,
  hasType
};
export default rxClass;

// store this data in factory
let CLASS_TYPES = {
  'DISEASE': 'objDisease',
  'EPC': 'objPharmaClass',
  'PE': 'objPhysiologicEffect',
  'CHEM': 'objIngredient'
};

let CLASS_TYPES_NAMES = Object.keys(CLASS_TYPES);

function create(drugInfo) {
  let objName = getName(drugInfo);
  let classType = drugInfo.rxclassMinConceptItem.classType;
  let className = drugInfo.rxclassMinConceptItem.className;

  return {
    id: objName,
    group: CLASS_TYPES[classType],
    label: className,
    dependedOnBy: [],
    depends: [],
  };
}

function hasType(drugInfo) {
  let classType = drugInfo.rxclassMinConceptItem.classType;
  return CLASS_TYPES_NAMES.includes(classType)
}

function getName(drugInfo) {
  // <rxclassDrugInfo.rxclassMinConceptItem.classType>.<rxclassDrugInfo.rxclassMinConceptItem.classId>
  let classType = drugInfo.rxclassMinConceptItem.classType;
  let classId = drugInfo.rxclassMinConceptItem.classId;

  return `${classType}.${classId}`
}

function exist(drugInfo, nodes) {
  let name = getName(drugInfo);

  return !!nodes[name];
}