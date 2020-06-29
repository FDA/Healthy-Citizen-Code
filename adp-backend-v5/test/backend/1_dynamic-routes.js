const request = require('supertest');
require('should');

const { prepareEnv, getMongoConnection } = require('../test-util');

describe('V5 Backend Dynamic Routes', function () {
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

  describe('GET /routes', function () {
    it('responds with list of 1st level dynamic routes', function (done) {
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
