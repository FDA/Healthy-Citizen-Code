const _ = require('lodash');
const nodeUrl = require('url');
const { addToSet } = require('../util/set-helpers');

function getConfiguration(appTitle) {
  return [
    '// configuration',
    '#ranker: tight-tree',
    '#arrowSize: 1',
    '#bendSize: 0.5',
    '#direction: right',
    '#gutter: 1',
    '#edgeMargin: 0',
    '#edges: rounded',
    '#fill: #fff; #fff',
    '#fillArrows: true',
    '#font: Arial',
    '#fontSize: 12',
    '#leading: 1',
    '#lineWidth: 1',
    '#padding: 4',
    '#spacing: 20',
    '#stroke: #33322E',
    `#title: ${appTitle}`,
    '#zoom: 0.8',
    '#acyclicer: greedy',
  ].join('\n');
}

function getDirectiveTypes() {
  return ['// directive types', '#.list: dashed visual=class bold'].join('\n');
}

function getDiagramCode(models, appLists, appTitle, parseOptions = {}) {
  const entities = {};
  const relationships = {};
  _.each(models, (model) => {
    parseModel(model, entities, relationships, appLists, parseOptions);
  });

  return [
    getConfiguration(appTitle),
    '',
    getDirectiveTypes(),
    '',
    '// list of the models',
    _.values(entities).join('\n'),
    '',
    '// list of the relationships between the models',
    _.values(relationships).join('\n'),
  ].join('\n');
}

function parseModel(model, entities, relationships, appLists, parseOptions = {}) {
  const entityName = model.schemaName;
  const fieldCodePieces = [];
  const modelRelationships = new Set();

  _.forEach(model.fields, (fieldVal) => {
    const { fieldCode, fieldRelationships, listsUsed } = parseField({ field: fieldVal, entityName });
    fieldCode && fieldCodePieces.push(fieldCode);
    addToSet(modelRelationships, fieldRelationships);

    for (const listName of listsUsed) {
      const list = appLists[listName];
      if (list) {
        if (parseOptions.expandListValues) {
          entities[listName] = `[ <list> ${listName} | ${_.keys(list).join(' | ')} ]`;
        } else {
          entities[listName] = `[ <list> ${listName} ]`;
        }
      } else {
        // dynamic list contains full URL or just path
        const urlObj = nodeUrl.parse(listName);
        // auth credentials are removed in case of full URL
        const preparedListName = nodeUrl.format({ ...urlObj, auth: null });
        entities[listName] = `[ <list> ${preparedListName} ]`;
      }
    }
  });

  if (parseOptions.expandModelFields) {
    entities[entityName] = [`[ ${entityName} |`, fieldCodePieces.join(' |\n'), `]`].join('\n');
  } else {
    entities[entityName] = [`[ ${entityName} ]`].join('\n');
  }
  relationships[entityName] = [...modelRelationships].join('\n');
}

function parseField({ field, entityName }) {
  const { type, required, fieldName, lookup } = field;
  let fieldCode = '';
  const fieldRelationships = new Set();
  // Lists are presented as entities in nomnoml. Example: [ <list> listName | val1 | val2 ]
  // Variable is created to distinguish string 'fieldCode' which is built recursively from list entities
  const listsUsed = new Set();

  if (!fieldName) {
    // Ignore fields like 'generatorBatchName' which don't have fieldName
    return { fieldCode, fieldRelationships, listsUsed };
  }

  const listName = _.get(field, 'list.name');
  listName && listsUsed.add(listName);

  const Type = type.replace('[', '\\[').replace(']', '\\]');
  const Required = `${required ? 'Required' : ''}`;
  const List = `${listName ? `List: ${listName}` : ''}`;

  const lookupTables = _.keys(_.get(lookup, 'table', []));
  const isLookup = !_.isEmpty(lookupTables);

  if (isLookup) {
    const LookupType = `${Type} -> ${lookupTables.join(', ')}`;
    const fieldMeta = _.compact([LookupType, Required, List]).join(', ');
    fieldCode = `${fieldName}: ${fieldMeta}`;
    const lookupRelationships = lookupTables.map((tableName) => `[${entityName}]->[${tableName}]`);
    addToSet(fieldRelationships, lookupRelationships);
  } else {
    const fieldMeta = _.compact([Type, Required, List]).join(', ');
    fieldCode = `${fieldName}: ${fieldMeta}`;
  }
  listName && fieldRelationships.add(`[${entityName}]->[${listName}]`);

  _.each(field.fields, (nestedField) => {
    const nestedFieldData = parseField({ field: nestedField, entityName });
    fieldCode += ` | ${nestedFieldData.fieldCode}`;
    addToSet(listsUsed, nestedFieldData.listsUsed);
    addToSet(fieldRelationships, nestedFieldData.fieldRelationships);
  });
  if (field.fields) {
    // wrap it into table
    fieldCode = `[${fieldCode}]`;
  }

  return { fieldCode, fieldRelationships, listsUsed };
}

module.exports = {
  getDiagramCode,
};
