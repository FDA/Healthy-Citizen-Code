const _ = require('lodash');
const nodePath = require('path');
require('should');
const assert = require('assert');

describe('App Model Routes', function () {
  before(function () {
    const envPath = nodePath.resolve(__dirname, '../../../.env');
    require('dotenv').load({ path: envPath });
    this.appLib = require('../../../lib/app')();
    return this.appLib.setup();
  });

  after(function () {
    return this.appLib.shutdown();
  });

  it('Generates core models', function () {
    this.appLib.db.readyState.should.equal(1);
    assert(_.indexOf(this.appLib.db.modelNames(), 'users') >= 0);
    assert(_.keys(_.get(this.appLib.appModel, 'metaschema').length > 0));
    assert(_.keys(_.get(this.appLib.appModel, 'interface').length > 0));
    assert(_.keys(_.get(this.appLib.appModel, 'interface.mainMenu').length > 0));
  });
});
