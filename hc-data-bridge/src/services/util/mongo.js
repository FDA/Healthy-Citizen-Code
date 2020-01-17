const Promise = require('bluebird');
const _ = require('lodash');
const connect = Promise.promisify(require('mongodb').MongoClient.connect);

const SEC = 1000;
const WEEK = 7 * 24 * 60 * 60 * SEC;

const connectionOptions = {
  reconnectTries: 60,
  reconnectInterval: SEC,
  connectTimeoutMS: WEEK,
  socketTimeoutMS: WEEK,
  ignoreUndefined: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function mongoConnect(url) {
  return (await connect(
    url,
    connectionOptions
  )).db();
}

async function setUpdateAtIfRecordChanged(collection, updateFunc, condition, update, options = {}) {
  const now = new Date();
  const res = await collection[updateFunc](condition, update, options);
  if (+_.get(res, 'modifiedCount') > 0) {
    await collection[updateFunc](condition, { $set: { updatedAt: now } });
  }
  return res;
}

const conditionForActualRecord = { deletedAt: new Date(0) };

function insertOrReplaceNewDoc(dbDoc, newDoc, collection) {
  const now = new Date();
  const newActualDoc = { ...newDoc, ...conditionForActualRecord };
  if (!dbDoc) {
    const docToInsert = { ...newActualDoc, createdAt: now, updatedAt: now };
    return collection.insertOne(docToInsert).then(({ insertedId }) => ({ ...docToInsert, _id: insertedId }));
  }

  newActualDoc.createdAt = dbDoc.createdAt || now;
  const isEqualDocs = _.isEqual(_.omit(dbDoc, ['_id', 'updatedAt']), newActualDoc);
  if (isEqualDocs) {
    return Promise.resolve(dbDoc);
  }

  newActualDoc.updatedAt = now;
  const { _id } = dbDoc;
  return collection.replaceOne({ _id }, newActualDoc).then(() => ({ ...newActualDoc, _id }));
}

async function insertOrReplaceDocByCondition(newDoc, collection, condition) {
  return collection.findOne(condition).then(dbDoc => insertOrReplaceNewDoc(dbDoc, newDoc, collection));
}

module.exports = {
  mongoConnect,
  setUpdateAtIfRecordChanged,
  insertOrReplaceNewDoc,
  insertOrReplaceDocByCondition,
  conditionForActualRecord,
};
