const _ = require('lodash');
const objectHash = require('object-hash');
const recalls = require('/home/andy/Downloads/device-recall-0001-of-0001.json').results;
const enforcements = require('/home/andy/Downloads/device-enforcement-0001-of-0001.json').results;

function traverse (arr, upsertKeyF) {
  const map = {};
  _.each(arr, (elem, index) => {
    const key = upsertKeyF(elem);
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(index);
  });
  return map;
}

function getDupes (map, srcArray) {
  return _.reduce(map, (res, dupeIndexes, key) => {
    if (dupeIndexes.length > 1) {
      res[key] = dupeIndexes.map(index => srcArray[index]);
    }
    return res;
  }, {});
}

const uniqResEventNumber = _.uniq(recalls.map(r => r.res_event_number));
// const uniqProductResNumber = _.uniq(recalls.map(r => r.product_res_number));
// const combo = _.uniq(recalls.map(r => r.res_event_number + r.product_res_number));
// const combo2 = _.uniq(recalls.map(r => r.res_event_number + r.firm_fei_number + r.product_res_number));
// const combo3 = _.uniq(recalls.map(r => r.res_event_number + r.product_code + r.firm_fei_number + r.product_res_number));
// const combo4 = traverse(recalls,r => r.res_event_number + r.product_code + r.firm_fei_number + r.product_res_number + r.event_date_terminated);
// const combo5 = traverse(recalls, r => r.res_event_number + r.product_code + r.firm_fei_number + r.product_res_number + r.event_date_terminated + r.k_numbers);
// const combo6 = traverse(recalls, r => r.res_event_number + r.product_code + r.firm_fei_number + r.product_res_number + r.event_date_terminated + r.k_numbers + r.root_cause_description);
const combo7 = traverse(recalls, r => r.res_event_number + r.product_code + r.firm_fei_number + r.product_res_number + r.event_date_terminated + r.k_numbers + r.root_cause_description + r.other_submission_description);
// const sha1 = traverse(recalls,r => objectHash.sha1(r));

console.log(uniqResEventNumber.length);
// console.log(uniqProductResNumber.length);
// console.log(combo.length);
// console.log(combo2.length);
// console.log(combo3.length);
// console.log(JSON.stringify(getDupes(combo5, recalls), null, 2));
// console.log('========================================');
// console.log(_.keys(sha1).length);
// console.log(JSON.stringify(getDupes(sha1, recalls), null, 2));
// console.log(_.keys(combo5).length);
// console.log(JSON.stringify(getDupes(combo5, recalls), null, 2));
console.log(_.keys(combo7).length);
console.log(JSON.stringify(getDupes(combo7, recalls), null, 2));
