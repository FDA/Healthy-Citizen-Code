const graphqlHTTP = require('express-graphql');
const { altairExpress } = require('altair-express-middleware');
const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');

module.exports = appLib => (graphQlRoute = '/graphql', altairRoute = '/altair') => {
  // do not add graphql if there is no queries
  // it MUST be at least one query - see https://github.com/graphql/graphql-js/issues/448
  if (_.isEmpty(schemaComposer.Query.getFields())) {
    return;
  }

  const graphQLSchema = schemaComposer.buildSchema();
  const graphqlMiddleware = graphqlHTTP(req => ({
    schema: graphQLSchema,
    graphiql: true,
    context: { req, appLib },
  }));
  appLib.addRoute('get', graphQlRoute, [graphqlMiddleware]);
  appLib.addRoute('post', graphQlRoute, [appLib.isAuthenticated, graphqlMiddleware]);
  appLib.addRoute('use', altairRoute, [altairExpress({ endpointURL: graphQlRoute })]);
};
