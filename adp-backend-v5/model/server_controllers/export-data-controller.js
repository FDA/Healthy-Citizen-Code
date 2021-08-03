const _ = require('lodash');
const log = require('log4js').getLogger('export-data-controller');
const { ObjectID } = require('mongodb');

const { getCreator } = require('../../lib/queue/background-jobs/util');
const { handleGraphQlError } = require('../../lib/graphql/util');
const { isValidTimeZone } = require('../../lib/util/date');
const { ValidationError, AccessError } = require('../../lib/errors');
const {
  runExportDataToFile,
  runExportDataToDb,
  createExportDataToFileQueue,
  createExportDataToDbQueue,
  exportsModelName,
} = require('../../lib/queue/background-jobs/export-data');
const BaseContext = require('../../lib/request-context/BaseContext');
const GraphQlContext = require('../../lib/request-context/graphql/GraphQlContext');
const {
  getDatasetRecordSchemaName,
  getNewSchemeByProjections,
  datasetsModelName,
} = require('../../lib/graphql/datasets-collections/util');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    if (!appLib.queue.isReady()) {
      log.warn(`External commands runner is disabled due to required Bull queue is disabled`);
      return;
    }
    m.appLib = appLib;

    m.exportDataToDbQueue = await createExportDataToDbQueue({ appLib, log });
    m.exportDataToFileQueue = await createExportDataToFileQueue({ appLib, log });
    addExportMutation();
  };

  function addExportMutation() {
    const { getCreateMutationName, wrapMutation } = m.appLib.graphQl;

    wrapMutation(getCreateMutationName(exportsModelName), () => async (rp) => {
      const { record } = rp.args;
      validateAndTransformExportRecord({ record, appLib: m.appLib });

      if (record.exportType === 'db') {
        return addDbExport({ record, rp });
      }
      return addFileExport({ record, rp });
    });
  }

  function validateAndTransformExportRecord({ appLib, record }) {
    const { exportType, exportSpecification = {} } = record;
    const { modelName, filter = {}, projections, timezone } = exportSpecification;

    const scheme = appLib.appModel.models[modelName];
    if (!scheme) {
      throw new ValidationError(`Invalid modelName specified`);
    }
    if (!_.isString(filter.dxQuery)) {
      throw new ValidationError(`Param dxQuery must be a string`);
    }
    if (!_.isArray(projections)) {
      throw new ValidationError(`Param projections must be an array`);
    }

    if (exportType !== 'db' && !isValidTimeZone(timezone)) {
      throw new ValidationError(`Invalid timezone '${timezone}' specified`);
    }

    record.exportSpecification.projections = _.isEmpty(projections) ? _.keys(scheme.fields) : projections;
  }

  async function createExportRecord({ record, req }) {
    const { userContext, userPermissions } = new BaseContext(m.appLib, req);
    const actionToFilterFields = 'create';
    return m.appLib.controllerUtil.createItemWithCheckAndFilter({
      action: actionToFilterFields,
      data: record,
      modelName: exportsModelName,
      mongoConditions: {},
      userPermissions,
      userContext,
    });
  }

  async function addDbExport({ record, rp }) {
    const { req, appLib } = rp.context;
    const { modelName, projections, filter } = record.exportSpecification;
    try {
      const datasetsObjectId = ObjectID();
      const datasetId = datasetsObjectId.toString();
      const datasetRecordSchemaName = getDatasetRecordSchemaName(datasetId);

      const exportName = record.name;
      const datasetsItem = {
        _id: datasetsObjectId,
        collectionName: datasetRecordSchemaName,
        name: exportName,
        description: record.description,
      };

      const { parentCollectionScheme, newScheme, newSchemeFields } = await getNewSchemeByProjections({
        datasetsModelName,
        datasetRecordSchemaName,
        appLib,
        parentCollectionName: modelName,
        projections,
        fixLookupIdDuplicates: appLib.mutil.fixLookupIdDuplicates,
      });

      datasetsItem.scheme = newScheme;
      _.set(datasetsItem, 'scheme.schemaName', datasetRecordSchemaName);
      _.set(datasetsItem, 'scheme.collectionName', datasetRecordSchemaName);

      const datasetContext = await new GraphQlContext(appLib, req, datasetsModelName, {}).init();
      const createdDatasetRecord = await appLib.dba.withTransaction(async (session) =>
        appLib.controllerUtil.cloneItem(datasetContext, datasetsItem, session)
      );
      await appLib.trino.upsertTrinoSchema(createdDatasetRecord.scheme);

      // need to pass exportRecordId to update 'dataset' in export record on job finish
      const exportRecordId = ObjectID();
      record._id = exportRecordId;
      const createdExportRecord = await createExportRecord({ record, req });

      const { userPermissions, inlineContext } = datasetContext;
      const outputPipeline = await getViewRecordsPipeline({
        appLib,
        scheme: parentCollectionScheme,
        userPermissions,
        inlineContext,
        filter,
        projections: newSchemeFields,
      });
      outputPipeline.push({ $out: datasetRecordSchemaName });

      const { success, message } = await runExportDataToDb({
        datasetId,
        datasetName: datasetsItem.name,
        outCollectionName: datasetRecordSchemaName,
        outputPipeline,
        parentCollectionName: parentCollectionScheme.collectionName,
        appLib,
        creator: getCreator(appLib, req.user),
        exportRecordId,
        log,
      });

      if (!success) {
        await Promise.all([
          appLib.db.collection(datasetsModelName).removeOne({ _id: createdDatasetRecord._id }),
          appLib.db.collection(exportsModelName).removeOne({ _id: createdExportRecord._id }),
        ]);
        throw new ValidationError(message);
      }

      return createdExportRecord;
    } catch (e) {
      handleGraphQlError({ e, message: `Unable to export data`, log, appLib: m.appLib, modelName: datasetsModelName });
    }
  }

  async function addFileExport({ record, rp }) {
    const { req, appLib } = rp.context;
    const { modelName, projections, filter, timezone } = record.exportSpecification;
    try {
      const userPermissions = appLib.accessUtil.getReqPermissions(req);
      const inlineContext = appLib.accessUtil.getInlineContext(req);

      // need to pass exportRecordId to update 'file' in export record on job finish
      const exportRecordId = ObjectID();
      record._id = exportRecordId;
      const createdExportRecord = await createExportRecord({ record, req });

      const scheme = appLib.appModel.models[modelName];
      const exportPipeline = await getViewRecordsPipeline({
        appLib,
        scheme,
        userPermissions,
        inlineContext,
        filter,
        projections,
      });

      const creator = getCreator(appLib, req.user);
      const { success, message } = await runExportDataToFile({
        collectionToExport: modelName,
        projections,
        exportName: record.name,
        exportPipeline,
        exportType: record.exportType,
        timezone,
        exportRecordId,
        creator,
        appLib,
        log,
      });

      if (!success) {
        await appLib.db.collection(exportsModelName).removeOne({ _id: createdExportRecord._id });
        throw new ValidationError(message);
      }

      return createdExportRecord;
    } catch (e) {
      handleGraphQlError({ e, message: `Unable to export data`, log, appLib: m.appLib, modelName });
    }
  }

  async function getViewRecordsPipeline({ appLib, scheme, userPermissions, inlineContext, filter, projections }) {
    // scheme is used for filter to allow filter for example by fields f1 and f2 and export (using projection) only field f2
    const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
      scheme,
      userPermissions,
      inlineContext,
      'view'
    );
    const { conditions: filterConditions } = appLib.filterParser.parse(filter.dxQuery, scheme);
    const scopeConditions = scopeConditionsMeta.overallConditions;
    const viewConditions = appLib.butil.MONGO.and(
      appLib.dba.getConditionForActualRecord(scheme.schemaName),
      scopeConditions,
      filterConditions
    );

    if (viewConditions === false) {
      throw new AccessError(`Not enough permissions to perform operation.`);
    }

    const pipeline = [];
    if (viewConditions !== true) {
      pipeline.push({ $match: viewConditions });
    }

    const project = {};
    _.each(projections, (fieldProjection) => {
      project[fieldProjection] = 1;
    });
    if (!_.isEmpty(project)) {
      pipeline.push({ $project: project });
    }

    return pipeline;
  }

  return m;
};
