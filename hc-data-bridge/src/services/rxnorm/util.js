const { ObjectId } = require('mongodb');
const _ = require('lodash');

async function loadRxcuiData(dbCon, rxnormConsoColName) {
  const consoDocs = await dbCon
    .collection(rxnormConsoColName)
    .find({ sab: 'RXNORM' }, { projection: { rxcui: 1, tty: 1 } })
    .toArray();
  return _.reduce(
    consoDocs,
    (res, { rxcui, tty }) => {
      const rxCuiElem = { rxCui: rxcui, tty, _id: ObjectId() };

      const rxcuiData = _.get(res, rxcui);
      if (!rxcuiData) {
        res[rxcui] = { rxCuis: [rxCuiElem] };
      } else {
        const { rxCuis } = rxcuiData;
        const sameRxcuiTtyElem = rxCuis.find(el => el.tty === rxCuiElem.tty && el.rxCui === rxCuiElem.rxCui);
        !sameRxcuiTtyElem && rxCuis.push(rxCuiElem);
      }
      return res;
    },
    {}
  );
}

module.exports = {
  loadRxcuiData,
};
