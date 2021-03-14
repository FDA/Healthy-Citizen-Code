const _ = require('lodash');
const nodePath = require('path');
const should = require('should');
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
    should(this.appLib.db).not.be.undefined();
    should(this.appLib.appModel.models.users).not.be.undefined();
    assert(_.keys(_.get(this.appLib.appModel, 'metaschema')).length > 0);
    assert(_.keys(_.get(this.appLib.appModel, 'interface')).length > 0);
    assert(_.keys(_.get(this.appLib.appModel, 'interface.mainMenu')).length > 0);
  });
});
