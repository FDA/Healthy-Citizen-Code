require('should');
const assert = require('assert');

const { setAppAuthOptions, prepareEnv, getMongoConnection, apiRequest } = require('../test-util');

describe('V5 Backend Authentication', function () {
  before(function () {
    prepareEnv();
    this.appLib = require('../../lib/app')();
  });

  afterEach(async function () {
    await this.appLib.shutdown();
    const db = await getMongoConnection();
    await db.dropDatabase();
    await db.close();
  });

  // This is a quick sanity check. Most tests are done in CRUD section below
  // Need to write multiple tests for each app.auth setting. For now it requires multiple server starts.
  // Maybe in the future we will implement hot reload with new settings
  it('should not contain /signup, /account/password, /login, /logout when enableAuthentication=false', async function () {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
      enableAuthentication: false,
    });

    await this.appLib.setup();
    const res = await apiRequest(this.appLib.app)
      .get('/routes')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/);
    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
    res.body.success.should.equal(true, res.body.message);
    res.body.data.should.have.property('brief');
    // test requireAuthentication
    const { brief } = res.body.data;
    const { getFullRoute, API_PREFIX } = this.appLib;
    assert(!brief.includes(`POST ${getFullRoute(API_PREFIX, '/login')}`));
    assert(!brief.includes(`GET ${getFullRoute(API_PREFIX, '/logout')}`));
    assert(!brief.includes(`POST ${getFullRoute(API_PREFIX, '/signup')}`));
    assert(!brief.includes(`POST ${getFullRoute(API_PREFIX, '/account/password')} AUTH`));
  });

  it('routes should contain /signup, /account/password, /login, /logout when enableAuthentication!=false', async function () {
    setAppAuthOptions(this.appLib, {
      enableAuthentication: true,
    });

    await this.appLib.setup();
    const res = await apiRequest(this.appLib.app)
      .get('/routes')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/);
    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
    res.body.success.should.equal(true, res.body.message);
    res.body.data.should.have.property('brief');
    const { brief } = res.body.data;

    const { getFullRoute, API_PREFIX } = this.appLib;
    assert(brief.includes(`POST ${getFullRoute(API_PREFIX, '/login')}`));
    assert(brief.includes(`GET ${getFullRoute(API_PREFIX, '/logout')}`));
    assert(brief.includes(`POST ${getFullRoute(API_PREFIX, '/signup')}`));
    assert(brief.includes(`POST ${getFullRoute(API_PREFIX, '/account/password')} AUTH`));
    // res.body.data.brief.should.containEql('GET /forgot');
  });

  it('should get 401 unauthorized code requesting app model when requireAuthentication=true and token is not provided', async function () {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: true,
    });

    await this.appLib.setup();
    const res = await apiRequest(this.appLib.app)
      .get('/app-model')
      .set('Accept', 'application/json')
      // .set("Authorization", `JWT ${token}`)
      .expect('Content-Type', /json/);
    // console.log(res.body.data);
    res.statusCode.should.equal(401);
    res.body.success.should.equal(false);
  });

  it('should get stripped down json prebuild model (necessary for frontend) when requireAuthentication=true and token is not provided', async function () {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: true,
    });

    await this.appLib.setup();
    const res = await apiRequest(this.appLib.app)
      .get('/build-app-model')
      .set('Accept', 'application/json')
      // .set("Authorization", `JWT ${token}`)
      .expect('Content-Type', /json/);
    // console.log(res.body.data);
    res.statusCode.should.equal(200);
    res.body.success.should.equal(true);

    const { models, interface: modelInterface } = res.body.data;
    Object.keys(models).length.should.equal(1);
    models.users.should.not.be.empty();

    const menuFields = modelInterface.mainMenu.fields;
    Object.keys(menuFields).length.should.equal(1);
    menuFields.home.should.not.be.empty();

    const { pages } = modelInterface;
    Object.keys(pages).length.should.equal(1);
    pages.home.should.not.be.empty();
  });

  it('should get json model as guest when requireAuthentication=false', async function () {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
    });

    await this.appLib.setup();
    const res = await apiRequest(this.appLib.app)
      .get('/app-model')
      .set('Accept', 'application/json')
      // .set("Authorization", `JWT ${token}`)
      .expect('Content-Type', /json/);
    // console.log(res.body.data);
    res.statusCode.should.equal(200);
    res.body.success.should.equal(true, res.body.message);
  });
});
