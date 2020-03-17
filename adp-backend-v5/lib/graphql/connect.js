const graphqlHTTP = require('express-graphql');
const { altairExpress } = require('altair-express-middleware');
const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');

module.exports = (appLib, graphQlRoute, altairRoute) => {
  const m = {};
  m.graphQlRoute = graphQlRoute;
  m.altairRoute = altairRoute;
  m.graphQLSchema = null;

  m.connectGraphqlWithAltair = () => {
    // do not add graphql if there is no queries
    // it MUST be at least one query - see https://github.com/graphql/graphql-js/issues/448
    if (_.isEmpty(schemaComposer.Query.getFields())) {
      return;
    }
    m.graphQLSchema = schemaComposer.buildSchema();
    const graphqlMiddleware = graphqlHTTP(req => ({
      schema: m.graphQLSchema,
      graphiql: true,
      context: { req, appLib },
    }));

    appLib.addRoute('get', m.graphQlRoute, [graphqlMiddleware]);
    appLib.addRoute('post', m.graphQlRoute, [appLib.isAuthenticated, graphqlMiddleware]);
    appLib.addRoute('use', m.altairRoute, [altairExpress({ endpointURL: m.graphQlRoute })]);
  };

  m.rebuildGraphQlSchema = () => {
    m.graphQLSchema = schemaComposer.buildSchema();
    // console.log(`graphQLSchema types`, Object.keys(m.graphQLSchema._typeMap).length);
  };

  return m;
};
