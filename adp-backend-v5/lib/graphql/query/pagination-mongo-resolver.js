const { schemaComposer } = require('graphql-compose');
const { composeWithPagination } = require('graphql-compose-pagination');
const RJSON = require('relaxed-json');
const _ = require('lodash');
const { GraphQLInputObjectType, GraphQLString } = require('graphql');

const MongoFindResolverName = 'findMany';
const MongoCountResolverName = 'count';

const mongoQueryInput = new GraphQLInputObjectType({
  name: 'mongoType',
  fields: {
    mongoQuery: { type: GraphQLString },
  },
});

function addFindManyResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);
  type.addResolver({
    kind: 'query',
    name: MongoFindResolverName,
    args: {
      filter: mongoQueryInput,
      limit: {
        type: 'Int',
        defaultValue: 20,
      },
      skip: {
        type: 'Int',
        defaultValue: 0,
      },
      sort: {
        type: 'String',
        defaultValue: '{_id: 1}',
      },
    },
    type: [type],
    resolve: ({ args }) => {
      const query = RJSON.parse(_.get(args, 'filter.mongoQuery', '{}'));
      const sort = RJSON.parse(args.sort);
      return db
        .find(query)
        .limit(args.limit)
        .skip(args.skip)
        .sort(sort);
    },
  });
}

function addCountResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);

  type.addResolver({
    kind: 'query',
    name: MongoCountResolverName,
    args: {
      filter: mongoQueryInput,
    },
    type: 'Int!',
    resolve: ({ args }) => {
      const query = RJSON.parse(_.get(args, 'filter.mongoQuery', '{}'));
      return db.count(query);
    },
  });
}

function addPaginationResolver(modelName, db) {
  addFindManyResolver(modelName, db);
  addCountResolver(modelName, db);

  const type = schemaComposer.getTC(modelName);

  composeWithPagination(type, {
    findResolverName: MongoFindResolverName,
    countResolverName: MongoCountResolverName,
  });
}

module.exports = {
  addPaginationResolver,
};
