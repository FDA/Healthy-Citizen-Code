const _ = require('lodash');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { getSchemaNestedPaths, appRoot } = require('../util/env');

const MOUNT_POINT = 'api-docs';

const { getGraphqlConfig } = require('./configs/graphql-config');
const { getCrudRoutesConfig } = require('./configs/crud-config');
const { getLookupConfig } = require('./configs/lookup-config');

const connectSwagger = (appLib) => {
  const swaggerDefinition = getSwaggerConfig(appLib);
  const swaggerSpec = swaggerJSDoc({
    swaggerDefinition,
    apis: [
      `${appRoot}/server_controllers/**/*.js`,
      `${appRoot}/lib/app.js`,
      `${appRoot}/lib/*-controller.js`,
      ...getSchemaNestedPaths('server_controllers/**/*.js'),
    ],
  });

  connectSwaggerSpec(appLib, MOUNT_POINT, swaggerSpec);
};

function getSwaggerConfig(appLib) {
  const baseConfig = getBaseSwaggerConfig();

  const { models } = appLib.appModel;
  const crudRoutesConfig = getCrudRoutesConfig(models);

  const { graphiQlRoute, graphQlRoute } = appLib.graphQl;
  let graphqlConfig = {};
  const isGraphiqlConnected = !_.isEmpty(appLib.expressUtil.findRoutes(appLib.app, graphiQlRoute, 'post'));
  if (isGraphiqlConnected) {
    graphqlConfig = getGraphqlConfig(graphiQlRoute, graphQlRoute);
    baseConfig.tags[1] = {
      name: 'GraphQL',
      description:
        'Endpoints of this section will be active only if user specifies the configuration. It must have at least one GraphQL Query.',
      externalDocs: {
        url: '/graphql',
        description: 'Test interactive ui here',
      },
    };
  }

  const lookupConfig = getLookupConfig(models);

  return _.mergeWith(baseConfig, crudRoutesConfig, graphqlConfig, lookupConfig, (objValue, srcValue) => {
    if (Array.isArray(srcValue) && Array.isArray(objValue)) {
      return objValue.concat(srcValue);
    }
  });
}

/**
 * This config is aware of other configs tags since it manages the order of tags.
 * @returns object
 */
function getBaseSwaggerConfig() {
  return {
    swagger: '2.0',
    info: {
      title: 'API Documentation',
      description: `To access endpoints requiring auth token:
1) Get token from '/login' response.
2) Press 'Authorize' button or lock image on the right side of each endpoint.
3) Enter \`JWT YOUR_TOKEN\` where YOUR_TOKEN is the token from step 1.
4) Press 'Authorize'. From this moment all your requests will contain "Authorization" header.

All responses are wrapped in envelop:

\`\`\`json
  {
    "success": true|false,
    "message": ...,
    "data": ...
  }
\`\`\`
`,
    },
    contact: {
      email: 'connect@conceptant.com',
    },
    version: '1.0',
    basePath: '/',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      User: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      },
    },
    security: [
      {
        User: [],
      },
    ],
    tags: [{ name: 'Auth' }, { name: 'Meta' }, { name: 'File' }, { name: 'Lookup' }],
  };
}

function connectSwaggerSpec(appLib, mountPoint, swaggerSpec) {
  appLib.app.use(`/${mountPoint}`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = connectSwagger;
