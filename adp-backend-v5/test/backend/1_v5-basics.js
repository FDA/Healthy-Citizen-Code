require('should');

const { prepareEnv, getMongoConnection } = require('../test-util');

// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
describe('V5 Backend Basics', function () {
  before(function () {
    this.appLib = prepareEnv();

    return this.appLib.setup();
  });

  after(async function () {
    await this.appLib.shutdown();
    const db = await getMongoConnection(this.appLib.options.MONGODB_URI);
    await db.dropDatabase();
    await db.close();
  });

  describe('appModel builder', function () {
    it('creates model JSON', function (done) {
      this.appLib.should.have.property('appModel');
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
});
