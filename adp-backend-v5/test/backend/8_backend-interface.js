// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
/**
 * Tests basic static routes in V5
 */

require('should');
const assert = require('assert');
const mongoose = require('mongoose');
const request = require('supertest');
const reqlib = require('app-root-path').require;

const { prepareEnv, getMongoConnection } = reqlib('test/backend/test-util');

describe('V5 Backend Routes Functionality', () => {
  before(function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup().then(() => {
      this.dba = reqlib('/lib/database-abstraction')(this.appLib);
      this.M6 = mongoose.model('model6s');
      this.appLib.authenticationCheck = (req, res, next) => next(); // disable authentication
    });
  });

  after(function() {
    return this.appLib
      .shutdown()
      .then(() => getMongoConnection())
      .then(db => db.dropDatabase().then(() => db.close()));
  });

  describe('GET /lists', () => {
    it('responds with list of lists', function(done) {
      request(this.appLib.app)
        .get('/lists')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.should.have.property('data');
          assert(Object.keys(res.body.data).length > 0);
          done();
        });
    });
  });
  describe('GET /lists.js', () => {
    it('responds with list javascript file', function(done) {
      request(this.appLib.app)
        .get('/lists.js')
        // .set('Accept', 'application/json')
        .expect('Content-Type', /application\/javascript/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          assert(res.text.indexOf("appModelHelpers['Lists'] = {") >= 0);
          done();
        });
    });
  });
});
