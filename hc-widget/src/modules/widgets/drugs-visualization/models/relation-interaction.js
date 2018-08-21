import lodashGet from 'lodash.get';

// serious if at least one of the records in the API output has "severity" set to "high"
// if there are multiple drug interactions with "high" severity => relDrugDrugSeriousMultiple.
const RELATIONS_SEVERITY_GROUPS = [
  'relDrugDrugNotSerious',
  'relDrugDrugSerious',
  'relDrugDrugSeriousMultiple'
];

export default function interaction(sourceId, targetId, interaction) {
  let severity = _getSeverity(interaction);
  let seriousInteractionsCount = severity === 'high' ? 1 : 0;
  const SUB_GROUP_NAME = _getSeveritySubgroup(seriousInteractionsCount);

  return {
    id: `${sourceId}.${targetId}`,
    source: sourceId,
    target: targetId,
    group: 'relDrugDrug',
    subgroup: SUB_GROUP_NAME,
    seriousInteractionsCount: seriousInteractionsCount,
    severity: severity,
    update: updateInteraction,
    label() {
      return this.definition().label;
    }
  }
}

function _getSeverity(interaction) {
  return lodashGet(interaction, 'interactionPair.0.severity');
}

function _getSeveritySubgroup(count) {
  if (count === 0 || count === 1) {
    return RELATIONS_SEVERITY_GROUPS[count]
  }

  return RELATIONS_SEVERITY_GROUPS[2];
}

function updateInteraction(interaction) {
  let severity = _getSeverity(interaction);

  if (severity !== 'high') {
    return;
  }

  this.severity = 'high';
  this.seriousInteractionsCount++;
  this.subgroup = _getSeveritySubgroup(this.seriousInteractionsCount);
}