// TODO: requiresAuthentication is now replaced with permissions: ['authenticated'], update tests
// TODO: add tests for permissions
const request = require('supertest');
const _ = require('lodash');
const should = require('should');
const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

const reqlib = require('app-root-path').require;
const {auth: {admin, user, loginWithUser}} = reqlib('test/backend/test-util');

describe('V5 Backend Permissions', () => {
  before(function () {
    const dotenv = require('dotenv').load({path: './test/backend/.env.test'});
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup();
  });

  after(function () {
    return this.appLib.shutdown();
  });

  const MODEL8_SAMPLE = {
    '_id': ObjectID('587179f6ef4807704afd0daa'),
    number1: 1,
    number2: 2,
  };

  // afterEach(function () {
  //   return Promise.all([
  //     this.appLib.db.collection('users').remove({}),
  //     this.appLib.db.collection('model8s').remove({})
  //   ])
  // });
  beforeEach(function () {
    return Promise.all([
        this.appLib.db.collection('users').remove({}),
        this.appLib.db.collection('model8guests').remove({}),
        this.appLib.db.collection('model8impracticables').remove({}),
        this.appLib.db.collection('model8impracticable_other_forms').remove({}),
        this.appLib.db.collection('model8preparations').remove({}),
        this.appLib.db.collection('model8multiple_scopes').remove({}),
      ])
      .then(() => {
        return Promise.all([
          this.appLib.db.collection('users').insert(admin),
          this.appLib.db.collection('users').insert(user),
          this.appLib.db.collection('model8guests').insert(MODEL8_SAMPLE),
          this.appLib.db.collection('model8impracticables').insert(MODEL8_SAMPLE),
          this.appLib.db.collection('model8impracticable_other_forms').insert(MODEL8_SAMPLE),
          this.appLib.db.collection('model8preparations').insert(MODEL8_SAMPLE),
          this.appLib.db.collection('model8multiple_scopes').insert(MODEL8_SAMPLE),
        ]);
      });
  });

  /*
    it('should delete permissions from model json ', function () {
      return new Promise((resolve, reject) => {
        request(this.appLib.app)
          .post('/login')
          .send({
            "login": "admin",
            "password": "Password!1"
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            res.statusCode.should.equal(200);
            res.body.success.should.equal(true);
            const token = res.body.data.token;
            resolve(token);
          })
      })
        .then((token) => {
          return new Promise((resolve, reject) => {
            request(this.appLib.app)
              .get('/app-model')
              .set('Accept', 'application/json')
              .set("Authorization", `JWT ${token}`)
              .expect('Content-Type', /json/)
              .end(function (err, res) {
                // console.log(res.body.data);
                res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                res.body.success.should.equal(true, res.body.message);
                resolve();
              });
          });
        });
    });
  */

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
          // _.forOwn(appModel.models, (schema, schemaName) => {
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

  describe('scheme permissions', () => {
    it('should not allow authorized user to access the protected document by guest scope', function () {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          'requireAuthentication': true,
          'enablePermissions': true,
        });
      const appLib = this.appLib;
      appLib.resetRoutes();
      return loginWithUser(appLib, user)
        .then(token => {
          return request(appLib.app)
            .get('/model8guests/587179f6ef4807704afd0daa')
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
            .then((res) => {
              res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
              res.body.success.should.equal(false, res.body.message);
            });
        });
    });

    it('should allow guest user to access the protected document by guest scope', function () {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          'requireAuthentication': false,
          'enablePermissions': true,
        });
      const appLib = this.appLib;
      appLib.resetRoutes();
      return request(appLib.app)
        .get('/model8guests/587179f6ef4807704afd0daa')
        .set('Accept', 'application/json')
        // .set("Authorization", `JWT ${token}`)
        .expect('Content-Type', /json/)
        .then((res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.number1.should.equal(1);
          res.body.data.number2.should.equal(2);
        });
    });

    it('should allow admin to access the protected document by scope with impracticable condition', function () {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          'requireAuthentication': true,
          'enablePermissions': true,
        });
      const appLib = this.appLib;
      appLib.resetRoutes();
      return loginWithUser(appLib, admin)
        .then(token => {
          return request(appLib.app)
            .get('/model8impracticables/587179f6ef4807704afd0daa')
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
            .then((res) => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              res.body.data.number1.should.equal(1);
              res.body.data.number2.should.equal(2);
            });
        });
    });

    it('should allow admin to access the protected document by scope with impracticable condition with simple form of scope permissions', function () {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          'requireAuthentication': true,
          'enablePermissions': true,
        });
      const appLib = this.appLib;
      appLib.resetRoutes();
      return loginWithUser(appLib, admin)
        .then(token => {
          return request(appLib.app)
            .get('/model8impracticable_other_forms/587179f6ef4807704afd0daa')
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
            .then((res) => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              res.body.data.number1.should.equal(1);
              res.body.data.number2.should.equal(2);
            });
        });
    });

    it('should allow user to access the protected document by scope with condition requiring preparation', function () {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          'requireAuthentication': true,
          'enablePermissions': true,
        });
      const appLib = this.appLib;
      appLib.resetRoutes();
      return loginWithUser(appLib, user)
        .then(token => {
          return request(appLib.app)
            .get('/model8preparations/587179f6ef4807704afd0daa')
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
            .then((res) => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              res.body.data.number1.should.equal(1);
              res.body.data.number2.should.equal(2);
            });
        });
    });

    it('should allow user to access the protected document by scope with condition requiring preparation', function () {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          'requireAuthentication': true,
          'enablePermissions': true,
        });
      const appLib = this.appLib;
      appLib.resetRoutes();
      return loginWithUser(appLib, user)
        .then(token => {
          return request(appLib.app)
            .get('/model8preparations/587179f6ef4807704afd0daa')
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
            .then((res) => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              res.body.data.number1.should.equal(1);
              res.body.data.number2.should.equal(2);
            });
        });
    });

    it('should allow guest to access the protected document with one available and one unavailable scopes', function () {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          'requireAuthentication': false,
          'enablePermissions': true,
        });
      const appLib = this.appLib;
      appLib.resetRoutes();
      return request(appLib.app)
        .get('/model8multiple_scopes/587179f6ef4807704afd0daa')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .then((res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.number1.should.equal(1);
          res.body.data.number2.should.equal(2);
        });
    });
  });

  describe('lists permissions', () => {

    describe('check lists in app-model-code', () => {
      it('should allow admin to access all the lists', function () {
        _.merge(this.appLib.appModel.interface.app.auth,
          {
            'requireAuthentication': true,
            'enablePermissions': true,
          });
        const appLib = this.appLib;
        appLib.resetRoutes();
        return loginWithUser(appLib, admin)
          .then((token) => {
            return request(appLib.app)
              .get('/app-model')
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
              .then((res) => {
                res.statusCode.should.equal(200, JSON.stringify(res, null, 4));

                const expectedList = {
                  'val1': 'val1',
                  'val2': 'val2',
                  'val3': 'val3',
                  'val4': 'val4',
                };
                const listModelFields = res.body.data.models.model9list_permissions.fields;

                const objectListWithObjectValueList = _.get(listModelFields, 'objectListWithObjectValueList.list');
                assert(_.isEqual(objectListWithObjectValueList, expectedList));

                const objectListWithReferenceAndCustomScopes = _.get(listModelFields, 'objectListWithReferenceAndCustomScopes.list');
                assert(_.isEqual(objectListWithReferenceAndCustomScopes, expectedList));

                const objectListWithReferenceAndNoCustomScopes = _.get(listModelFields, 'objectListWithReferenceAndNoCustomScopes.list');
                assert(_.isEqual(objectListWithReferenceAndNoCustomScopes, expectedList));

                const objectValueList = _.get(listModelFields, 'objectValueList.list');
                assert(_.isEqual(objectValueList, expectedList));
              });
          });
      });

      it('should allow user to access only lists with user scope', function () {
        _.merge(this.appLib.appModel.interface.app.auth,
          {
            'requireAuthentication': true,
            'enablePermissions': true,
          });
        const appLib = this.appLib;
        appLib.resetRoutes();
        return loginWithUser(appLib, user)
          .then((token) => {
            return request(appLib.app)
              .get('/app-model')
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
              .then((res) => {
                res.statusCode.should.equal(200, JSON.stringify(res, null, 4));

                const expectedRestrictedList = {};
                const expectedListWithCustomScopes = {
                  'val1': 'val1',
                  'val2': 'val2',
                };

                const listModelFields = res.body.data.models.model9list_permissions.fields;

                const objectListWithObjectValueList = _.get(listModelFields, 'objectListWithObjectValueList.list');
                assert(_.isEqual(objectListWithObjectValueList, expectedRestrictedList));

                const objectListWithReferenceAndCustomScopes = _.get(listModelFields, 'objectListWithReferenceAndCustomScopes.list');
                assert(_.isEqual(objectListWithReferenceAndCustomScopes, expectedListWithCustomScopes));

                const objectListWithReferenceAndNoCustomScopes = _.get(listModelFields, 'objectListWithReferenceAndNoCustomScopes.list');
                assert(_.isEqual(objectListWithReferenceAndNoCustomScopes, expectedRestrictedList));

                const objectValueList = _.get(listModelFields, 'objectValueList.list');
                assert(_.isEqual(objectValueList, expectedRestrictedList));
              });
          });
      });
    });

    describe('check security for writing operations', () => {
      it('should allow admin to create item with any valid list values', function () {
        _.merge(this.appLib.appModel.interface.app.auth,
          {
            'requireAuthentication': true,
            'enablePermissions': true,
          });
        const appLib = this.appLib;
        appLib.resetRoutes();
        const model9_sample = {
          objectValueList: 'val1',
          objectListWithObjectValueList: 'val2',
          objectListWithReferenceAndNoCustomScopes: 'val3',
          objectListWithReferenceAndCustomScopes: 'val4',
        };
        return loginWithUser(appLib, admin)
          .then((token) => {
            return request(appLib.app)
              .post('/model9list_permissions')
              .send({data: model9_sample})
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
              .then((res) => {
                res.statusCode.should.equal(200, JSON.stringify(res, null, 2));
                res.body.success.should.equal(true);
                res.body.id.should.not.be.empty();
              });
          });
      });

      it('should not allow admin to create item with invalid list values', function () {
        _.merge(this.appLib.appModel.interface.app.auth,
          {
            'requireAuthentication': true,
            'enablePermissions': true,
          });
        const appLib = this.appLib;
        appLib.resetRoutes();
        const model9_sample = {
          objectValueList: 'invalid1',
          objectListWithObjectValueList: 'invalid2',
          objectListWithReferenceAndNoCustomScopes: 'invalid3',
          objectListWithReferenceAndCustomScopes: 'invalid4',
        };
        return loginWithUser(appLib, admin)
          .then((token) => {
            return request(appLib.app)
              .post('/model9list_permissions')
              .send({data: model9_sample})
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
              .then((res) => {
                res.statusCode.should.equal(400, JSON.stringify(res, null, 2));
                res.body.success.should.equal(false);
              });
          });
      });

      it('should allow user to create and update item with list values available for that user', function () {
        _.merge(this.appLib.appModel.interface.app.auth,
          {
            'requireAuthentication': true,
            'enablePermissions': true,
          });
        const appLib = this.appLib;
        appLib.resetRoutes();
        const model9_sample = {
          objectValueList: '',
          objectListWithObjectValueList: '',
          objectListWithReferenceAndNoCustomScopes: '',
          objectListWithReferenceAndCustomScopes: 'val1',
        };
        let savedToken;
        let savedId;

        return loginWithUser(appLib, user)
          .then((token) => {
            savedToken = token;
            return request(appLib.app)
              .post('/model9list_permissions')
              .send({data: model9_sample})
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${savedToken}`)
              .expect('Content-Type', /json/)
              .then((res) => {
                res.statusCode.should.equal(200, JSON.stringify(res, null, 2));
                res.body.success.should.equal(true);
                savedId = res.body.id;
                savedId.should.not.be.empty();
              });
          })
          .then(() => {
            return request(appLib.app)
              .put(`/model9list_permissions/${savedId}`)
              .send({data: model9_sample})
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${savedToken}`)
              .expect('Content-Type', /json/)
              .then((res) => {
                res.statusCode.should.equal(200, JSON.stringify(res, null, 2));
                res.body.success.should.equal(true);
              });
          });
      });

      it('should not allow user to create item with list values not available for that user', function () {
        _.merge(this.appLib.appModel.interface.app.auth,
          {
            'requireAuthentication': true,
            'enablePermissions': true,
          });
        const appLib = this.appLib;
        appLib.resetRoutes();
        const model9_sample = {
          objectValueList: 'val1',
          objectListWithObjectValueList: 'val2',
          objectListWithReferenceAndNoCustomScopes: 'val3',
          objectListWithReferenceAndCustomScopes: 'val4',
        };

        return loginWithUser(appLib, user)
          .then((token) => {
            return request(appLib.app)
              .post('/model9list_permissions')
              .send({data: model9_sample})
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
              .then((res) => {
                res.statusCode.should.equal(400, JSON.stringify(res, null, 2));
                res.body.success.should.equal(false);
              });
          });
      });
    });
  });
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
//             res.body.data.should.have.property('admin');
//             res.body.data.admin.should.have.property('piiId');
//             res.body.data.admin.should.have.property('phiId');
//             res.body.data.admin.should.have.property('login');
//             res.body.data.admin.should.not.have.property('email');
//             res.body.data.admin.should.not.have.property('password');
//             res.body.data.admin.should.not.have.property('salt');
//             res.body.data.admin.login.should.equal('user_2');
//             token = res.body.data.token;
//             user2 = res.body.data.admin;
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
//       (cb) => { // request admin's own phi data
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
//       (cb) => { // request admin's own pii data
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
//       (cb) => { // request admin's own pii data should fail, this is not a supported interface
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
