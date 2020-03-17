// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
/**
 * Tests basic static routes in V5
 */
const request = require('supertest');
require('should');
const reqlib = require('app-root-path').require;

const { prepareEnv, getMongoConnection } = reqlib('test/test-util');

describe('V5 Backend Basic Routes', () => {
  before(function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup();
  });

  after(async function() {
    await this.appLib.shutdown();
    const db = await getMongoConnection();
    await db.dropDatabase();
    await db.close();
  });

  describe('GET /', () => {
    it('responds with backend status', function(done) {
      request(this.appLib.app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.message.should.equal(`${process.env.APP_NAME} Backend V5 is working correctly`);
          done();
        });
    });
  });
  describe('GET /schemas', () => {
    it('responds with list of schemas', function(done) {
      request(this.appLib.app)
        .get('/schemas')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.should.have.property('model1s');
          res.body.data.model1s.should.have.property('type');
          res.body.data.model1s.type.should.be.equal('Schema');
          res.body.data.model1s.should.have.property('fields');
          res.body.data.model1s.fields.should.have.property('encounters');
          res.body.data.should.not.have.property('metaschema');
          done();
        });
    });
  });
  describe('GET /routes', () => {
    it('responds with list of basic routes', function(done) {
      request(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.should.have.property('brief');
          res.body.data.brief.should.containEql('GET /');
          res.body.data.brief.should.containEql('GET /schemas');
          res.body.data.brief.should.containEql('GET /metaschema');
          res.body.data.brief.should.containEql('GET /routes');
          res.body.data.brief.should.containEql('GET /lists');
          res.body.data.brief.should.containEql('GET /interface');
          res.body.data.brief.should.containEql('GET /typeDefaults');
          done();
        });
    });
  });
});
