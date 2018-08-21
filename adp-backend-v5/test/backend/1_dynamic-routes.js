const request = require('supertest');
const should = require('should');
const reqlib = require('app-root-path').require;

describe('V5 Backend Dynamic Routes', () => {
  before(function () {
    const dotenv = require('dotenv').load({path: './test/backend/.env.test'});
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup();
  });

  after(function () {
    return this.appLib.shutdown();
  });

  describe('GET /routes', function () {
    it('responds with list of 1st level dynamic routes', function (done) {
      request(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
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
    it('responds with list of 2nd level dynamic routes', function (done) {
      request(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.brief.should.containEql('GET /schema/model1s/encounters');
          res.body.data.brief.should.containEql('GET /model1s/:model1s_id/encounters AUTH');
          res.body.data.brief.should.containEql('POST /model1s/:model1s_id/encounters AUTH');
          res.body.data.brief.should.containEql('GET /model1s/:model1s_id/encounters/:id AUTH');
          res.body.data.brief.should.containEql('PUT /model1s/:model1s_id/encounters/:id AUTH');
          res.body.data.brief.should.containEql('DELETE /model1s/:model1s_id/encounters/:id AUTH');
          done();
        });
    });
    it('responds with list of 3rd level dynamic routes', function (done) {
      request(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.brief.should.containEql('GET /schema/model1s/encounters/diagnoses');
          res.body.data.brief.should.containEql('GET /model1s/:model1s_id/encounters/:encounters_id/diagnoses AUTH');
          res.body.data.brief.should.containEql('POST /model1s/:model1s_id/encounters/:encounters_id/diagnoses AUTH');
          res.body.data.brief.should.containEql('GET /model1s/:model1s_id/encounters/:encounters_id/diagnoses/:id AUTH');
          res.body.data.brief.should.containEql('PUT /model1s/:model1s_id/encounters/:encounters_id/diagnoses/:id AUTH');
          res.body.data.brief.should.containEql('DELETE /model1s/:model1s_id/encounters/:encounters_id/diagnoses/:id AUTH');
          res.body.data.brief.should.containEql('GET /schema/model1s/encounters/diagnoses');
          res.body.data.brief.should.containEql('GET /model1s/:model1s_id/encounters/:encounters_id/vitalSigns AUTH');
          res.body.data.brief.should.containEql('POST /model1s/:model1s_id/encounters/:encounters_id/vitalSigns AUTH');
          res.body.data.brief.should.containEql('GET /model1s/:model1s_id/encounters/:encounters_id/vitalSigns/:id AUTH');
          res.body.data.brief.should.containEql('PUT /model1s/:model1s_id/encounters/:encounters_id/vitalSigns/:id AUTH');
          res.body.data.brief.should.containEql('DELETE /model1s/:model1s_id/encounters/:encounters_id/vitalSigns/:id AUTH');
          done();
        });
    });
  });
});
