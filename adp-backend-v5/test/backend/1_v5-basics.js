const should = require('should');
const assert = require('assert');
const _ = require('lodash');
const mongoose = require('mongoose');

const reqlib = require('app-root-path').require;

// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
describe('V5 Backend Basics', () => {
  before(function () {
    const dotenv = require('dotenv').load({path: './test/backend/.env.test'});
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup();
  });

  after(function () {
    return this.appLib.shutdown();
  });

  describe('appModel builder', function () {
    it('creates model JSON', function (done) {
      this.appLib.should.have.property("appModel");
      this.appLib.appModel.should.have.property('models');
      this.appLib.appModel.should.have.property('metaschema');
      this.appLib.appModel.metaschema.should.have.property('type');
      done();
    });
    it('merges multiple files', function (done) {
      this.appLib.appModel.models.model1s.fields.should.have.property('encounters');
      this.appLib.appModel.models.model1s.fields.encounters.fields.should.have.property('vitalSigns');
      this.appLib.appModel.models.model1s.fields.encounters.fields.should.have.property('diagnoses');
      done();
    });
  });

  describe('Model builder', function () {
    it('builds mongoose model', function (done) {
      assert(_.indexOf(mongoose.modelNames(), 'model1s') >= 0);
      done();
    });
    it('does not build models for subschemas', function (done) {
      assert(_.indexOf(mongoose.modelNames(), 'encounters') < 0);
      done();
    });
  });
});
