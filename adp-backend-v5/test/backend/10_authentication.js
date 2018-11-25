// TODO: requiresAuthentication is now replaced with permissions: ['authenticated'], update tests
// TODO: add tests for permissions
const request = require('supertest');
const _ = require('lodash');
require('should');
const assert = require('assert');
const reqlib = require('app-root-path').require;

describe('V5 Backend Authentication', () => {
  before(function() {
    require('dotenv').load({ path: './test/backend/.env.test' });
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup();
  });

  after(function() {
    return this.appLib.shutdown();
  });

  /*
  after(function (done) {
    // delete mongoose.connection.models['users'];
    // delete mongoose.connection.models['piis'];
    // delete mongoose.connection.models['phis'];
    done();
  });
  beforeEach(function (done) {
    async.series([
      // cb => M7.remove({}, cb),
      // cb => M7a.remove({}, cb),
      // cb => appLib.db.collection('model7s').insert(authSampleData0, cb),
      // cb => appLib.db.collection('model7as').insert(authSampleData1, cb),
      // cb => appLib.db.collection('users').remove({}, cb),
      // cb => appLib.db.collection('phis').remove({}, cb),
      // cb => appLib.db.collection('piis').remove({}, cb),
    ], done);
  });
  */

  // This is a quick sanity check. Most tests are done in CRUD section below
  // Need to write multiple tests for each app.auth setting. For now it requires multiple server starts.
  // Maybe in the future we will implement hot reload with new settings
  it('should not contain /signup, /account/password, /login, /logout when enableAuthentication=false', function(done) {
    _.merge(this.appLib.appModel.interface.app.auth, {
      enableAuthentication: false,
    });
    this.appLib.resetRoutes();
    request(this.appLib.app)
      .get('/routes')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .end((err, res) => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        res.body.data.should.have.property('brief');
        // test requireAuthentication
        const { brief } = res.body.data;
        assert(!brief.includes('POST /login'));
        assert(!brief.includes('GET /logout'));
        assert(!brief.includes('POST /signup'));
        assert(!brief.includes('POST /account/password AUTH'));
        // res.body.data.brief.should.containEql('GET /forgot');
        done();
      });
  });

  it('routes should contain /signup, /account/password, /login, /logout when enableAuthentication!=false', function(done) {
    _.merge(this.appLib.appModel.interface.app.auth, {
      enableAuthentication: true,
    });
    this.appLib.resetRoutes();
    request(this.appLib.app)
      .get('/routes')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .end((err, res) => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        res.body.data.should.have.property('brief');
        const { brief } = res.body.data;
        assert(brief.includes('POST /login'));
        assert(brief.includes('GET /logout'));
        assert(brief.includes('POST /signup'));
        assert(brief.includes('POST /account/password AUTH'));
        // res.body.data.brief.should.containEql('GET /forgot');
        done();
      });
  });

  it('should get stripped down json model when requireAuthentication=true and token is not provided', function() {
    _.merge(this.appLib.appModel.interface.app.auth, {
      requireAuthentication: true,
    });
    this.appLib.resetRoutes();
    return (
      request(this.appLib.app)
        .get('/app-model')
        .set('Accept', 'application/json')
        // .set("Authorization", `JWT ${token}`)
        .expect('Content-Type', /json/)
        .then(res => {
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
        })
    );
  });

  it('should get json model as guest when requireAuthentication=false', function() {
    _.merge(this.appLib.appModel.interface.app.auth, {
      requireAuthentication: false,
    });
    this.appLib.resetRoutes();
    return (
      request(this.appLib.app)
        .get('/app-model')
        .set('Accept', 'application/json')
        // .set("Authorization", `JWT ${token}`)
        .expect('Content-Type', /json/)
        .then(res => {
          // console.log(res.body.data);
          res.statusCode.should.equal(200);
          res.body.success.should.equal(true, res.body.message);
        })
    );
  });

  /*  it('crud endpoints should contain "isAuthenticated" middleware when requireAuthentication!=false', function (done) {
      global.appModel.interface.app.auth = {
        "requireAuthentication": true
        // "enableRegistration": true,
        // "handleAuthentication": true,
        // "enablePermissions": true,
        // "enableUserPasswordReset": false,
        // "enableMfa": false,
        // "requireMfa": false
      };
      appLib.removeAllRoutes();
      appLib.addRoutes();
      request(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          const isRouterPathsUseAuthenticated = _.reduce(app.router.mounts, (result, route, key) => {
            const pathKey = `${route.spec.method} ${route.spec.path}`;
            result[pathKey] = _.includes(app.routes[key], m.isAuthenticated);
          }, {});
          console.log('isRouterPathsUseAuthenticated', isRouterPathsUseAuthenticated);

          // TODO: determine how to check isAuthenticated for CRUD endpoints
          // const path = [];
          // const authCrudRoutes = new Set();
          // _.each(appModel.models, (schema, schemaName) => {
          //   const pluralize = require('pluralize');
          //   let pluralName = pluralize(schemaName, 2);
          //   let qualifiedPath = `/${_.map(path, p => p + '/:' + p + '_id').join("/") + (path.length ? '' : '/')}`;
          //   const pathPart = `${qualifiedPath}${pluralName}`;
          //   authCrudRoutes.add(`GET${pathPart}`);
          //   authCrudRoutes.add(`POST${pathPart}`);
          //   authCrudRoutes.add(`GET${pathPart}/:id`);
          //   authCrudRoutes.add(`PUT${pathPart}/:id`);
          //   authCrudRoutes.add(`DELETE${pathPart}/:id`);
          //   m.addRoute('get', pathPart, callbacks.concat([mainController.getItems])); // should this even be allowed for pii/phis? Check limitReturnedRecords
          //   m.addRoute('post', pathPart, callbacks.concat([mainController.postItem]));
          //   m.addRoute('get', `${qualifiedPath}${pluralName}/:id`, callbacks.concat([mainController.getItem]));
          //   m.addRoute('put', `${qualifiedPath}${pluralName}/:id`, callbacks.concat([mainController.putItem]));
          //   m.addRoute('del', `${qualifiedPath}${pluralName}/:id`, callbacks.concat([mainController.deleteItem]));
          // });
          done();
        });
    });
    */

  // it('should prevent unauthorized access to protected resources', function (done) {
  //   request(this.appLib.app)
  //     .get('/model7s/587179f6ef4807704afd0df1')
  //     .set('Accept', 'application/json')
  //     .expect('Content-Type', /json/)
  //     .end(function (err, res) {
  //       res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
  //       done();
  //     });
  // });
  // it('should allow unauthorized access to unprotected resources', function (done) {
  //   request(this.appLib.app)
  //     .get('/model7as/587179f6ef4807704afd0df2')
  //     .set('Accept', 'application/json')
  //     .expect('Content-Type', /json/)
  //     .end(function (err, res) {
  //       res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //       res.body.success.should.equal(true, res.body.message);
  //       done();
  //     });
  // });
  // describe('Sign up', () => {
  //   it('should create new account and prevent creating another account with the same name', function (done) {
  //     async.series([
  //       (cb) => { // signup
  //         request(this.appLib.app)
  //           .post('/signup')
  //           .send({
  //             login: "user_2",
  //             password: "password2",
  //             firstName: "John",
  //             lastName: "Smith",
  //             email: "test2@mail.rtfms.com"
  //           })
  //           .set('Accept', 'application/json')
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(true, res.body.message);
  //             cb();
  //           });
  //       },
  //       (cb) => { // signup
  //         request(this.appLib.app)
  //           .post('/signup')
  //           .send({
  //             login: "user_2",
  //             password: "password2",
  //             firstName: "John",
  //             lastName: "Smith",
  //             email: "test2@mail.rtfms.com"
  //           })
  //           .set('Accept', 'application/json')
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(400, JSON.stringify(res, null, 4), res);
  //             res.body.success.should.equal(false, res.body);
  //             res.body.message.should.equal("User user_2 already exists", res.body.message);
  //             cb();
  //           });
  //       }
  //     ], done);
  //   });
  //   it('should not create account with too simple password', function (done) {
  //     request(this.appLib.app)
  //       .post('/signup')
  //       .send({
  //         login: "user_2",
  //         password: "pass",
  //         firstName: "John",
  //         lastName: "Smith",
  //         email: "test2@mail.rtfms.com"
  //       })
  //       .set('Accept', 'application/json')
  //       .expect('Content-Type', /json/)
  //       .end(function (err, res) {
  //         res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
  //         res.body.success.should.equal(false, res.body.message);
  //         res.body.message.should.equal("Password: Password must contain at least one of each: digit 0-9, lowercase character, uppercase character and one special character: @#$%!&^*-_ and be at least 8 characters long", res.body.message);
  //         done();
  //       });
  //   });
  // });
  // describe('After login', () => {
  //   it('should allow authorized access to protected resources and prevent access to someone else\'s resources', function (done) {
  //     let token;
  //     let user2, user3;
  //     async.series([
  //       (cb) => { // signup
  //         request(this.appLib.app)
  //           .post('/signup')
  //           .send({
  //             login: "user_2",
  //             password: "password2",
  //             firstName: "John",
  //             lastName: "Smith",
  //             email: "test2@mail.rtfms.com"
  //           })
  //           .set('Accept', 'application/json')
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(true, res.body.message);
  //             res.body.should.have.property('id');
  //             res.body.should.have.property('data');
  //             cb();
  //           });
  //       },
  //       (cb) => { // signup
  //         request(this.appLib.app)
  //           .post('/signup')
  //           .send({
  //             login: "user_3",
  //             password: "password3",
  //             firstName: "Jane",
  //             lastName: "Doe",
  //             email: "test3@mail.rtfms.com"
  //           })
  //           .set('Accept', 'application/json')
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(true, res.body.message);
  //             res.body.should.have.property('id');
  //             res.body.should.have.property('data');
  //             user3 = res.body.data;
  //             cb();
  //           });
  //       },
  //       (cb) => { // check token validity, should be invalid before login
  //         request(this.appLib.app)
  //           .get('/is-authenticated')
  //           .set('Accept', 'application/json')
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(false, res.body.message);
  //             cb();
  //           });
  //       },
  //       (cb) => { // check token validity, should be valid after login
  //         request(this.appLib.app)
  //           .get('/is-authenticated')
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT blah`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
  //             cb();
  //           });
  //       },
  //       (cb) => { // login
  //         request(this.appLib.app)
  //           .post('/login')
  //           .send({login: "user_2", password: "password2"})
  //           .set('Accept', 'application/json')
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(true, res.body.message);
  //             res.body.should.have.property('data');
  //             res.body.data.should.have.property('token');
  //             res.body.data.should.have.property('user');
  //             res.body.data.user.should.have.property('piiId');
  //             res.body.data.user.should.have.property('phiId');
  //             res.body.data.user.should.have.property('login');
  //             res.body.data.user.should.not.have.property('email');
  //             res.body.data.user.should.not.have.property('password');
  //             res.body.data.user.should.not.have.property('salt');
  //             res.body.data.user.login.should.equal('user_2');
  //             token = res.body.data.token;
  //             user2 = res.body.data.user;
  //             cb();
  //           });
  //       },
  //       (cb) => { // check token validity, should be valid after login
  //         request(this.appLib.app)
  //           .get('/is-authenticated')
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(true, res.body.message);
  //             cb();
  //           });
  //       },
  //       (cb) => { // request data requiring authentication in general
  //         request(this.appLib.app)
  //           .get('/model7s/587179f6ef4807704afd0df1')
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(true, res.body.message);
  //             res.body.data.should.have.property('n');
  //             res.body.data.n.should.equal(7);
  //             cb();
  //           });
  //       },
  //       // own records
  //       (cb) => { // request user's own phi data
  //         request(this.appLib.app)
  //           .get(`/phis/${user2.phiId}`)
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(true, res.body.message);
  //             cb();
  //           });
  //       },
  //       (cb) => { // request user's own pii data
  //         request(this.appLib.app)
  //           .get(`/piis/${user2.piiId}`)
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
  //             res.body.success.should.equal(true, res.body.message);
  //             cb();
  //           });
  //       },
  //       (cb) => { // request user's own pii data should fail, this is not a supported interface
  //         request(this.appLib.app)
  //           .get(`/users/${user2.id}`)
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
  //             cb();
  //           });
  //       },
  //       // someone else's records
  //       (cb) => { // someone else's phi data
  //         request(this.appLib.app)
  //           .get(`/phis/${user3.phiId}`)
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
  //             cb();
  //           });
  //       },
  //       (cb) => { // someone else's pii data
  //         request(this.appLib.app)
  //           .get(`/piis/${user3.piiId}`)
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
  //             cb();
  //           });
  //       },
  //       // /phis and /piis routes should not work
  //       (cb) => { // someone else's phi data
  //         request(this.appLib.app)
  //           .get(`/phis`)
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
  //             cb();
  //           });
  //       },
  //       (cb) => { // someone else's phi data
  //         request(this.appLib.app)
  //           .get(`/piis`)
  //           .set('Accept', 'application/json')
  //           .set('Authorization', `JWT ${token}`)
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
  //             cb();
  //           });
  //       }
  //     ], done);
  //   });
  // });
  // describe('After login', () => {
  //   it('should not expose routes /phis and /piis to unauthenticated users', function (done) {
  //     async.series([
  //       // /phis and /piis routes should not work
  //       (cb) => { // someone else's phi data
  //         request(this.appLib.app)
  //           .get(`/phis`)
  //           .set('Accept', 'application/json')
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
  //             cb();
  //           });
  //       },
  //       (cb) => { // someone else's phi data
  //         request(this.appLib.app)
  //           .get(`/piis`)
  //           .set('Accept', 'application/json')
  //           .expect('Content-Type', /json/)
  //           .end(function (err, res) {
  //             res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
  //             cb();
  //           });
  //       },
  //     ], done);
  //   });
  // });
});
