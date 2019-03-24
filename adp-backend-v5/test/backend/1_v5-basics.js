require('should');
const assert = require('assert');
const _ = require('lodash');
const mongoose = require('mongoose');
const reqlib = require('app-root-path').require;

const { prepareEnv, getMongoConnection } = reqlib('test/backend/test-util');

// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
describe('V5 Backend Basics', () => {
  before(function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup();
  });

  after(function() {
    return this.appLib
      .shutdown()
      .then(() => getMongoConnection())
      .then(db => db.dropDatabase().then(() => db.close()));
  });

  describe('appModel builder', () => {
    it('creates model JSON', function(done) {
      this.appLib.should.have.property('appModel');
      this.appLib.appModel.should.have.property('models');
      this.appLib.appModel.should.have.property('metaschema');
      this.appLib.appModel.metaschema.should.have.property('type');
      done();
    });
    it('merges multiple files', function(done) {
      this.appLib.appModel.models.model1s.fields.should.have.property('encounters');
      this.appLib.appModel.models.model1s.fields.encounters.fields.should.have.property(
        'vitalSigns'
      );
      this.appLib.appModel.models.model1s.fields.encounters.fields.should.have.property(
        'diagnoses'
      );
      done();
    });
  });

  describe('Model builder', () => {
    it('builds mongoose model', done => {
      assert(_.indexOf(mongoose.modelNames(), 'model1s') >= 0);
      done();
    });
  });
});
