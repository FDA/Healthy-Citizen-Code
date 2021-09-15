const path = require('path');
const _ = require('lodash');
const commandLineArgs = require('command-line-args');
const { md5 } = require('./util/hash');
const { getConfigFromEnv } = require('../config/util');

const optionDefinitions = [
  { name: 'key', alias: 'k', type: String }, // option to override CREDENTIALS_PASSWORD from .env. PLS NOTE: we use md5(key)
  { name: 'hash', type: String, defaultOption: true }, // required string as stored in db
];

(() => {
  try {
    run();
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();

function run() {
  const args = commandLineArgs(optionDefinitions);

  if (!args.hash) {
    console.error('### Encrypted value is required as parameter');
    process.exit(1);
  }

  let password = args.key && md5(args.key);

  if (!password) {
    require('dotenv').load({ path: path.resolve(`${__dirname}/../.env`) });
    password = _.get(getConfigFromEnv(), 'config.CREDENTIALS_PASSWORD');
  }

  const crypto = require('./util/crypto')({ CREDENTIALS_PASSWORD: password });

  console.log('#### Decrypted value is', crypto.decrypt(args.hash));
}
