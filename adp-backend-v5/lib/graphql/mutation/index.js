const { schemaComposer } = require('graphql-compose');

const deleteOutputType = `type DeleteType {
      deletedCount: Int
    }`;

// function getInputTypeWithAllFieldsOptional(type) {
//   const optionalType = type.getITC();
//   optionalType.makeOptional(optionalType.getFieldNames());
//   return optionalType;
// }

function addCreateOneResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);

  type.addResolver({
    kind: 'mutation',
    name: 'createOne',
    args: {
      record: type.getITC(),
    },
    type,
    resolve: ({ args }) => db.create(args.record),
  });
}

function addDeleteOneResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);

  type.addResolver({
    kind: 'mutation',
    name: 'deleteOne',
    args: {
      filter: type.getITC(),
    },
    type: deleteOutputType,
    resolve: ({ args }) => db.deleteOne(args.filter).then(result => ({ deletedCount: result.n })),
  });
}

function addDeleteManyResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);
  type.addResolver({
    kind: 'mutation',
    name: 'deleteMany',
    args: {
      filter: type.getITC(),
    },
    type: deleteOutputType,
    resolve: ({ args }) => db.deleteMany(args.filter).then(result => ({ deletedCount: result.n })),
  });
}

function addUpsertOneResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);

  type.addResolver({
    kind: 'mutation',
    name: 'upsertOne',
    args: {
      record: type.getITC(),
      filter: type.getITC(),
    },
    type,
    resolve: ({ args }) =>
      db
        .findOneAndUpdate(args.filter, args.record, { upsert: true, new: true })
        .then(result => result.toObject()),
  });
}

function addUpdateOneResolver(modelName, db) {
  const type = schemaComposer.getTC(modelName);
  type.addResolver({
    kind: 'mutation',
    name: 'updateOne',
    args: {
      record: type.getITC(),
      filter: type.getITC(),
    },
    type,
    resolve: ({ args }) =>
      db
        .findOneAndUpdate(args.filter, args.record, { new: true })
        .then(result => result.toObject()),
  });
}

module.exports = {
  addCreateOneResolver,
  addUpsertOneResolver,
  addUpdateOneResolver,
  addDeleteOneResolver,
  addDeleteManyResolver,
};
