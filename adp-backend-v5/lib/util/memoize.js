const mem = require('mem');

// Cache key "(args) => args.join(',')" is faster than any hashing algorithm and appropriate in terms of uniqueness
const getFunction = mem((...args) => new Function(...args), { cacheKey: (args) => args.join(',') });

module.exports = { getFunction };
