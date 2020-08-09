

// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
describe('V3 Backend Basics', () => {
    describe('appModel builder', function () {
        it('creates model JSON', function (done) {
            global.should.have.property("appModel");
            appModel.should.have.property('models');
            appModel.should.have.property('metaschema');
            appModel.metaschema.should.have.property('type');
            done();
        });
        it('merges multiple files', function (done) {
            appModel.models.model1s.fields.should.have.property('encounters');
            appModel.models.model1s.fields.should.have.property('encounters');
            appModel.models.model1s.fields.encounters.fields.should.have.property('vitalSigns');
            appModel.models.model1s.fields.encounters.fields.should.have.property('diagnoses');
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
