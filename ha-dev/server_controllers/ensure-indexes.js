const _ = require('lodash');

module.exports = function() {
  const m = {};

  m.init = appLib => {
    m.appLib = appLib;
    const aesOpenfdaDrugs = appLib.db.collection('aesOpenfdaDrugs');
    const recallsOpenfdaDrugs = appLib.db.collection('recallsOpenfdaDrugs');
    const recallsRes = appLib.db.collection('recallsRes');
    const drugsRxnormConso = appLib.db.collection('drugsRxnormConso');

    return Promise.all([
      aesOpenfdaDrugs.createIndex(
        {
          'drugs.openfda.rxCuis.rxCui': 1,
          'drugs.drugCharacterization': 1,
          patientSex: 1,
          patientOnSetAgeUnit: 1,
          patientOnSetAge: 1,
        },
        { name: 'ae_ix' }
      ),
      recallsOpenfdaDrugs.createIndex({
        'rxCuis.rxCui': 1,
        centerRecommendedDepth: 1,
        status: 1,
      }),
      recallsRes.createIndex({
        'rxCuis.rxCui': 1,
        centerRecommendedDepth: 1,
        status: 1,
      }),
      drugsRxnormConso.createIndex({ rxcui: 1 }),
    ]);
  };
  return m;
};
