const _ = require('lodash');
const fs = require('fs');
const helper = require('./helper');

const getMainMenu = (settingsPath) => {
  const settings = JSON.parse(fs.readFileSync(settingsPath));
  const menuIdToResources = {};

  const alwaysIgnoredSchemas = _.get(settings, 'parameters.alwaysIgnore.list', []).map(name => _.camelCase(name));
  _.forEach(settings.resources, (resource, resourceSchemaName) => {
    const { include } = resource;
    const isIncluded = include === 'true' || include === true || include === '1';
    if (!alwaysIgnoredSchemas.includes(resourceSchemaName) && isIncluded) {
      const resourceObj = { [resourceSchemaName]: generateFhirMenuItem(resourceSchemaName, resource.fullName) };
      menuIdToResources[resource.menuId] = _.merge(menuIdToResources[resource.menuId], resourceObj);
    }
  });

  _.forEach(settings.menu, (obj, path) => {
    injectMenuItemsWithCleanUp(settings.menu, path, menuIdToResources);
  });

  const menuJson = { interface: settings.menu };

  return menuJson;
};

/**
 * Recursively injects menu items to sourceParent[path] object looking for resources from menuIdMap.
 * @param sourceParent
 * @param path
 * @param menuIdMap
 */
function injectMenuItemsWithCleanUp (sourceParent, path, menuIdMap) {
  const source = sourceParent[path];
  const mergedFields = _.merge(source.fields, menuIdMap[source.menuId]);
  delete source.menuId;
  if (!_.isEmpty(mergedFields)) {
    source.fields = mergedFields;

    // inject in every nested field
    _.forEach(source.fields, (nestedObj, nestedPath) => {
      injectMenuItemsWithCleanUp(source.fields, nestedPath, menuIdMap);
    });
  }

  if (!source.fields && source.type === 'MenuGroup') {
    delete sourceParent[path];
  }
}

const generateFhirMenuItem = (schemaName, fullName) => {
  const fullname = fullName || helper.getFullNameByName(schemaName);
  return {
    type: 'MenuItem',
    fullName: fullname,
    link: `/${schemaName}`,
    description: fullname,
  };
};

module.exports = { getMainMenu };
