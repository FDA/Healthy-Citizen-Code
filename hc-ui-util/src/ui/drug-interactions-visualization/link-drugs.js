import objFactory from './models/drug-terms-factory';
import rxClass from './models/rxclass';
import relationFactory from './models/relations-factory';

export function linkDrugs({ medications, rxClasses, interactionsData }) {
  const nodes = _createDrugs(medications);
  const links = _createRxClassObjects(nodes, rxClasses);

  _linkDrugs(interactionsData, nodes, links);

  const nodesArray = Object.values(nodes);
  return { nodes: nodesArray, links };
}

function _createDrugs(medications) {
  const nodes = {};

  medications.forEach(m => {
    const drugObject = objFactory.objDrug(m);
    _assignTonNodes(drugObject, nodes);
  });

  return nodes;
}

// rxClasses[{medCodings, rxClassDesc}]
function _createRxClassObjects(nodes, rxClasses) {
  // TODO: add props from obj-descriptino.json
  // Nodes for d3 forced graph we are using hash for faster access during objects linking.
  const links = [];

  rxClasses.forEach(rxClassDesc => {
    const drugInfoList = rxClassDesc.rxclassDrugInfoList.rxclassDrugInfo;
    const { rxcui } = rxClassDesc.userInput;
    const currentDrugObject = nodes[rxcui];

    drugInfoList.forEach(drugInfo => {
      if (!rxClass.hasType(drugInfo)) {
        return;
      }

      if (rxClass.exist(drugInfo, nodes)) {
        return;
      }

      const rxClassObj = objFactory.rxClass(drugInfo);
      const link = relationFactory.drugToRxClass(currentDrugObject, rxClassObj, drugInfo);
      links.push(link);
      _assignTonNodes(rxClassObj, nodes);
    });
  });

  return links;
}

function _linkDrugs(interactionsData, nodes, links) {
  const fullInteractionTypeGroups = interactionsData.fullInteractionTypeGroup;
  let linksRefs = {};
  const getDrugId = (interaction, index) => {
    return interaction.minConcept[index].rxcui;
  };

  if (fullInteractionTypeGroups) {
    fullInteractionTypeGroups.forEach(fullInteractionTypeGroup => {
      const { fullInteractionType } = fullInteractionTypeGroup;

      fullInteractionType.forEach(interaction => {
        let leftDrugId = getDrugId(interaction, 0);
        let rightDrugId = getDrugId(interaction, 1);
        leftDrugId = Math.min(leftDrugId, rightDrugId);
        rightDrugId = Math.max(leftDrugId, rightDrugId);

        nodes[leftDrugId].dependedOnBy.push(String(rightDrugId));
        nodes[rightDrugId].depends.push(String(leftDrugId));

        const linkRefId = `${leftDrugId}.${rightDrugId}`;
        let link;

        if (linksRefs[linkRefId]) {
          link = linksRefs[linkRefId];
          link.update(interaction);
        } else {
          link = relationFactory.drugToDrugInteraction(leftDrugId, rightDrugId, interaction);
          linksRefs[linkRefId] = link;
          links.push(link);
        }
      });
    });
  }

  linksRefs = null;
}

function _assignTonNodes(obj, nodes) {
  nodes[obj.id] = obj;
  nodes[obj.id].dependedOnBy.push(`${obj.id}`);
  obj.depends.push(`${nodes[obj.id].id}`);
}
