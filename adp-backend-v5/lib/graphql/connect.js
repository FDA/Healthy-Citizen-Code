const { graphqlRestify, graphiqlRestify } = require('apollo-server-restify');
const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');

module.exports = appLib => (graphQlRoute, graphiQlRoute) => {
  // do not add graphql if there is no queries
  // it MUST be at least one query - see https://github.com/graphql/graphql-js/issues/448
  if (_.isEmpty(schemaComposer.Query.getFields())) {
    return;
  }

  const graphQLSchema = schemaComposer.buildSchema();
  const graphQLOptions = { schema: graphQLSchema };

  appLib.addRoute('get', graphQlRoute, [graphqlRestify(graphQLOptions)]);
  appLib.addRoute('post', graphQlRoute, [graphqlRestify(graphQLOptions)]);

  appLib.addRoute('get', graphiQlRoute, [graphiqlRestify({ endpointURL: graphQlRoute })]);
};
