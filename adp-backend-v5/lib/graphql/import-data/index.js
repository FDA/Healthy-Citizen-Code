const { ObjectId } = require('mongodb');
const path = require('path');
const log = require('log4js').getLogger('lib/graphql-import-data');
const { schemaComposer } = require('graphql-compose');

const { ValidationError } = require('../../errors');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');
const { importJson } = require('./import-json');
const { importCsv } = require('./import-csv');
const { getOverallErrorResponse } = require('./util');

module.exports = (appLib) => {
  const m = {};

  async function getFile(fileId) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }

    // TODO: check permissions for file creator?
    const { record: file } = await appLib.db.collection('files').hookQuery('findOne', { _id: ObjectId(fileId) });
    if (!file) {
      return null;
    }
    return { ...file, filePath: path.resolve(process.cwd(), file.filePath) };
  }

  function getImportFunc(file) {
    const { mimeType, originalName } = file;
    if (originalName.endsWith('.csv') || mimeType === 'text/csv') {
      return importCsv;
    }
    if (originalName.endsWith('.json') || mimeType === 'application/json') {
      return importJson;
    }

    return null;
  }

  function getResolver() {
    return schemaComposer.createResolver({
      name: 'importDataResolver',
      type: schemaComposer.createObjectTC({
        name: 'importDataResponse',
        fields: {
          importedRowsNumber: 'Int',
          errors: 'JSON',
        },
      }),
      kind: 'mutation',
      args: {
        fileId: 'String!',
        modelName: 'String!',
      },
      resolve: async ({ args, context }) => {
        try {
          const { req } = context;
          const { fileId, modelName } = args;

          if (!appLib.appModel.models[modelName]) {
            return getOverallErrorResponse(`Invalid model '${modelName}' specified`);
          }

          const file = await getFile(fileId);
          if (!file) {
            return getOverallErrorResponse(`File ${fileId} is not found`);
          }

          const importFunc = getImportFunc(file);
          if (!importFunc) {
            return getOverallErrorResponse(`Unable to handle file of type ${file.mimeType}`);
          }

          const { filePath } = file;
          const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
          graphQlContext.mongoParams = { conditions: {} };

          return await importFunc({ filePath, context: graphQlContext, log });
        } catch (e) {
          const errorMessage = e instanceof ValidationError ? e.message : `Unable to import file`;
          log.error(errorMessage, e.stack);
          return getOverallErrorResponse(errorMessage);
        }
      },
    });
  }

  m.resolver = getResolver();

  return m;
};
