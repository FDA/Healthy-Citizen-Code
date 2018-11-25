const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

/**
 * Mapping application model name to filepath with fields meta info.
 * Yaml files can be downloaded from urls like https://open.fda.gov/apis/drug/event/searchable-fields/
 * @type {{drugEvents: string, recalls: string}}
 */
const modelToYaml = {
  'drugEvents': '../private/openfda/drug-event-fields.yaml',
  'recalls': '../private/openfda/drug-event-fields.yaml',
};

// cache
const modelToSearchableFields = {};

function getSearchableFields (model) {
  let searchableFields = modelToSearchableFields[model];
  if (searchableFields) {
    return searchableFields;
  }

  const yamlPath = modelToYaml[model];
  if (!yamlPath) {
    throw new Error(`There is no fields description for model ${model}`);
  }
  const resolvedPath = path.resolve(__dirname, yamlPath);

  try {
    searchableFields = yaml.safeLoad(fs.readFileSync(resolvedPath), 'utf8');
  } catch (e) {
    const message = `Error occurred during parsing yaml by path ${yamlPath}`;
    console.log(message, e);
    throw new Error(message);
  }

  if (!searchableFields.properties || searchableFields.type !== 'object') {
    throw new Error(`Invalid data from ${yamlPath}. Expected object with fields 'properties' and 'type': 'object.`);
  }

  modelToSearchableFields[model] = searchableFields;
  return searchableFields;
}

module.exports = {
  getSearchableFields,
};
