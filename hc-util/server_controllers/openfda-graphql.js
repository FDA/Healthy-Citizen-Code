const _ = require('lodash');

module.exports = function () {
  let m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    const {schemaComposer, addQuery, addDefaultTypesAndResolversForModel} = m.appLib.graphQl;
    const models = ['drugEvents', 'medicationMaster', 'medicationsopenfda', 'rxnsats', 'recalls'];
    _.forEach(models, (modelName) => {
      addDefaultTypesAndResolversForModel(modelName);
      const tc = schemaComposer.getTC(modelName);
      addQuery(modelName, tc.getResolver('pagination'));
    });

    const drugEvents = appLib.db.model('drugEvents');
    const recalls = appLib.db.model('recalls');

    return Promise.all([
      drugEvents.collection.ensureIndex({
        'rawData.patient.drug.openfda.rxcui': 1,
        'rawData.patient.drug.drugcharacterization': 1,
        'rawData.patient.patientsex': 1,
        'rawData.patient.patientonsetageunit': 1,
        'rawData.patient.patientonsetageInt': 1,
      }, {name: 'ae_widget_ix'}),
      // rawData.product_description value exceeds 1024 bytes giving 'key too large to index'
      // https://stackoverflow.com/questions/27792706/cannot-create-index-in-mongodb-key-too-large-to-index
      recalls.collection.ensureIndex({'rawData.status': 1, /*'rawData.product_description': 1*/}),
    ]);
  };
  return m;
};
