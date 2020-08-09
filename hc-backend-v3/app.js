global.appModelHelpers = {};
const log = require('log4js').getLogger('app');
let appLib = require('./lib/app')(); // redefined in tests
appLib.setup()
    .then( (app) => {app.start()})
    .catch( e => {
        log.error("APP001", e);
        process.exit(1);
    });
