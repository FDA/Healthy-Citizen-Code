module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    const modelName = 'userPreferences';
    const {
      addMutation,
      resolvers: { addUpsertOne },
    } = appLib.graphQl;

    const { resolver: upsertOneResolver } = addUpsertOne({ modelName });

    addMutation(`${modelName}UpsertOne`, upsertOneResolver);
  };

  return m;
};
