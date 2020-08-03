// since bull jobs must store only valid JSON in job.data, we need a way to get complex contexts
// for example by passing keys inside job processors
// https://github.com/OptimalBits/bull/issues/795

const contextStorage = new Map();

function getOrCreateContext(contextName) {
  const context = contextStorage.get(contextName);
  if (context) {
    return context;
  }

  let commonContext = {};

  const newContext = {
    getCommonContext() {
      return commonContext;
    },
    setCommonContext(obj) {
      commonContext = obj;
    },
    set(key, obj) {
      contextStorage.get(contextName)[key] = obj;
    },
    get(key) {
      return {
        ...contextStorage.get(contextName)[key],
        ...commonContext,
      };
    },
    delete(key) {
      delete contextStorage.get(contextName)[key];
    },
  };
  contextStorage.set(contextName, newContext);

  return newContext;
}

module.exports = {
  getOrCreateContext,
};
