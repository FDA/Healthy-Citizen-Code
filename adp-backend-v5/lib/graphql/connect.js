const graphqlHTTP = require('express-graphql');
const { ObjectID } = require('mongodb');
const Promise = require('bluebird');
const { altairExpress } = require('altair-express-middleware');
const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');
const graphql = require('graphql');
const { addQueriesAndMutationsForDatasetsRecord } = require('./datasets-collections/util');

module.exports = (appLib, graphQlRoute, altairRoute, adpGraphQl) => {
  const m = {};
  m.graphQlRoute = graphQlRoute;
  m.altairRoute = altairRoute;
  m.graphQLSchema = null;
  m.requestIdToAbsentDatasets = {};

  m.connectGraphqlWithAltair = () => {
    // do not add graphql if there is no queries
    // it MUST be at least one query - see https://github.com/graphql/graphql-js/issues/448
    if (_.isEmpty(schemaComposer.Query.getFields())) {
      return;
    }
    m.graphQLSchema = schemaComposer.buildSchema();

    const { addDefaultQueries, addDefaultMutations, datasetsModelName } = adpGraphQl;
    const { updateDatasetExpirationTimeout } = require('./datasets-collections')({ appLib, datasetsModelName });
    // customValidateFn and customExecuteFn are necessary to add lazy dataset resolvers
    const graphqlMiddleware = graphqlHTTP((req) => {
      return {
        schema: m.graphQLSchema,
        graphiql: true,
        context: { req, appLib },
        customValidateFn: (...args) => {
          const validationErrors = graphql.validate(...args);
          const regEx = /Cannot query field "_ds_([0-9a-fA-F]{24}).+?"/;
          const { true: datasetErrors, false: otherErrors } = _.groupBy(validationErrors, (e) => {
            return regEx.test(e.message);
          });
          if (datasetErrors) {
            const absentDatasetIds = datasetErrors.map((e) => {
              const [, objectId] = e.message.match(regEx);
              return objectId;
            });
            m.requestIdToAbsentDatasets[req.id] = absentDatasetIds;
          }
          return otherErrors || [];
        },
        customExecuteFn: async (args) => {
          const absentDatasetIds = m.requestIdToAbsentDatasets[req.id];
          if (!absentDatasetIds) {
            return graphql.execute(args);
          }
          const datasetRecords = await appLib.db
            .collection(datasetsModelName)
            .find({
              _id: { $in: absentDatasetIds.map((id) => ObjectID(id)) },
              ...appLib.dba.getConditionForActualRecord(datasetsModelName),
            })
            .toArray();
          delete m.requestIdToAbsentDatasets[req.id];

          await Promise.map(datasetRecords, async (datasetRecord) => {
            await addQueriesAndMutationsForDatasetsRecord(
              datasetRecord,
              appLib,
              addDefaultQueries,
              addDefaultMutations
            );
            const datasetId = datasetRecord._id.toString();
            updateDatasetExpirationTimeout(datasetId);
          });
          m.rebuildGraphQlSchema();

          return graphql.execute(args);
        },
      };
    });

    appLib.addRoute('get', m.graphQlRoute, [graphqlMiddleware]);
    appLib.addRoute('post', m.graphQlRoute, [appLib.isAuthenticated, graphqlMiddleware]);
    const fullGraphqlRoute = appLib.getFullRoute(appLib.API_PREFIX, m.graphQlRoute);
    appLib.addRoute('use', m.altairRoute, [altairExpress({ endpointURL: fullGraphqlRoute })]);
  };

  m.rebuildGraphQlSchema = () => {
    m.graphQLSchema = schemaComposer.buildSchema();
  };

  return m;
};
