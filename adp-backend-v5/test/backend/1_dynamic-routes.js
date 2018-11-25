const request = require('supertest');
require('should');
const reqlib = require('app-root-path').require;

describe('V5 Backend Dynamic Routes', () => {
  before(function() {
    require('dotenv').load({ path: './test/backend/.env.test' });
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup();
  });

  after(function() {
    return this.appLib.shutdown();
  });

  describe('GET /routes', () => {
    it('responds with list of 1st level dynamic routes', function(done) {
      request(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.brief.should.containEql('GET /schema/model1s');
          res.body.data.brief.should.containEql('GET /model1s AUTH');
          res.body.data.brief.should.containEql('POST /model1s AUTH');
          res.body.data.brief.should.containEql('GET /model1s/:id AUTH');
          res.body.data.brief.should.containEql('PUT /model1s/:id AUTH');
          res.body.data.brief.should.containEql('DELETE /model1s/:id AUTH');
          done();
        });
    });
  });
});
