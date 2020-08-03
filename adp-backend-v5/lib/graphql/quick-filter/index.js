const JSON5 = require('json5');
const { schemaComposer } = require('graphql-compose');
const { ValidationError } = require('../../errors');

const quickFilterTestResolverName = 'quickFilterTest';

async function testQuickFilter({ appLib, filterString, modelName, userContext, projection }) {
  if (!appLib.appModel.models[modelName]) {
    throw new ValidationError(`Model '${modelName}' does not exist`);
  }

  let conditions;
  try {
    conditions = JSON5.parse(filterString);
  } catch (e) {
    throw new ValidationError(`Invalid filter string. ${e.message}`);
  }

  const model = appLib.db.model(modelName);
  if (projection.items) {
    const items = await appLib.dba.getItemsUsingCache({ model, mongoParams: { conditions }, userContext });
    return { items, count: items.length };
  }
  const count = await appLib.dba.getCountDocuments(model, conditions);
  return { count };
}

function addTestQuickFilterResolver(type) {
  type.addResolver({
    kind: 'query',
    name: quickFilterTestResolverName,
    type: `type TestQuickFilterResponse { count: Int, items: [JSON] }`,
    args: {
      model: 'String!',
      filter: 'String!',
    },
    resolve: async ({ args, projection, context }) => {
      const { req, appLib } = context;
      const userContext = appLib.accessUtil.getUserContext(req);
      const { model, filter } = args;
      return testQuickFilter({ appLib, modelName: model, filterString: filter, userContext, projection });
    },
  });

  return type.getResolver(quickFilterTestResolverName);
}

module.exports = () => {
  const m = {};

  const type = schemaComposer.createObjectTC({
    name: 'QuickFilterTestType',
    description: '',
    fields: {
      count: {
        type: 'Int',
        description: 'Total count of filtered records.',
      },
      items: {
        type: '[JSON]',
        description: 'Array of filtered records.',
      },
    },
  });

  m.testQuickFilterResolver = addTestQuickFilterResolver(type);

  return m;
};
