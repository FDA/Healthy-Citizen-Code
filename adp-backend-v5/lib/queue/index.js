const Queue = require('bull');
const _ = require('lodash');
const Redis = require('ioredis');

module.exports = options => {
  const m = {};
  const { redisUrl } = options;

  if (redisUrl) {
    m.redisInstance = new Redis(redisUrl);
  }

  // m.appQueue = new Queue('appQueue', options.redisUrl);

  // Create with connection reuse: https://github.com/OptimalBits/bull/blob/master/PATTERNS.md#reusing-redis-connections
  m.createQueue = (...args) => {
    const lastArg = args[args.length - 1];
    const isOptionsArg = _.isString(lastArg);
    if (isOptionsArg) {
      lastArg.createClient = function() {
        return m.redisInstance;
      };
    }
    return new Queue(...args);
  };

  return m;
};
