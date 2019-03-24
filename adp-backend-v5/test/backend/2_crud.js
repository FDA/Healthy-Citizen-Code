const request = require('supertest');
const should = require('should');
const assert = require('assert');
const _ = require('lodash');
const reqlib = require('app-root-path').require;

const {
  checkForEqualityConsideringInjectedFields,
  samples: { sampleData0, sampleData1, sampleData2, sampleDataToCompare0, sampleDataToCompare2 },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  checkItemSoftDeleted,
} = reqlib('test/backend/test-util');

// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
describe('V5 Backend CRUD', () => {
  before(function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
      enablePermissions: false,
    });

    return Promise.all([getMongoConnection(), this.appLib.setup()]).then(([db]) => {
      this.db = db;
    });
  });

  after(function() {
    return this.db
      .dropDatabase()
      .then(() => Promise.all([this.db.close(), this.appLib.shutdown()]));
  });

  beforeEach(function() {
    const sampleDataModel2 = [
      // model 2 return is capped to 3 elements
      { data: 0 },
      { data: 1 },
      { data: 2 },
      { data: 3 },
    ];
    return this.db
      .collection('model1s')
      .remove({})
      .then(() => this.db.collection('model2s').remove({}))
      .then(() => this.db.collection('model1s').insert(sampleData1))
      .then(() => this.db.collection('model1s').insert(sampleData2))
      .then(() => this.db.collection('model2s').insert(sampleDataModel2[0]))
      .then(() => this.db.collection('model2s').insert(sampleDataModel2[1]))
      .then(() => this.db.collection('model2s').insert(sampleDataModel2[2]))
      .then(() => this.db.collection('model2s').insert(sampleDataModel2[3]));
  });

  // Create item
  describe('Create Item', () => {
    describe('1st level', () => {
      // TODO: fix test, broken due to new lookups
      it('posts and stores 1st level data', function() {
        let savedId = null;
        return request(this.appLib.app)
          .post('/model1s')
          .send({ data: sampleData0 })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .then(res => {
            res.body.success.should.equal(true, res.body.message);
            res.body.should.have.property('id');
            savedId = res.body.id;

            return request(this.appLib.app)
              .get(`/model1s/${sampleData0._id}`)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200);
          })
          .then(res => {
            res.body.success.should.equal(true, res.body.message);
            const { data } = res.body;

            checkForEqualityConsideringInjectedFields(data, sampleDataToCompare0);
            assert(data._id.toString() === savedId);
          });
      });
    });

    describe('1st level, wrong path', () => {
      it('show error message', function() {
        return (
          request(this.appLib.app)
            .post(`/model1s1/`)
            .send({ data: sampleData0.encounters[1].vitalSigns[1] })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            // TODO: it seems like the return code is never checked - why?
            .expect(404)
            .then(res => {
              // TODO: make these consistent with success=false
              const { message, success } = res.body;
              success.should.equal(false);
              message.should.equal('/model1s1/ does not exist');
            })
        );
      });
    });

    // Get Items ---------------------------------------------------------------------------
    describe('Get Items', () => {
      describe('1st level', () => {
        it('returns correct 1st level data', function() {
          return request(this.appLib.app)
            .get('/model1s')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              res.body.data.length.should.equal(1); // since the collection limit is 1
              checkForEqualityConsideringInjectedFields(res.body.data[0], sampleDataToCompare2); // since sorting is by _id
            });
        });
      });

      describe('from model 2 capped to 3 items in return', () => {
        it('returns 3 items', function() {
          return request(this.appLib.app)
            .get(`/model2s`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              res.body.data.length.should.equal(3);
            });
        });
      });
      describe('1st level with extra query parameter', () => {
        it('returns 3 items', function() {
          return request(this.appLib.app)
            .get(`/model2s?_=1489752996234`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              res.body.data.length.should.equal(3);
            });
        });
      });
    });

    // Get Item ------------------------------------------------------------
    describe('Get item', () => {
      describe('1st level', () => {
        it('returns correct 1st level data', function() {
          return request(this.appLib.app)
            .get('/model1s/587179f6ef4807703afd0dff')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
              checkForEqualityConsideringInjectedFields(res.body.data, sampleDataToCompare2);
            });
        });
      });
    });

    // Update Item
    describe('Update Item', () => {
      describe('1st level', () => {
        it('puts and stores 1st level data', function() {
          return request(this.appLib.app)
            .put(`/model1s/${sampleData1._id}`)
            .send({ data: sampleData0 })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);

              return request(this.appLib.app)
                .get(`/model1s/${sampleData1._id}`)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/);
            })
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);

              checkForEqualityConsideringInjectedFields(
                _.omit(res.body.data, ['_id']),
                _.omit(sampleDataToCompare0, ['_id'])
              );
            });
        });
        it('puts empty object', function() {
          return request(this.appLib.app)
            .put(`/model1s/${sampleData1._id}`)
            .send({ data: {} })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);

              return request(this.appLib.app)
                .get(`/model1s/${sampleData1._id}`)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/);
            })
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);
            });
        });
      });
    });

    // Delete Item
    describe('Delete Item', () => {
      describe('1st level', () => {
        it('soft deletes 1st level data', function() {
          return request(this.appLib.app)
            .del(`/model1s/${sampleData1._id}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .then(res => {
              res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
              res.body.success.should.equal(true, res.body.message);

              return request(this.appLib.app)
                .get(`/model1s/${sampleData1._id}`)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/);
            })
            .then(res => {
              res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
              res.body.success.should.equal(false);

              return checkItemSoftDeleted(this.appLib.db, 'model1s', sampleData1._id);
            })
            .then(deletedAt => {
              should(deletedAt).not.be.undefined();
            });
        });
      });
    });
  });
});
