const args = require('optimist').argv;
const _ = require('lodash');
const Promise = require('bluebird');
const oracledb = require('oracledb');
const { getMongoConnection } = require('../util/mongo');

const {
  oracleUser,
  oraclePassword,
  oracleConnectionString,
  oraclePrivilege,
  oracleSql,
  mongoConnectionString,
  mongoCollection,
  fetchArraySize,
  prefetchRows,
  promisesCountToWait,
} = args;

let oracleConnection;
let mongoConnection;

process.on('SIGINT', closeConnections);
process.on('SIGTERM', closeConnections);

async function closeConnections() {
  if (oracleConnection) {
    try {
      await oracleConnection.close();
      console.log(`Closed Oracle connection`);
    } catch (err) {
      console.error(`Unable to close Oracle connection`, err);
    }
  }

  if (mongoConnection) {
    try {
      await mongoConnection.close();
      console.log(`Closed Mongo connection`);
    } catch (err) {
      console.error(`Unable to close Mongo connection`, err);
    }
  }
}

async function pumpData() {
  await getConnections();

  let mongoUniqueIndexesKeys;
  try {
    mongoUniqueIndexesKeys = await getUniqueIndexesKeys();
  } catch (e) {
    console.error(`Unable to get unique indexes for mongo collection`, e);
    process.exit(1);
  }

  let docsProcessed = 0;
  try {
    const perfOptions = {
      prefetchRows: Number.parseInt(prefetchRows, 10) || 1000,
      fetchArraySize: Number.parseInt(fetchArraySize, 10) || 1000,
    };
    const stream = await oracleConnection.queryStream(oracleSql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...perfOptions,
    });

    const upsertPromisesCountToWait = Number.parseInt(promisesCountToWait, 10) || 500;
    let upsertPromises = [];

    await new Promise((resolve, reject) => {
      stream
        .on('data', async (row) => {
          upsertPromises.push(upsertDoc(row, mongoUniqueIndexesKeys));
          if (upsertPromises.length >= upsertPromisesCountToWait) {
            stream.pause();
            await Promise.all(upsertPromises);
            upsertPromises = [];
            docsProcessed += upsertPromisesCountToWait;
            console.log(`Documents processed: ${docsProcessed}`);
            stream.resume();
          }
        })
        .on('end', () => resolve(Promise.all(upsertPromises)))
        .on('error', (e) => reject(e));
    });
  } catch (e) {
    console.error(`Error occurred while pumping data`, e);
    process.exit(1);
  }

  console.info(`Finished! Total documents processed: ${docsProcessed}`);
  process.exit(0);
}

// For two unique indexes with specs { a: 1 }, { b: 1, c: 1 } returns [ ["a"], ["b", "c"] ].
async function getUniqueIndexesKeys() {
  try {
    const indexes = await mongoConnection.collection(mongoCollection).indexInformation({ full: true });
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

async function getConnections() {
  try {
    oracleConnection = await oracledb.getConnection({
      user: oracleUser,
      password: oraclePassword,
      connectionString: oracleConnectionString,
      privilege: getPrivilege(oraclePrivilege),
    });
  } catch (e) {
    console.error(`Unable to connect to Oracle.`, e);
    process.exit(1);
  }

  try {
    mongoConnection = await getMongoConnection(mongoConnectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (e) {
    console.error(`Unable to connect to Mongo.`, e);
    process.exit(1);
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
    const indexCondition = _.pick(dbDoc, indexKeys);
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

async function upsertDoc(newDoc, mongoUniqueIndexesKeys) {
  const collection = mongoConnection.collection(mongoCollection);

  const replaceCondition = getReplaceCondition(newDoc, mongoUniqueIndexesKeys);
  const dbDoc = await collection.findOne(replaceCondition);

  const conditionForActualRecord = { deletedAt: new Date(0) };
  const newActualDoc = { ...newDoc, ...conditionForActualRecord };
  const now = new Date();
  if (!dbDoc) {
    const docToInsert = { ...newActualDoc, createdAt: now, updatedAt: now };
    try {
      return collection.insertOne(docToInsert);
    } catch (e) {
      console.error(`Error occurred while inserting doc`, docToInsert, e);
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
    return collection.replaceOne({ _id }, newActualDoc);
  } catch (e) {
    console.error(`Error occurred while replacing _id ${_id} with doc`, newActualDoc, e);
  }
}

pumpData();
