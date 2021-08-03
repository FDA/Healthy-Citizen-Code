const util = require('util');
const mem = require('mem');
const dayjs = require('dayjs');
const args = require('optimist').argv;
const crypto = require('crypto');
const dateformat = require('dateformat');
const ejs = require('ejs');
const _ = require('lodash');
const Promise = require('bluebird');
const oracledb = require('oracledb');
const uuidv4 = require('uuid/v4');
const { getMongoConnection } = require('../util/mongo');
const { ObjectID } = require('mongodb');
const log4js = require('log4js');
log4js.configure({
  appenders: { out: { type: 'stdout' } },
  categories: { default: { appenders: ['out'], level: 'info' } },
});
const enableLogsColor = false;

function getLogger({ category, level = 'trace', mongoDbConnection, writeDb = false }) {
  const isDbLogEnabled = mongoDbConnection && writeDb;

  // create logger outputting deep nesting objects instead of truncating to '[Object]'
  const _logger = log4js.getLogger(category);
  _logger.level = level;

  const logger = {};
  _.each(log4js.levels.levels, (obj) => {
    const methodName = _.lowerCase(obj.levelStr);
    logger[methodName] = (...args) => {
      const logs = args.map((arg) => {
        return _.isPlainObject(arg) ? util.inspect(arg, false, null, enableLogsColor) : arg;
      });
      console[methodName](...logs);

      if (isDbLogEnabled && args.length === 1 && _.isPlainObject(args[0])) {
        try {
          mongoDbConnection.collection('_journal').insertOne(args[0]);
        } catch (e) {
          console.error(`Unable to log to db`);
        }
      }
    };
  });
  return logger;
}
const logger = getLogger({ category: 'logger', level: 'trace' });

const dataPullsMongoConnectionString = args.mongoUri;
if (!dataPullsMongoConnectionString) {
  logger.error(`Parameter 'mongoUri' must be specified to obtain dataPulls`);
  process.exit(1);
}
const tags = (String(args.tags) || '').split(',').map((t) => t.trim());
const maxParallelPulls = parseInt(args.maxParallelPulls) || 1;
const writeDbDataBridge = args.writeDbDataBridge === 'true' || args.writeDbDataBridge === '1';
const writeDbDataPull = args.writeDbDataPull === 'true' || args.writeDbDataPull === '1';
const oracleDefaultPerfOpts = {
  prefetchRows: Number.parseInt(args.prefetchRows, 10) || 1000,
  fetchArraySize: Number.parseInt(args.fetchArraySize, 10) || 1000,
};

const dataPullsCollectionName = 'dataPulls';
const EJS_DELIMITER = '@';
const dataPullFields = [
  'name',
  'description',
  'dependsOn',
  'tags',
  'disabled',
  'lastPullPosition',
  'pullEnd',
  'pullStart',
  'priority',
  'totalDocumentsProcessed',
  'chunkedDataPull',
  'dataPullChunks',
  'sourceType',
  'oracleConnectionString',
  'oracleQuery',
  'oracleCredentials',
  'oraclePrivilege',
  'transformationCode',
  'copyInputToOutput',
  'destinationType',
  'mongodbUri',
  'mongodbCollection',
  'localMongodbDataset',
  'customAfterPullCode',
  'afterPullCode',
];

async function pumpData() {
  let mongoDbConnection;
  try {
    mongoDbConnection = await getMongodbConnection(dataPullsMongoConnectionString);
  } catch (e) {
    logger.error(
      `Unable to connect to mongo to obtain dataPulls by connection string '${dataPullsMongoConnectionString}'`
    );
    throw e;
  }

  const dataBridgeId = uuidv4();
  const dataBridgeLogger = getLogger({
    category: 'dataBridge',
    level: 'trace',
    mongoDbConnection,
    writeDb: writeDbDataBridge,
  });
  const dataPullLogger = getLogger({
    category: 'dataPull',
    level: 'trace',
    mongoDbConnection,
    writeDb: writeDbDataPull,
  });
  const dataBridgeStart = new Date();
  dataBridgeLogger.info({
    type: 'dataBridgeStart',
    id: dataBridgeId,
    command: process.argv,
    tags: tags,
    timestamp: dataBridgeStart,
  });

  const dataPulls = await getDataPulls(mongoDbConnection, tags);
  logger.info(`Found ${dataPulls.length} dataPull records.`);

  const nameToDataPulls = {};
  _.each(dataPulls, (dp) => (nameToDataPulls[dp.name] = dp));

  const { warnings } = prepareDataPulls(dataPulls, nameToDataPulls);
  warnings.length && logger.warn(warnings.join('\n'));

  const processingContext = {
    pullNamesInProgress: [],
    maxParallelPulls,
    mongoDbConnection,
    dataBridgeId,
    dataPulls,
    dataBridgeLogger,
    dataPullLogger,
  };

  const dataPullsToPump = getDataPullsToPump(dataPulls, maxParallelPulls);
  const dataPullsToPumpNames = dataPullsToPump.map((dp) => `'${dp.name}'`);
  logger.info(`Param maxParallelPulls=${maxParallelPulls}, initial data pulls to pump: ${dataPullsToPumpNames}`);

  await Promise.map(dataPullsToPump, (dataPull) => processDataPull({ dataPull, processingContext }));

  const dataBridgeFinish = new Date();
  dataBridgeLogger.info({
    type: 'dataBridgeFinish',
    id: dataBridgeId,
    timestamp: dataBridgeFinish,
    duration: dataBridgeFinish - dataBridgeStart,
  });

  process.exit(0);
}

async function getDataPulls(mongodbConnection, dpTags) {
  // collection has softDelete: false
  const actualRecordCondition = { disabled: { $ne: true } };
  const tagsCondition = _.isEmpty(dpTags) ? {} : { 'tags.label': { $in: dpTags } };
  const condition = { ...actualRecordCondition, ...tagsCondition };
  const dataPulls = await mongodbConnection.collection(dataPullsCollectionName).find(condition).toArray();

  async function processDestinationType(dataPull) {
    const { name, localMongodbDataset, mongodbUri, mongodbCollection, destinationType } = dataPull;

    if (destinationType === 'localMongodb') {
      if (!localMongodbDataset) {
        throw new Error(`Field 'localMongodbDataset' must be specified for dataPull with name '${name}'`);
      }
      const { _id, table } = localMongodbDataset;
      const datasetRecord = await mongodbConnection
        .collection(table)
        .findOne({ _id }, { _id: 1, name: 1, collectionName: 1, 'scheme.fields': 1 });
      if (!datasetRecord) {
        throw new Error(`Unable to find 'localDataset' record for dataPull with name '${name}'`);
      }
      datasetRecord.scheme = { fields: _.keys(datasetRecord.scheme.fields) };
      dataPull.localMongodbDatasetRecord = datasetRecord;
      return;
    }
    if (destinationType === 'externalMongodb') {
      if (!mongodbUri || !mongodbCollection) {
        throw new Error(
          `Fields 'mongodbUri' and 'mongodbCollection' must be specified in dataPull with name '${name}'`
        );
      }
      return;
    }
    throw new Error(`Invalid 'destinationType' '${destinationType}' specified in dataPull with name '${name}'`);
  }

  async function processSourceType(dataPull) {
    const { name, sourceType, oracleCredentials } = dataPull;
    if (sourceType !== 'oracle') {
      throw new Error(`Invalid 'sourceType' '${sourceType}' specified for dataPull with name '${name}'`);
    }

    if (!oracleCredentials) {
      throw new Error(`Field 'oracleCredentials' must be specified for dataPull with name '${name}'`);
    }
    const { _id, table } = oracleCredentials;
    const oracleCredentialsRecord = await mongodbConnection
      .collection(table)
      .findOne({ _id }, { _id: 1, user: 1, password: 1 });
    if (!oracleCredentialsRecord) {
      throw new Error(`Unable to find 'oracleCredentials' record for dataPull with name '${name}'`);
    }
    dataPull.oracleCredentialsRecord = oracleCredentialsRecord;
  }

  await Promise.map(
    dataPulls,
    async (dataPull) => {
      await processDestinationType(dataPull);
      await processSourceType(dataPull);
    },
    { concurrency: 20 }
  );

  return dataPulls;
}

async function getMongodbConnection(mongoConnectionString) {
  return getMongoConnection(mongoConnectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

function prepareDataPulls(dataPulls, nameToDataPulls) {
  const warnings = [];

  _.each(dataPulls, (dataPull) => traverse(dataPull));

  function traverse(dataPull, path = new Set()) {
    const { name, dependsOn = [] } = dataPull;
    path.add(name);

    dataPull.processed = false;
    dataPull.dependsOnToProcess = _.clone(dependsOn);

    const { dependsOnToProcess } = dataPull;

    for (let i = dependsOnToProcess.length - 1; i >= 0; i--) {
      const dependsOnLookup = dependsOnToProcess[i];

      const { label: dependsOnDataPullName } = dependsOnLookup;
      const dependentDataPull = nameToDataPulls[dependsOnDataPullName];
      if (!dependentDataPull) {
        warnings.push(
          `DataPull '${name}' depends on non-existing dataPull '${dependsOnDataPullName}', this dependency will be removed`
        );
        dependsOnToProcess.splice(i, 1);
      } else {
        const { name: dependantDataPullName } = dependentDataPull;
        if (!path.has(dependantDataPullName)) {
          return traverse(dependentDataPull, new Set(path));
        }
        const loopPath = `${[...path].join('.')}.${dependantDataPullName}`;
        warnings.push(
          `Found loop for path: '${loopPath}'. '${dependantDataPullName}' will removed from dependencies of '${name}'`
        );
        delete dependsOnToProcess.splice(i, 1);
      }
    }
  }

  return { warnings };
}

function getDataPullsToPump(dataPulls, number) {
  if (number <= 0) {
    return [];
  }
  return dataPulls
    .filter((dp) => !dp.processed && _.isEmpty(dp.dependsOnToProcess))
    .sort((dp1, dp2) => dp2.priority - dp1.priority)
    .slice(0, number);
}

function markDataPullProcessed(dataPulls, finishedDpName) {
  _.each(dataPulls, (dp) => {
    const { name, dependsOnToProcess = [] } = dp;
    if (name === finishedDpName) {
      dp.processed = true;
      return;
    }
    _.remove(dependsOnToProcess, (lookup) => lookup.label === finishedDpName);
  });
}

function processMacros(oracleQuery, dataPull) {
  const funcs = {
    targetFields(separator = ',', exclude) {
      const schemaFields = _.get(dataPull, 'localMongodbDatasetRecord.scheme.fields', []);
      if (_.isEmpty(schemaFields)) {
        return '*';
      }
      const excludedFields = _.isString(exclude) ? exclude.split(',').map((f) => f.trim()) : [];
      return schemaFields.filter((f) => !excludedFields.includes(f)).join(separator);
    },
    now(format = 'YYYY-MM-DDTHH:mm:ss.sssZ') {
      return dateformat(new Date(), format);
    },
    lastPull(format = 'YYYY-MM-DDTHH:mm:ss.sssZ') {
      const lastPull = new Date(dataPull.lastPull) || new Date(1700, 0, 1);
      return dateformat(lastPull, format);
    },
    chunk(name) {
      return dataPull.dataPullChunks[name];
    },
    lastPullPosition() {
      return dataPull.lastPullPosition;
    },
  };

  try {
    return ejs.render(oracleQuery, funcs, { delimiter: EJS_DELIMITER });
  } catch (e) {
    logger.error(`Unable to process macros for dataPull with name '${dataPull.name}', oracleQuery '${oracleQuery}'`, e);
    throw e;
  }
}

function decryptOracleCredentials(oracleCredentialsRecord) {
  const algorithm = 'aes-256-ctr';
  const GLUE_STRING = '.';
  const { CREDENTIALS_PASSWORD } = process.env;

  function decrypt(data) {
    if (!CREDENTIALS_PASSWORD) {
      return data;
    }
    const [iv, value] = data.split(GLUE_STRING);
    const decipher = crypto.createDecipheriv(algorithm, CREDENTIALS_PASSWORD, Buffer.from(iv, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(value, 'hex')), decipher.final()]);

    return decrypted.toString();
  }

  const { login, password } = oracleCredentialsRecord;
  return { user: decrypt(login), password: decrypt(password) };
}

function getTransformationCodeFunc(transformationCode, copyInputToOutput) {
  if (!transformationCode) {
    return (oracleRecord) => oracleRecord;
  }

  const func = new Function(`_, ObjectID, dayjs`, transformationCode);
  const funcArgs = [_, ObjectID, dayjs];
  return (oracleRecord, dataPull) => {
    const context = {
      input: oracleRecord,
      dataPull,
    };
    if (copyInputToOutput) {
      context.output = context.input;
    }
    return func.apply(context, funcArgs);
  };
}

function _getChunkFunc(code) {
  const func = new Function(`_, ObjectID, dayjs`, code);
  const funcArgs = [_, ObjectID, dayjs];

  return (dataPull, responseRecordsCount) => {
    const context = { responseRecordsCount, dataPull };
    return func.apply(context, funcArgs);
  };
}
const getChunkFunc = mem((code) => _getChunkFunc(code));

async function processDataPull({ dataPull, processingContext }) {
  const { dataPullLogger, dataBridgeId, maxParallelPulls, dataPulls } = processingContext;
  const dataPullName = dataPull.name;

  dataPull.pullStart = new Date();
  dataPullLogger.info({
    type: 'dataPullStart',
    id: dataBridgeId,
    dataPull: dataPull,
    dataPullName,
    dataPullId: dataPull._id,
    timestamp: dataPull.pullStart,
  });

  processingContext.pullNamesInProgress.push(dataPullName);
  try {
    const totalDocumentsProcessed = await pumpDataPull({ dataPull: dataPull, processingContext });
    markDataPullProcessed(dataPulls, dataPullName);
    _.remove(processingContext.pullNamesInProgress, (name) => name === dataPullName);

    const nextNumberToPump = maxParallelPulls - processingContext.pullNamesInProgress.length;
    const dataPullsToPump = getDataPullsToPump(dataPulls, nextNumberToPump);

    dataPullLogger.info({
      type: 'dataPullFinish',
      id: dataBridgeId,
      dataPull: dataPull,
      dataPullName: dataPullName,
      dataPullId: dataPull._id,
      timestamp: dataPull.pullEnd,
      duration: dataPull.pullEnd - dataPull.pullStart,
      status: 'success',
      totalDocumentsProcessed,
      nextDataPullsToPump: dataPullsToPump.map((dp) => dp.name),
    });

    await Promise.map(dataPullsToPump, (dataPull) => processDataPull({ dataPull, processingContext }));
  } catch (e) {
    dataPullLogger.error({
      type: 'dataPullFinish',
      id: dataBridgeId,
      dataPull: dataPull,
      dataPullName: dataPullName,
      dataPullId: dataPull._id,
      timestamp: new Date(),
      status: 'failure',
      error: e.message,
    });
    process.exit(1);
  }
}

async function pumpDataPull({ dataPull, processingContext }) {
  const {
    name,
    oracleConnectionString: connectionString,
    oraclePrivilege: privilege,
    oracleQuery,
    oracleCredentialsRecord,
    mongodbUri,
    mongodbCollection,
    localMongodbDatasetRecord,
    transformationCode,
    copyInputToOutput,
    chunkedDataPull,
  } = dataPull;
  const { mongoDbConnection, dataPullLogger } = processingContext;
  const dataPullRunId = uuidv4();

  let sqlQuery;
  try {
    const dataPullMongodbConnection = localMongodbDatasetRecord
      ? mongoDbConnection
      : await getMongodbConnection(mongodbUri);
    const outCollection = _.get(localMongodbDatasetRecord, 'collectionName', mongodbCollection);
    const dbOutCollection = dataPullMongodbConnection.collection(outCollection);
    let mongoUniqueIndexesKeys;
    try {
      mongoUniqueIndexesKeys = await getUniqueIndexesKeys(dbOutCollection);
    } catch (e) {
      logger.error(`Unable to get unique indexes for mongo collection`, e);
      throw e;
    }

    const { user, password } = decryptOracleCredentials(oracleCredentialsRecord);
    const oracleConnectionOpts = { user, password, connectionString, privilege };
    const oracleConnection = await getOracleConnection(oracleConnectionOpts);
    const transformationCodeFunc = getTransformationCodeFunc(transformationCode, copyInputToOutput);

    const dbPullsCollection = dataPullMongodbConnection.collection(dataPullsCollectionName);
    await dbPullsCollection.updateOne(
      { _id: dataPull._id },
      { $set: { pullStart: dataPull.pullStart, pullEnd: null } }
    );

    let totalDocumentsProcessed = dataPull.pullEnd ? 0 : dataPull.totalDocumentsProcessed || 0;
    // mark with -1 to determine that pump is necessary
    let chunkDocsProcessed = -1;
    const processQueryAndPump = async function () {
      sqlQuery = processMacros(oracleQuery, dataPull);
      const start = new Date();
      chunkDocsProcessed = await pumpSqlQuery({
        oracleConnection,
        sqlQuery,
        dataPull,
        transformationCodeFunc,
        dbOutCollection,
        mongoUniqueIndexesKeys,
      });

      dataPullLogger.info({
        type: 'dataPullRequest',
        dataBridgeId: processingContext.dataBridgeId,
        dataPullId: dataPull._id,
        dataPullRunId,
        dataPullRequest: uuidv4(),
        duration: new Date() - start,
        chunkPositions: _.map(dataPull.dataPullChunks, (dpc) => dpc.position),
        request: sqlQuery,
        documentsRetrieved: chunkDocsProcessed,
      });
      totalDocumentsProcessed += chunkDocsProcessed;
      await dbPullsCollection.updateOne(
        { _id: dataPull._id },
        { $set: { totalDocumentsProcessed, dataPullChunks: dataPull.dataPullChunks } }
      );
    };

    if (chunkedDataPull) {
      _.each(dataPull.dataPullChunks, (dataPullChunk, chunkName) => {
        dataPullChunk.chunkName = chunkName;
        if (!dataPullChunk.position) {
          dataPullChunk.position = 0;
        }
      });

      await processChunks(_.values(dataPull.dataPullChunks));

      async function processChunks(dataPullChunks, index = 0) {
        const dataPullChunk = dataPullChunks[index];
        const allChunksPulledCheckFunc = getChunkFunc(dataPullChunk.allChunksPulledCheck);

        const nextIndex = index + 1;
        const hasNestedChunk = !!dataPullChunks[nextIndex];
        while (chunkDocsProcessed === -1 || !allChunksPulledCheckFunc(dataPull, chunkDocsProcessed)) {
          chunkDocsProcessed = -1;
          if (hasNestedChunk) {
            await processChunks(dataPullChunks, nextIndex);
          } else {
            await processQueryAndPump();
          }
          dataPullChunk.position++;
        }
        dataPullChunk.position = 0;
      }
    } else {
      await processQueryAndPump();
    }

    dataPull.pullEnd = new Date();
    dataPull.totalDocumentsProcessed = totalDocumentsProcessed;
    if (dataPull.customAfterPullCode) {
      const func = new Function(`_, ObjectID, dayjs`, dataPull.afterPullCode);
      func.apply({ dataPull }, [_, ObjectID, dayjs]);
    }
    await dbPullsCollection.updateOne({ _id: dataPull._id }, { $set: _.pick(dataPull, dataPullFields) });
    logger.info(`Finished dataPull '${name}'. Total documents processed: ${totalDocumentsProcessed}`);
    return totalDocumentsProcessed;
  } catch (e) {
    logger.error(`Error occurred while pumping data for dataPull with name '${name}' for sqlQuery: ${sqlQuery}`, e);
    throw e;
  }
}

async function pumpSqlQuery({
  oracleConnection,
  sqlQuery,
  dataPull,
  transformationCodeFunc,
  dbOutCollection,
  mongoUniqueIndexesKeys,
}) {
  let docsProcessed = 0;
  const { name } = dataPull;

  const stream = await oracleConnection.queryStream(sqlQuery, [], {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    ...oracleDefaultPerfOpts,
  });

  const upsertPromisesCountToWait = Number.parseInt(args.promisesCountToWait, 10) || 500;
  let upsertPromises = [];

  await new Promise((resolve, reject) => {
    stream
      .on('data', async (record) => {
        docsProcessed++;

        let transformedOracleRecord;
        try {
          transformedOracleRecord = transformationCodeFunc(record, dataPull);
        } catch (e) {
          const r = JSON.stringify(record);
          logger.error(
            `Error occurred while executing transformation code for record ${r}, dataPull '${name}'. It will be skipped.`
          );
          return;
        }

        upsertPromises.push(upsertDoc(dbOutCollection, transformedOracleRecord, mongoUniqueIndexesKeys));
        if (upsertPromises.length >= upsertPromisesCountToWait) {
          stream.pause();
          await Promise.all(upsertPromises);
          upsertPromises = [];
          logger.info(`DataPull '${name}' documents processed: ${docsProcessed}`);
          stream.resume();
        }
      })
      .on('end', () => resolve(Promise.all(upsertPromises)))
      .on('error', (e) => reject(e));
  });

  return docsProcessed;
}

// For two unique indexes with specs { a: 1 }, { b: 1, c: 1 } returns [ ["a"], ["b", "c"] ].
async function getUniqueIndexesKeys(dbCollection) {
  try {
    const indexes = await dbCollection.indexInformation({ full: true });
    const uniqueKeySpecs = indexes.filter((i) => i.unique).map((i) => i.key);
    return _.map(uniqueKeySpecs, (spec) => _.keys(spec));
  } catch (e) {
    if (e.codeName === 'NamespaceNotFound') {
      // collection and thus indexes does not exist
      return [];
    }
    throw e;
  }
}

async function getOracleConnection({ user, password, connectionString, privilege }) {
  try {
    return await oracledb.getConnection({
      user,
      password,
      connectionString,
      privilege: getPrivilege(privilege),
    });
  } catch (e) {
    logger.error(`Unable to connect to Oracle.`, e);
    throw e;
  }

  function getPrivilege(_privilege) {
    if (!_.isString(_privilege)) {
      return;
    }

    const privileges = ['SYSASM', 'SYSBACKUP', 'SYSDBA', 'SYSDG', 'SYSKM', 'SYSOPER', 'SYSPRELIM', 'SYSRAC'];
    const privilege = _privilege.toUpperCase();
    if (!privileges.includes(privilege)) {
      throw new Error(
        `Invalid privilege. Please check Privileged Connection Constants - https://oracle.github.io/node-oracledb/doc/api.html#oracledbconstantsprivilege`
      );
    }
    return oracledb[privilege];
  }
}

function getReplaceCondition(dbDoc, mongoUniqueIndexesKeys) {
  const orCondition = [];
  _.each(mongoUniqueIndexesKeys, (indexKeys) => {
    const indexCondition = {};
    _.each(indexKeys, (indexKey) => {
      const value = dbDoc[indexKey];
      indexCondition[indexKey] = _.isUndefined(value) ? null : value;
    });
    orCondition.push(indexCondition);
  });

  if (orCondition.length === 0) {
    return { ...dbDoc };
  }
  if (orCondition.length === 1) {
    return orCondition[0];
  }
  return { $or: orCondition };
}

async function upsertDoc(dbCollection, newDoc, mongoUniqueIndexesKeys) {
  const replaceCondition = getReplaceCondition(newDoc, mongoUniqueIndexesKeys);
  const dbDoc = await dbCollection.findOne(replaceCondition);

  const conditionForActualRecord = { deletedAt: new Date(0) };
  const newActualDoc = { ...newDoc, ...conditionForActualRecord };
  const now = new Date();
  if (!dbDoc) {
    const docToInsert = { ...newActualDoc, createdAt: now, updatedAt: now };
    try {
      return await dbCollection.insertOne(docToInsert);
    } catch (e) {
      logger.error(`Error occurred while inserting doc`, docToInsert, e);
      return;
    }
  }

  newActualDoc.createdAt = dbDoc.createdAt || now;
  const docValuePart = _.omit(dbDoc, ['_id', 'updatedAt']);
  const isEqualDocs = _.isEqual(docValuePart, newActualDoc);
  if (isEqualDocs) {
    return;
  }

  newActualDoc.updatedAt = now;
  const { _id } = dbDoc;
  try {
    return await dbCollection.replaceOne({ _id }, newActualDoc);
  } catch (e) {
    logger.error(`Error occurred while replacing _id ${_id} with doc`, newActualDoc, e);
  }
}

pumpData();
