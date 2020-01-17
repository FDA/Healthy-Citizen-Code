const args = require('optimist').argv;
const _ = require('lodash');
const { loadRxcuiData } = require('../../../rxnorm/util');
const { mongoConnect } = require('../../../util/mongo');

async function getRxcuiData(rxnormConsoColName) {
  const dbCon = await mongoConnect(args.mongoUrl);
  const rxcuiData = await loadRxcuiData(dbCon, rxnormConsoColName);
  if (_.isEmpty(rxcuiData)) {
    console.warn(`No rxcui data received for transformer context 'getRxcuiData' from collection '${rxnormConsoColName}'`);
  }
  return rxcuiData;
}

module.exports = {
  getRxcuiData,
};
