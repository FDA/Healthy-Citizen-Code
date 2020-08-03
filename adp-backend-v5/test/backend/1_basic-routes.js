// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
/**
 * Tests basic static routes in V5
 */
require('should');

const { prepareEnv, getMongoConnection, apiRequest } = require('../test-util');

describe('V5 Backend Basic Routes', function () {
  before(function () {
    prepareEnv();
    this.appLib = require('../../lib/app')();
    return this.appLib.setup();
  });

  after(async function () {
    await this.appLib.shutdown();
    const db = await getMongoConnection();
    await db.dropDatabase();
    await db.close();
  });

  describe('GET /', function () {
    it('responds with backend status', function (done) {
      apiRequest(this.appLib.app)
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
  describe('GET /schemas', function () {
    it('responds with list of schemas', function (done) {
      apiRequest(this.appLib.app)
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
  describe('GET /routes', function () {
    it('responds with list of basic routes', function (done) {
      apiRequest(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.should.have.property('brief');

          const { getFullRoute, API_PREFIX } = this.appLib;
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/')}`);
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/schemas')}`);
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/metaschema')}`);
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/routes')}`);
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/lists')}`);
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/interface')}`);
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/typeDefaults')}`);
          done();
        });
    });
  });
});
