const Mocha = require('mocha');
const glob = require('glob');
const _ = require('lodash');
const path = require('path');
const appRoot = require('app-root-path').path;
const dotenv = require('dotenv');
const { prepareEnv, getSchemaNestedPaths } = require('../../lib/util/env');

// specific tests can import modules by absolute path
process.env.APP_LIB_MODULE_PATH = path.resolve(appRoot, 'lib/app');
process.env.APP_DOTENV_FILE_PATH = path.resolve(appRoot, '.env');
dotenv.load({ path: process.env.APP_DOTENV_FILE_PATH });
prepareEnv(appRoot);

const mocha = new Mocha({
  reporter: 'spec',
  timeout: 15000,
});

const files = _.flatten(getSchemaNestedPaths('test/**/*.js').map(pattern => glob.sync(pattern)));
files.forEach(file => mocha.addFile(file));

// Run the tests.
mocha.run(failures => {
  const exitCode = failures ? -1 : 0; // exit with non-zero status if there were failures
  process.exit(exitCode);
});
