import objDefinitions from '../object-descriptions.json'
import interaction from './relation-interaction';
import rxClass from './relation-rxclass';

const _getGroup = name => {
  return objDefinitions.templates.default.relationships.fields[name];
};

const TERM_OBJECT = {
  source: '',
  target: '',
  group: '',
  subgroup: '',

  label() {},

  groupId() {
    return this.id.replace(/\./g, '_');
  },

  definition() {
    const SUB_GROUP_NAME = this.group;
    return _getGroup(SUB_GROUP_NAME);
  },

  distance() {
    return this.group === 'relDrugDrug' ? 2000: 350;
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
  drugToDrugInteraction(sourceId, targetId, interactionData) {
    const interactionInstance = interaction(sourceId, targetId, interactionData);
    return _extend(interactionInstance);
  },

  drugToRxClass(drugObg, rxClassObj, drugInfo) {
    const rxClassInstance = rxClass(drugObg, rxClassObj, drugInfo);
    return _extend(rxClassInstance);
  }
};
