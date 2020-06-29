const glob = require('glob');

function globSyncAsciiOrder(pattern, options) {
  const result = glob.sync(pattern, options);
  return result.sort();
}

module.exports = {
  globSyncAsciiOrder,
};
