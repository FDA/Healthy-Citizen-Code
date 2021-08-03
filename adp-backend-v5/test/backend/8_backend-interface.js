// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
/**
 * Tests basic static routes in V5
 */

require('should');
const assert = require('assert');
const { prepareEnv, getMongoConnection, apiRequest } = require('../test-util');

describe('V5 Backend Routes Functionality', function () {
  before(async function () {
    this.appLib = prepareEnv();

    await this.appLib.setup();
    this.dba = require('../../lib/database-abstraction')(this.appLib);
    this.appLib.auth.authenticationCheck = (req, res, next) => next(); // disable authentication
  });

  after(async function () {
    await this.appLib.shutdown();
    const db = await getMongoConnection(this.appLib.options.MONGODB_URI);
    await db.dropDatabase();
    await db.close();
  });

  describe('GET /lists', function () {
    it('responds with list of lists', function (done) {
      apiRequest(this.appLib)
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
