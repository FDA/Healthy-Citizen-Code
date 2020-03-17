module.exports = function() {
  const m = {};

  m.init = appLib => {
    m.appLib = appLib;

    const {
      graphqlCompose: { schemaComposer },
      removeDefaultQueries,
      removeDefaultMutations,
      addMutation,
      addQuery,
      resolvers: {
        addFindManyByFilterType,
        addUpsertOne,
      },
    } = m.appLib.graphQl;
    const modelName = 'userPreferences';
    removeDefaultQueries(modelName);
    removeDefaultMutations(modelName);

    const udidFilter = schemaComposer.createInputTC({
      name: 'udidFilter',
      fields: {
        udid: 'String!',
      },
    }).getTypeNonNull();

    // custom upsert
    const { resolver: upsertOneResolver } = addUpsertOne({ modelName, filterType: udidFilter});
    addMutation(`${modelName}UpsertOne`, upsertOneResolver);

    // custom findMany
    const { resolver: findManyByFilterTypeResolver } = addFindManyByFilterType({ modelName, filterType: udidFilter});
    addQuery(modelName, findManyByFilterTypeResolver);
  };

  return m;
};
