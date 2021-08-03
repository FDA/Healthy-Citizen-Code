require('should');

const { prepareEnv, getMongoConnection, apiRequest } = require('../test-util');

describe('V5 Backend Dynamic Routes', function () {
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

  describe('GET /routes', function () {
    it('responds with list of 1st level dynamic routes', function (done) {
      apiRequest(this.appLib)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);

          const { getFullRoute } = this.appLib;
          const { API_PREFIX } = this.appLib.config;
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/schema/model1s')}`);
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/model1s')} AUTH`);
          res.body.data.brief.should.containEql(`POST ${getFullRoute(API_PREFIX, '/model1s')} AUTH`);
          res.body.data.brief.should.containEql(`GET ${getFullRoute(API_PREFIX, '/model1s/:id')} AUTH`);
          res.body.data.brief.should.containEql(`PUT ${getFullRoute(API_PREFIX, '/model1s/:id')} AUTH`);
          res.body.data.brief.should.containEql(`DELETE ${getFullRoute(API_PREFIX, '/model1s/:id')} AUTH`);
          done();
        });
    });
  });
});
