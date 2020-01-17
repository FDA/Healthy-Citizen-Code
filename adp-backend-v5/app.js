require('dotenv').load({ path: '.env' });
const log = require('log4js').getLogger('app');
const appLib = require('./lib/app')(); // redefined in tests

appLib
  .setup()
  .then(app => {
    app.start();
  })
  .catch(e => {
    log.error('APP001', e.stack);
    process.exit(1);
  });
