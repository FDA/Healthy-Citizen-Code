// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
/**
 * Tests basic static routes in V5
 */

require('should');
const assert = require('assert');
const mongoose = require('mongoose');
const { prepareEnv, getMongoConnection, apiRequest } = require('../test-util');

describe('V5 Backend Routes Functionality', function () {
  before(async function () {
    prepareEnv();
    this.appLib = require('../../lib/app')();
    await this.appLib.setup();
    this.dba = require('../../lib/database-abstraction')(this.appLib);
    this.M6 = mongoose.model('model6s');
    this.appLib.authenticationCheck = (req, res, next) => next(); // disable authentication
  });

  after(async function () {
    await this.appLib.shutdown();
    const db = await getMongoConnection();
    await db.dropDatabase();
    await db.close();
  });

  describe('GET /lists', function () {
    it('responds with list of lists', function (done) {
      apiRequest(this.appLib.app)
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
});
