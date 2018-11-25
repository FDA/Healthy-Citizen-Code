const { schemaComposer } = require('graphql-compose');
const { composeWithPagination } = require('graphql-compose-pagination');

const ITCFindResolverName = 'ITCFind';
const ITCCountResolverName = 'ITCCount';

function addITCResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);
  type.addResolver({
    kind: 'query',
    name: ITCFindResolverName,
    args: {
      filter: type.getITC(),
      limit: {
        type: 'Int',
        defaultValue: 20,
      },
      skip: 'Int',
      // ... other args if needed
    },
    type: [type], // array of cities
    resolve: ({ args }) =>
      db
        .find(args.filter)
        .limit(args.limit)
        .skip(args.skip),
  });
}

function addITCCountResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);
  const inputType = type.getITC();
  // make all filter fields optional for flexible search
  inputType.makeOptional(inputType.getFieldNames());

  type.addResolver({
    kind: 'query',
    name: ITCCountResolverName,
    args: {
      filter: inputType,
    },
    type: 'Int!',
    resolve: ({ args }) => db.count(args.filter),
  });
}

function addPaginationITCResolver(modelName) {
  addITCResolver(modelName);
  addITCCountResolver(modelName);

  const type = schemaComposer.getTC(modelName);

  composeWithPagination(type, {
    findResolverName: ITCFindResolverName,
    countResolverName: ITCCountResolverName,
  });
}

module.exports = {
  addPaginationITCResolver,
};
