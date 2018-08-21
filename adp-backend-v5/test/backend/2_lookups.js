// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
// TODO: add tests for multiple tables
// TODO: add tests for default foreignKey

const request = require('supertest');
const should = require('should');
const assert = require('assert');
const async = require('async');
const _ = require('lodash');
const ObjectID = require('mongodb').ObjectID;

const reqlib = require('app-root-path').require;
const {auth: {admin, user, loginWithUser}} = reqlib('test/backend/test-util');

describe('V5 Backend Lookups', () => {
  const sampleDataModel3 = [ // model 2 return is capped to 3 elements
    {"_id": new ObjectID("487179f6ef4807703afd0df0"), "model4Id": new ObjectID("587179f6ef4807703afd0df2")}
  ];
  const sampleDataModel4 = [ // model 2 return is capped to 3 elements
    {"_id": new ObjectID("587179f6ef4807703afd0df0"), "name": "name1", "description": "description1"},
    {"_id": new ObjectID("587179f6ef4807703afd0df1"), "name": "name2", "description": "description2"},
    {"_id": new ObjectID("587179f6ef4807703afd0df2"), "name": "name3", "description": "description3_def"},
    {"_id": new ObjectID("587179f6ef4807703afd0df3"), "name": "name4", "description": "description4_abc"},
    {"_id": new ObjectID("587179f6ef4807703afd0df4"), "name": "name5_abc", "description": "description5"}
  ];

  before(function () {
    const dotenv = require('dotenv').load({path: './test/backend/.env.test'});
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup()
      // .then(() => {
      //   this.appLib.authenticationCheck = (req, res, next) => next(); // disable authentication
      // });
  });

  after(function () {
    return this.appLib.shutdown();
  });

  beforeEach(function () {
    return Promise.all([
      this.appLib.db.collection('model3s').remove({}),
      this.appLib.db.collection('model4s').remove({}),
      this.appLib.db.collection('users').remove({}),
    ]).then(() => {
      return Promise.all([
        this.appLib.db.collection('model4s').insert(sampleDataModel4),
        this.appLib.db.collection('model3s').insert(sampleDataModel3),
        this.appLib.db.collection('users').insert(user),
        this.appLib.db.collection('users').insert(admin),
      ]);
    });
  });
  /*describe('updates model', function () {
    it('adds ref', function (done) {
      //appLib.db.model('model3s').schema.paths.model4Id.options.ref.should.equal('model4s');
      done();
    });
    it('supports simple populate', function (done) {
      /!*
      appLib.db.model('model3s').findOne({}).populate('model4Id').exec((err, data) => {
          data.model4Id.name.should.equal("name3");
          data.model4Id.description.should.equal("description3_def");
          (data.model4Id._id + "").should.equal("587179f6ef4807703afd0df2");
          done();
      });
      *!/
      done();
    });
  });*/
  describe('GET /routes', function () {
    it('contains endpoint', function (done) {
      request(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.brief.should.containEql('GET /lookups/model4Id/model4s AUTH');
          done();
        });
    });
  });
  describe('returns correct results', function () {
    it('for specific search', function (done) {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          requireAuthentication: false
        });
      this.appLib.resetRoutes();
      request(this.appLib.app)
        .get('/lookups/model4Id/model4s?q=abc')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(2);
          res.body.data[0].label.should.equal("name4");
          res.body.data[1].label.should.equal("name5_abc");
          done();
        });
    });
    it('with pagination, page 1', function (done) {
      request(this.appLib.app)
        .get('/lookups/model4Id/model4s?q=name&page=1')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          res.body.data[0].label.should.equal("name1");
          res.body.data[1].label.should.equal("name2");
          res.body.data[2].label.should.equal("name3");
          done();
        });
    });
    it('with pagination, page 2', function (done) {
      request(this.appLib.app)
        .get('/lookups/model4Id/model4s?q=name&page=2')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(2);
          res.body.data[0].label.should.equal("name4");
          res.body.data[1].label.should.equal("name5_abc");
          done();
        });
    });
  });
  describe('returns correct results for lookups with scopes and enabled permissions', function () {
    it('should not return model by not authenticated request', function (done) {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          enableAuthentication: true,
          enablePermissions: true,
        });
      this.appLib.resetRoutes();
      request(this.appLib.app)
        .get('/lookups/Model3scopesModel4id/model4s?q=abc')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res ) {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(0);
          done();
        });
    });

    it('should return model to admin', function () {
      _.merge(this.appLib.appModel.interface.app.auth,
        {
          enableAuthentication: true,
          enablePermissions: true,
        });
      this.appLib.resetRoutes();
      return loginWithUser(this.appLib, admin)
        .then((token) => {
          return request(this.appLib.app)
            .get('/lookups/Model3scopesModel4id/model4s?q=abc')
            .set('Accept', 'application/json')
            .set("Authorization", `JWT ${token}`)
            .expect('Content-Type', /json/)
            .then((res) => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              res.body.data.length.should.equal(2);
              res.body.data[0].label.should.equal("name4");
              res.body.data[1].label.should.equal("name5_abc");
            });
        })
    });
  });
});
