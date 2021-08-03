const { commandsCollectionName } = require('../../lib/queue/background-jobs/external-commands');

const now = new Date();
const upsertTrinoSystemDoc = {
  name: 'Upsert Trino Schema system command',
  system: true,
  type: 'backendCommand',
  backendCommand: `return appLib.trino.upsertAllTrinoSchemas();`,
  deletedAt: new Date(0),
  createdAt: now,
  updatedAt: now,
};

exports.up = function (db) {
  return db
    .collection(commandsCollectionName)
    .updateOne({ name: upsertTrinoSystemDoc.name }, { $set: upsertTrinoSystemDoc }, { upsert: true });
};

exports.down = function (db) {
  return db.collection(commandsCollectionName).deleteOne({ name: upsertTrinoSystemDoc.name });
};
