const graphqlHTTP = require('express-graphql');
const { altairExpress } = require('altair-express-middleware');
const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');

module.exports = (appLib, graphQlRoute, altairRoute) => {
  const m = {};
  m.graphQlRoute = graphQlRoute;
  m.altairRoute = altairRoute;

  m.connectGraphqlSchema = () => {
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

    // TODO: resolve why using appLib.addRoute during rebuilding graphql for datasets gives '/graphql' not found
    // appLib.addRoute('get', m.graphQlRoute, [graphqlMiddleware]);
    // appLib.addRoute('post', m.graphQlRoute, [appLib.isAuthenticated, graphqlMiddleware]);
    appLib.app.get(m.graphQlRoute, graphqlMiddleware);
    appLib.app.post(m.graphQlRoute, appLib.isAuthenticated, graphqlMiddleware);
  };

  m.connectGraphqlWithAltair = () => {
    m.connectGraphqlSchema();
    appLib.addRoute('use', m.altairRoute, [altairExpress({ endpointURL: m.graphQlRoute })]);
  };

  return m;
};
