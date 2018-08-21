// test public folder
// test model validation (try to feed incorrect model spec)
// TODO: test validator on various strings
const _ = require('lodash');
const assert = require('assert');

describe('V3 HC Schema Routes', () => {
  before(function () {
    this.appLib = require(process.env.APP_LIB_MODULE_PATH)();
    return this.appLib.setup();
  });

  after(function () {
    return this.appLib.shutdown();
  });

  it('Generates HC core models', function (done) {
    assert(this.appLib.db.readyState === 1);
    const models = this.appLib.db.modelNames();
    assert(models.includes('users'));
    assert(models.includes('phis'));
    assert(models.includes('piis'));
    assert(models.includes('connections'));
    assert(_.keys(_.get(this.appLib.appModel, 'metaschema').length > 0));
    assert(_.keys(_.get(this.appLib.appModel, 'interface').length > 0));
    assert(_.keys(_.get(this.appLib.appModel, 'interface.mainMenu').length > 0));
    done();
  });
});
