const _ = require('lodash');

exports.camelCaseObjectKeys = obj =>
  _.reduce(
    obj,
    (res, val, key) => {
      res[_.camelCase(key)] = val;
      return res;
    },
    {}
  );

exports.camelCaseKeysDeep = function mapValuesDeep(obj, handler = exports.camelCaseObjectKeys) {
  if (_.isArray(obj)) {
    return obj.map(innerObj => mapValuesDeep(innerObj, handler));
  }
  if (_.isObject(obj)) {
    return _.reduce(
      obj,
      (res, val, key) => {
        res[_.camelCase(key)] = mapValuesDeep(val, handler);
        return res;
      },
      {}
    );
  }
  return obj;
};

// const test = exports.camelCaseKeysDeep([
//   { a_a: { b_b: { c_c: 1, z_z: [1, [{ LllL: 2 }, { q: 1 }], 3], a__w: [{ LllL: 2 }, { q: 1 }] }, package_ndc: '123' } },
//   { a_a: { b_b: { c_c: 1 }, package_ndc: '123' } },
// ]);
// console.log(test);
