module.exports = function () {
  let m = {};

  m.init = (appLib) => {
    m.appLib = appLib;

    const { schemaComposer, addQuery, addMutation, addDefaultTypesAndResolversForModel} = m.appLib.graphQl;
    const modelName = 'userPreferences';
    addDefaultTypesAndResolversForModel(modelName);
    const tc = schemaComposer.getTC(modelName);
    // custom query
    addQuery(modelName, tc.getResolver('pagination'));
    addMutation(`${modelName}UpsertOne`, tc.getResolver('upsertOne'));
  };

  return m;
};
