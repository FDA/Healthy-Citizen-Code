import objDefinitions from '../object-descriptions.json'
import objDrug from './obj-drug';
import rxClass from './rxclass';

const _getGroup = name => {
  return objDefinitions.templates.default.objects.fields[name];
};

const TERM_OBJECT = {
  id: '',
  group: '',
  label: '',
  dependedOnBy: [],
  depends: [],

  groupId() {
    return this.id.replace(/\./g, '_');
  },

  definition() {
    const GROUP_NAME = this.group;
    return _getGroup(GROUP_NAME);
  },

  collision() {
    return this.prop('radius') + 10;
  },

  distanceMin() {
    return this.group === 'objDrug' ? 700 : 350;
  },

  strength() {
    return this.group === 'objDrug' ? -800: -4000;
  },

  prop(name) {
    const method = this[name];
    return method ? method () : this.definition()[name];
  }
};

function _extend(obj) {
  return Object.assign(Object.create(TERM_OBJECT), obj);
}

export default {
  // TODO: same here, the widget should be abstract, capable of displaying any data, not just specific to given objects
  objDrug(medCoding) {
    const objDrugInstance = objDrug(medCoding);
    return _extend(objDrugInstance);
  },

  rxClass(drugInfo) {
    const rxClassInstance = rxClass.create(drugInfo);
    return _extend(rxClassInstance);
  }
};
