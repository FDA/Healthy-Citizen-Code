const _ = require('lodash');

module.exports = function() {
  const m = {};

  m.init = appLib => {
    m.appLib = appLib;
    const aesOpenfdaDrugs = appLib.db.model('aesOpenfdaDrugs');
    const recallsOpenfdaDrugs = appLib.db.model('recallsOpenfdaDrugs');
    const recallsRes = appLib.db.model('recallsRes');
    const drugsRxnormConso = appLib.db.model('drugsRxnormConso');

    return Promise.all([
      aesOpenfdaDrugs.collection.createIndex(
        {
          'drugs.openfda.rxCuis.rxCui': 1,
          'drugs.drugCharacterization': 1,
          patientSex: 1,
          patientOnSetAgeUnit: 1,
          patientOnSetAge: 1,
        },
        { name: 'ae_ix' }
      ),
      recallsOpenfdaDrugs.collection.createIndex({
        'rxCuis.rxCui': 1,
        centerRecommendedDepth: 1,
        status: 1,
      }),
      recallsRes.collection.createIndex({
        'rxCuis.rxCui': 1,
        centerRecommendedDepth: 1,
        status: 1,
      }),
      drugsRxnormConso.collection.createIndex({ rxcui: 1 }),
    ]);
  };
  return m;
};
