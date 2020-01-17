const _ = require('lodash');

const convertValuesToObject = (values, headers) => {
  const result = {};
  values.forEach((value, index) => {
    const header = headers[index];
    if (header) {
      result[header] = value;
    }
  });
  return result;
};

// doc: https://www.nlm.nih.gov/research/umls/rxnorm/docs/2017/rxnorm_doco_full_2017-2.html
const rxnsatHeaders = [
  'RXCUI',
  'LUI',
  'SUI',
  'RXAUI',
  'STYPE',
  'CODE',
  'ATUI',
  'SATUI',
  'ATN',
  'SAB',
  'ATV',
  'SUPPRESS',
  'CVF',
];
const convertRxnsatToObject = values => convertValuesToObject(values, rxnsatHeaders);

const rxnconsoHeaders = [
  'RXCUI',
  'LAT',
  'TS',
  'LUI',
  'STT',
  'SUI',
  'ISPREF',
  'RXAUI',
  'SAUI',
  'SCUI',
  'SDUI',
  'SAB',
  'TTY',
  'CODE',
  'STR',
  'SRL',
  'SUPPRESS',
  'CVF',
];
const convertRxnconsoToObject = values => convertValuesToObject(values, rxnconsoHeaders);

const rxnrelHeaders = [
  'RXCUI1',
  'RXAUI1',
  'STYPE1',
  'REL',
  'RXCUI2',
  'RXAUI2',
  'STYPE2',
  'RELA',
  'RUI',
  'SRUI',
  'SAB',
  'SL',
  'DIR',
  'RG',
  'SUPPRESS',
  'CVF',
];
const convertRxnrelToObject = values => convertValuesToObject(values, rxnrelHeaders);

module.exports = {
  convertRxnsatToObject,
  convertRxnconsoToObject,
  convertRxnrelToObject,
};
