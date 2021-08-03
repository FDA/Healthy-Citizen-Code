const crypto = require('crypto');
const nodeObjectHash = require('node-object-hash');

const nodeObjectHasher = nodeObjectHash({ sort: true, coerce: false });

/**
 * This hashing function is more effective than getHashObjectFunction
 * However some old processors not supporting instructions such as AVX, SSE4.2 might throw "invalid instruction" error
 * This should be fixed with running "npm install --build-from-source" but it's not guaranteed (due to docker or whatever issues)
 */
function getFarmhashFunction(farmhashFunctionName) {
  const farmhash = require('farmhash');
  const farmhashFunction = farmhash[farmhashFunctionName] || farmhash.hash64;
  return (args) => {
    const argsString = nodeObjectHasher.sort(args);
    return farmhashFunction(argsString);
  };
}

// This function is less effective than getFarmhashFunction, but works everywhere since it uses native nodejs 'crypto' module.
function getNodeObjectHashFunction() {
  return (args) => nodeObjectHasher.hash(args);
}

function getHashObjectFunction(useFarmhash) {
  if (useFarmhash) {
    return getFarmhashFunction();
  }
  return getNodeObjectHashFunction();
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

module.exports = {
  getHashObjectFunction,
  md5,
};
