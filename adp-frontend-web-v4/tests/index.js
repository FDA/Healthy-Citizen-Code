var config = require('./config');
var utils = require('./utils/index');

exports.config = {
  framework: 'jasmine',
  seleniumAddress: 'http://0.0.0.0:4444/wd/hub',
  specs: [
    'specs/**.spec.js'
    // 'specs/auth.spec.js',
    // 'specs/dashboard.spec.js',
    // 'specs/menu.spec.js',
    // 'specs/pages.spec.js',
    // 'specs/logout.spec.js'
  ],

  onPrepare: utils.logout,
  onComplete: function () {
    utils.logout();
    utils.removeUser(browser.close);
  }
}
