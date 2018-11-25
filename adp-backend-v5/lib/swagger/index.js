const _ = require('lodash');
const appRoot = require('app-root-path').path;
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-restify');

const MOUNT_POINT = 'api-docs';

const { getGraphqlConfig } = require('./configs/graphql-config');
const { getCrudRoutesConfig } = require('./configs/crud-config');
const { getLookupConfig } = require('./configs/lookup-config');

const connectSwagger = appLib => {
  const swaggerSpec = swaggerJSDoc({
    swaggerDefinition: getSwaggerConfig(appLib),
    apis: [
      `${appRoot}/server_controllers/**/*.js`,
      `${appRoot}/lib/app.js`,
      `${appRoot}/lib/*-controller.js`,
      `${process.env.APP_MODEL_DIR}/server_controllers/**/*.js`,
    ],
  });

  connectSwaggerSpec(appLib.app, MOUNT_POINT, swaggerSpec);
};

function getSwaggerConfig(appLib) {
  const baseConfig = getBaseSwaggerConfig();

  const { models } = appLib.appModel;
  const crudRoutesConfig = getCrudRoutesConfig(models);

  const { graphiQlRoute, graphQlRoute } = appLib.graphQl;
  const graphqlConfig = getGraphqlConfig(graphiQlRoute, graphQlRoute);

  const lookupConfig = getLookupConfig(models);

  return _.mergeWith(
    baseConfig,
    crudRoutesConfig,
    graphqlConfig,
    lookupConfig,
    (objValue, srcValue) => {
      if (_.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    }
  );
}

/**
 * This config is aware of other configs tags since it manages the order of tags.
 * @returns object
 */
function getBaseSwaggerConfig() {
  const baseConfig = {
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
    tags: [
      { name: 'Auth' },
      {
        name: 'GraphQL',
        description:
          'Endpoints of this section will be active only if user specifies the configuration. It must have at least one graphQL Query.',
      },
      { name: 'Meta' },
      { name: 'File' },
      { name: 'Lookup' },
    ],
  };
  return baseConfig;
}

function connectSwaggerSpec(app, mountPoint, swaggerSpec) {
  app.get(`/${mountPoint}/.*`, ...swaggerUi.serve);
  app.get(`/${mountPoint}`, swaggerUi.setup(swaggerSpec, { baseURL: mountPoint }));
}

module.exports = connectSwagger;
