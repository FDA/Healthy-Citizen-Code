// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
// TODO: add tests for multiple tables
// TODO: add tests for default foreignKey

const request = require('supertest');
const should = require('should');
const { ObjectID } = require('mongodb');

const reqlib = require('app-root-path').require;

const { getMongoConnection, setAppAuthOptions, prepareEnv } = reqlib('test/backend/test-util');

describe('V5 Backend Lookups', () => {
  const model4sSamples = [
    { _id: new ObjectID('587179f6ef4807703afd0df0'), name: 'name11', anotherName: 'anotherName11' },
    { _id: new ObjectID('587179f6ef4807703afd0df1'), name: 'name12', anotherName: 'anotherName12' },
  ];

  const model4s2Samples = [
    { _id: new ObjectID('687179f6ef4807703afd0df0'), name: 'name21' },
    { _id: new ObjectID('687179f6ef4807703afd0df1'), name: 'name22' },
  ];

  const model3PropagationSample = {
    _id: new ObjectID('487179f6ef4807703afd0df0'),
    model4sSingleLookupName: {
      table: 'lookup_test_model1',
      label: model4sSamples[0].name,
      _id: model4sSamples[0]._id,
    },
    model4sSingleLookupAnotherName: {
      table: 'lookup_test_model1',
      label: model4sSamples[0].anotherName,
      _id: model4sSamples[0]._id,
    },
    model4s2SingleLookup: {
      table: 'lookup_test_model2',
      label: model4s2Samples[0].name,
      _id: model4s2Samples[0]._id,
    },
    model4MultipleLookup: [
      {
        table: 'lookup_test_model1',
        label: model4sSamples[0].name,
        _id: model4sSamples[0]._id,
      },
      {
        table: 'lookup_test_model1',
        label: model4sSamples[1].name,
        _id: model4sSamples[1]._id,
      },
      {
        table: 'lookup_test_model2',
        label: model4s2Samples[0].name,
        _id: model4s2Samples[0]._id,
      },
      {
        table: 'lookup_test_model2',
        label: model4s2Samples[1].name,
        _id: model4s2Samples[1]._id,
      },
    ],
  };

  before(function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    return getMongoConnection().then(db => {
      this.db = db;
    });
  });

  after(function() {
    return this.db.dropDatabase().then(() => this.db.close());
  });

  beforeEach(function() {
    return Promise.all([
      this.db.collection('lookup_test_model1').remove({}),
      this.db.collection('lookup_test_model2').remove({}),
      this.db.collection('model3_propagation').remove({}),
      this.db.collection('mongoMigrateChangeLog').remove({}),
    ]).then(() =>
      Promise.all([
        this.db.collection('lookup_test_model1').insert(model4sSamples),
        this.db.collection('lookup_test_model2').insert(model4s2Samples),
        this.db.collection('model3_propagation').insert(model3PropagationSample),
      ])
    );
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  describe('backpropogation', () => {
    it('should update label in single and multiple lookups when original record is changed', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .put('/lookup_test_model1/587179f6ef4807703afd0df0')
            .send({ data: { name: 'new_name', anotherName: 'new_anotherName' } })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);

          return request(this.appLib.app)
            .get('/model3_propagation/487179f6ef4807703afd0df0')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
        })
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);

          // changed label only for one lookup, rest stay the same
          should(res.body.data).be.deepEqual({
            _id: '487179f6ef4807703afd0df0',
            model4sSingleLookupName: {
              table: 'lookup_test_model1',
              label: 'new_name',
              _id: '587179f6ef4807703afd0df0',
            },
            model4sSingleLookupAnotherName: {
              table: 'lookup_test_model1',
              label: 'new_anotherName',
              _id: '587179f6ef4807703afd0df0',
            },
            model4s2SingleLookup: {
              table: 'lookup_test_model2',
              label: 'name21',
              _id: '687179f6ef4807703afd0df0',
            },
            model4MultipleLookup: [
              {
                table: 'lookup_test_model1',
                label: 'new_name',
                _id: '587179f6ef4807703afd0df0',
              },
              {
                table: 'lookup_test_model1',
                label: 'name12',
                _id: '587179f6ef4807703afd0df1',
              },
              {
                table: 'lookup_test_model2',
                label: 'name21',
                _id: '687179f6ef4807703afd0df0',
              },
              {
                table: 'lookup_test_model2',
                label: 'name22',
                _id: '687179f6ef4807703afd0df1',
              },
            ],
          });
        });
    });

    it('should not allow to delete original record if there are lookups referenced this record', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .del(`/lookup_test_model1/${model4sSamples[0]._id}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(400);
          res.body.success.should.equal(false);
          res.body.message.should.equal(
            'ERROR: Unable to delete this record because there are other records referring. Please update the referring records and remove reference to this record.'
          );
          should(res.body.info).be.deepEqual([
            {
              linkedCollection: 'model3_propagation',
              linkedLabel: 'model4sSingleLookupName',
              linkedRecords: [{ _id: '487179f6ef4807703afd0df0' }],
            },
            {
              linkedCollection: 'model3_propagation',
              linkedLabel: 'model4MultipleLookup',
              linkedRecords: [{ _id: '487179f6ef4807703afd0df0' }],
            },
            {
              linkedCollection: 'model3_propagation',
              linkedLabel: 'model4sSingleLookupAnotherName',
              linkedRecords: [{ _id: '487179f6ef4807703afd0df0' }],
            },
          ]);
        });
    });

    it('should allow to delete original record if lookups referenced this record are removed (using update)', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .put(`/model3_propagation/${model3PropagationSample._id}`)
            .send({
              data: {
                model4sSingleLookupAnotherName: null,
                model4sSingleLookupName: null,
                model4s2SingleLookup: model3PropagationSample.model4s2SingleLookup,
                model4MultipleLookup: model3PropagationSample.model4MultipleLookup.slice(2),
              },
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200);
          res.body.success.should.equal(true);

          // try to delete lookup_test_model1 again after clearing all references to that record
          return request(this.appLib.app)
            .del(`/lookup_test_model1/${model4sSamples[0]._id}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
        })
        .then(res => {
          res.statusCode.should.equal(200);
          res.body.success.should.equal(true);
        });
    });

    it('should allow to delete original record if lookups referenced this record are removed (using delete)', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .del(`/model3_propagation/${model3PropagationSample._id}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200);
          res.body.success.should.equal(true);

          // try to delete lookup_test_model1 again after clearing all references to that record
          return request(this.appLib.app)
            .del(`/lookup_test_model1/${model4sSamples[0]._id}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
        })
        .then(res => {
          res.statusCode.should.equal(200);
          res.body.success.should.equal(true);
        });
    });
  });
});
