
module.exports = function() {
  const m = {};

  m.init = appLib => {
    m.appLib = appLib;

    const drugEvents = appLib.db.model("drugEvents");
    const recalls = appLib.db.model("recalls");

    return Promise.all([
      drugEvents.collection.createIndex(
        {
          "rawData.patient.drug.openfda.rxcui": 1,
          "rawData.patient.drug.drugcharacterization": 1,
          "rawData.patient.patientsex": 1,
          "rawData.patient.patientonsetageunit": 1,
          "rawData.patient.patientonsetageInt": 1
        },
        { name: "ae_widget_ix" }
      ),
      // rawData.product_description value exceeds 1024 bytes giving 'key too large to index'
      // https://stackoverflow.com/questions/27792706/cannot-create-index-in-mongodb-key-too-large-to-index
      recalls.collection.createIndex({
        "rawData.status": 1 /*'rawData.product_description': 1*/
      })
    ]);
  };
  return m;
};
