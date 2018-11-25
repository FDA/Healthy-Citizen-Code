const Mocha = require('mocha');
const glob = require('glob');
const path = require('path');
const appRoot = require('app-root-path').path;

// specific tests can import modules by absolute path
process.env.APP_LIB_MODULE_PATH = path.resolve(appRoot, 'lib/app');
process.env.APP_DOTENV_FILE_PATH = path.resolve(appRoot, '.env');
require('dotenv').load({ path: process.env.APP_DOTENV_FILE_PATH });

process.env.LOG4JS_CONFIG = path.resolve(appRoot, process.env.LOG4JS_CONFIG);
process.env.APP_MODEL_DIR = path.resolve(appRoot, process.env.APP_MODEL_DIR);

const mocha = new Mocha({
  reporter: 'spec',
  timeout: 7000,
});
const files = glob.sync(`${process.env.APP_MODEL_DIR}/test/**/*.js`);
files.forEach(file => mocha.addFile(file));

// Run the tests.
mocha.run(failures => {
  const exitCode = failures ? -1 : 0; // exit with non-zero status if there were failures
  process.exit(exitCode);
});
