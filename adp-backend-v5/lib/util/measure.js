const _ = require('lodash');

function getDuration(start) {
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1000000;
  return _.round(durationMs, 1);
}

const measureFuncDuration = function (orig) {
  return function (...args) {
    const timestamp = new Date();
    const start = process.hrtime.bigint();

    const result = orig.apply(this, args);

    const isPromise = _.get(result, 'then');
    if (isPromise) {
      return result.then((res) => ({ result: res, timestamp, duration: getDuration(start) }));
    }
    return { result, timestamp, duration: getDuration(start) };
  };
};

module.exports = {
  measureFuncDuration,
};
