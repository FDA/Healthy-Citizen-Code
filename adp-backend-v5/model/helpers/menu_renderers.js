const _ = require('lodash');
const {getFeModule} = require('./util');

/**
 * MenuRenderers are called to create custom menu item
 *
 */

module.exports = function () {
  const m = {};

  m.datasetsCustomMenuItems = () => {
    const fe = getFeModule(['GraphqlCollectionQuery', 'AdpSchemaService', 'ErrorHelpers']);
    const datasetSchema = fe.AdpSchemaService.getSchemaByName('datasets');
    const gqlParams = {
      filter: [['favorite', '=', true]],
      skip: 0,
    };

    return fe.GraphqlCollectionQuery(datasetSchema, gqlParams)
      .then(result => result.items)
      .then(transformItemNames)
      .then(items => createMenuSchema(items, 0, ''))
      .catch(error => {
        fe.ErrorHelpers.handleError(error, 'Unknown error while loading list of grid views');
        throw error;
      });

    function transformItemNames(items) {
      _.each(items, item => {
        item.directory = _.compact(_.split(item.name, '/').map(x => x.trim()));
      });

      return items;
    }

    function createMenuSchema(items, level, rootName) {
      if (!items.length) {
        return null;
      }

      const fields = {};

      _.each(items, (item, index) => {
        const schema = {};
        const itemName = item.directory[level];

        if (level > 0) {
          const parentName = item.directory[level - 1];
          if (parentName !== rootName) {
            return;
          }
        }

        if (item.directory[level + 1]) {
          if (_.find(fields, fld=>fld.fullName===itemName)) {
            return;
          }
          schema.type = 'MenuGroup';
          schema.fields = createMenuSchema(items, level + 1, itemName);
        } else {
          schema.type = 'MenuItem';
          schema.link = `/datasetsId`;
          schema.linkParams = { _id: item._id };
        }

        schema.fullName = itemName;

        fields[`level${level}set${index}`] = schema;
      })

      return fields;
    }
  }


  m.userHelloMenuItem = () => {
    // eslint-disable-next-line no-undef
    const user = lsService.getUser();

    return `Hello ${user.login}!`;
  }

  return m;
};
