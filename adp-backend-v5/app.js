(async () => {
  try {
    require('dotenv').load({ path: '.env' });
    const appLib = require('./lib/app')();
    await appLib.setup();
    appLib.start();
  } catch (e) {
    console.error('APP001', e.stack);
    process.exit(1);
  }
})();
