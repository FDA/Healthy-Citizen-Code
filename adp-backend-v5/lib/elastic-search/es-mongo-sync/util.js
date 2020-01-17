const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec);

// More info: https://rwynn.github.io/monstache-site/start/#which-version-should-i-use
async function checkIsMonstacheCorrect() {
  const infoMessage =
    `It's used for sync Mongo and ElasticSearch (https://rwynn.github.io/monstache-site/start). ` +
    `It should be a binary of version 6 for Mongo 4 and ElasticSearch 7.`;

  try {
    const stdout = await exec('monstache -v');
    if (/^6\.\d+\.\d+/.test(stdout)) {
      return true;
    }
    throw new Error(`Please install Monstache.\n${infoMessage}`);
  } catch (e) {
    throw new Error(`Something went wrong while checking version of Monstache, please make sure Monstache is installed.\n
        ${infoMessage}. ${e.stack}`);
  }
}

module.exports = {
  checkIsMonstacheCorrect,
};
