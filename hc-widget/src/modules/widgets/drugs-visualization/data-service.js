import hcWidgetAPI from '../../api';
import lodashGet from 'lodash.get';
import lodashMap from 'lodash.map';

import objFactory from './models/drug-terms-factory';
import rxClass from './models/rxclass';
import relationFactory from './models/relations-factory';

export default function getDrugsRelations(options) {
  return hcWidgetAPI.getMedicationCodings(options)
    .then(medCodings => {
      if (!medCodings.length) {
        throw new Error('Unable to get medications list.')
      }

      const rxcuiPromises = medCodings.map(hcWidgetAPI.getRxcuiByNdc);
      return Promise.all(rxcuiPromises);
    })
    .then(medCodings => {
      // filtration by ref to remove
      // TODO: please comment why are you doing this
      for (let i = medCodings.length - 1; i >= 0; i--) {
        if (!medCodings[i].rxcui.length) {
          medCodings.splice(i, 1);
        }
      }

      const namePromises = medCodings.map(m => hcWidgetAPI.getMedicationGenericName(m.rxcui));

      return Promise.all(namePromises)
        .then(names => {
          medCodings.forEach((m, i) => {
            m.display = names[i];
          });

          return medCodings;
        });
    })
    .then(medCodings => {
      const rxClassPromises = medCodings.reduce((result, item) => {
        if (item.rxcui.length) {
          result.push(hcWidgetAPI.getRxClass(item));
        }

        return result;
      }, []);

      return Promise.all(rxClassPromises)
        .then(rxClasses => {
          let nodes = _createDrugs(medCodings);
          return _createRxClassObjects(nodes, rxClasses);
        })
        .then(({nodes, links}) => {
          return { nodes, links, medCodings };
        })
    })
    .then(({ nodes, links, medCodings }) => {
      const allRxcuis = medCodings.map(medCoding => medCoding.rxcui);

      return hcWidgetAPI.findInteractionsByRxcuis(allRxcuis)
        .then(interactionsData => _linkDrugs(interactionsData, nodes, links))
    })
    .then(({ nodes, links }) => {
      let nodesArray = lodashMap(nodes);

      return { nodesArray, links};
    });
}

function _createDrugs(medCodings) {
  const nodes = {};

  medCodings.map(medCoding => {
    const drugObject = objFactory.objDrug(medCoding);
    _assignTonNodes(drugObject, nodes);
  });

  return nodes;
}

// rxClasses[{medCodings, rxClassDesc}]
function _createRxClassObjects(nodes, rxClasses) {
  // TODO: add props from obj-descriptino.json
  // Nodes for d3 forced graph we are using hash for faster access during objects linking.
  let links = [];

  rxClasses.map(rxClassDesc => {
    const drugInfoList = rxClassDesc.rxclassDrugInfoList.rxclassDrugInfo;
    const rxcui = rxClassDesc.userInput.rxcui;
    const currentDrugObject = nodes[rxcui];

    drugInfoList.map(drugInfo => {
      // TODO: check if empty
      let rxClassObj, link;

      if (!rxClass.hasType(drugInfo)) {
        return;
      }

      if (rxClass.exist(drugInfo, nodes)) {
        return;
      }

      rxClassObj = objFactory.rxClass(drugInfo);
      link = relationFactory.drugToRxClass(currentDrugObject, rxClassObj, drugInfo);
      links.push(link);
      _assignTonNodes(rxClassObj, nodes);

    });
  });

  return { nodes, links };
}

function _linkDrugs(interactionsData, nodes, links) {
  const fullInteractionTypeGroups = interactionsData.fullInteractionTypeGroup;
  let linksRefs = {};
  const idPath = index => `minConcept.${index}.rxcui`;
  if(fullInteractionTypeGroups) {
      fullInteractionTypeGroups.map(fullInteractionTypeGroup => {
          const fullInteractionType = fullInteractionTypeGroup.fullInteractionType;

          fullInteractionType.map(interaction => {
              let leftDrugId = +lodashGet(interaction, idPath(0));
              let rightDrugId = +lodashGet(interaction, idPath(1));
              leftDrugId = Math.min(leftDrugId, rightDrugId);
              rightDrugId = Math.max(leftDrugId, rightDrugId);


              nodes[leftDrugId].dependedOnBy.push("" + rightDrugId);
              nodes[rightDrugId].depends.push("" + leftDrugId);

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

  return { nodes, links };
}

function _assignTonNodes(obj, nodes) {
  nodes[obj.id] = obj;
  nodes[obj.id].dependedOnBy.push( "" + obj.id );
  obj.depends.push( "" + nodes[obj.id].id );
}
