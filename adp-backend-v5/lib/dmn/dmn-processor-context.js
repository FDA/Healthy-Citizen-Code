// since bull jobs must store only valid JSON in job.data, we need a way to get complex contexts
// for example by passing keys inside job processors
// https://github.com/OptimalBits/bull/issues/795

const contextStorage = new Map();
let commonContext = {};

const m = {
  setCommonContext(obj) {
    commonContext = obj;
  },
  set(key, obj) {
    return contextStorage.set(key, obj);
  },
  get(key) {
    return {
      ...contextStorage.get(key),
      ...commonContext,
    };
  },
  delete(key) {
    return contextStorage.delete(key);
  },
};

module.exports = m;
