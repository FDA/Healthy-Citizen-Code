const should = require('should');
const { ObjectID } = require('mongodb');

const {
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  checkRestSuccessfulResponse,
  conditionForActualRecord,
  apiRequest,
} = require('../test-util');
const {
  buildGraphQlUpdateOne,
  buildGraphQlDeleteOne,
  checkGraphQlSuccessfulResponse,
  checkGraphQlErrorResponse,
} = require('../graphql-util.js');

describe('V5 Backend Lookups Backpropogation', function () {
  const model4sSamples = [
    {
      _id: new ObjectID('587179f6ef4807703afd0df0'),
      name: 'name11',
      anotherName: 'anotherName11',
      ...conditionForActualRecord,
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df1'),
      name: 'name12',
      anotherName: 'anotherName12',
      ...conditionForActualRecord,
    },
  ];

  const model4s2Samples = [
    { _id: new ObjectID('687179f6ef4807703afd0df0'), name: 'name21', ...conditionForActualRecord },
    { _id: new ObjectID('687179f6ef4807703afd0df1'), name: 'name22', ...conditionForActualRecord },
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
    ...conditionForActualRecord,
  };

  before(async function () {
    prepareEnv();
    this.appLib = require('../../lib/app')();
    const db = await getMongoConnection();
    this.db = db;
  });

  after(async function () {
    await this.db.dropDatabase();
    await this.db.close();
  });

  beforeEach(async function () {
    await Promise.all([
      this.db.collection('lookup_test_model1').deleteMany({}),
      this.db.collection('lookup_test_model2').deleteMany({}),
      this.db.collection('model3_propagation').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ]);
    await Promise.all([
      this.db.collection('lookup_test_model1').insertMany(model4sSamples),
      this.db.collection('lookup_test_model2').insertMany(model4s2Samples),
      this.db.collection('model3_propagation').insertOne(model3PropagationSample),
    ]);
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
    });
    return this.appLib.setup();
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  const lookupDocId = model4sSamples[0]._id.toString();
  const propagationDocId = model3PropagationSample._id.toString();
  const lookupModelName = 'lookup_test_model1';
  const propagationModelName = 'model3_propagation';

  describe('backpropogation', function () {
    describe('should update label in single and multiple lookups when original record is changed', function () {
      const getTestFunc = function (settings) {
        return f;

        async function f() {
          const { makeRequest, checkResponse, checkLookupPropagation } = settings;
          const req = makeRequest(apiRequest(this.appLib.app));

          const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
          checkResponse(res);
          return checkLookupPropagation(this.db);
        }
      };

      const putRecord = { name: 'new_name', anotherName: 'new_anotherName' };
      const checkLookupPropagation = async (db) => {
        const doc = await db.collection(propagationModelName).findOne({ _id: ObjectID(propagationDocId) });

        // changed label only for one lookup record, the rest stays the same
        should(doc).be.deepEqual({
          _id: ObjectID(propagationDocId),
          ...conditionForActualRecord,
          model4sSingleLookupName: {
            ...model3PropagationSample.model4sSingleLookupName,
            label: 'new_name',
          },
          model4sSingleLookupAnotherName: {
            ...model3PropagationSample.model4sSingleLookupAnotherName,
            label: 'new_anotherName',
          },
          model4s2SingleLookup: model3PropagationSample.model4s2SingleLookup,
          model4MultipleLookup: [
            {
              ...model3PropagationSample.model4MultipleLookup[0],
              label: 'new_name',
            },
            ...model3PropagationSample.model4MultipleLookup.slice(1, 4),
          ],
        });
      };

      const restSettings = {
        makeRequest: (r) => r.put(`/${lookupModelName}/${lookupDocId}`).send({ data: putRecord }),
        checkResponse: checkRestSuccessfulResponse,
        checkLookupPropagation,
      };
      const graphqlSettings = {
        makeRequest: (r) => r.post('/graphql').send(buildGraphQlUpdateOne(lookupModelName, putRecord, lookupDocId)),
        checkResponse: checkGraphQlSuccessfulResponse,
        checkLookupPropagation,
      };

      it(
        `REST: should update label in single and multiple lookups when original record is changed`,
        getTestFunc(restSettings)
      );
      it(
        `GraphQL: should update label in single and multiple lookups when original record is changed`,
        getTestFunc(graphqlSettings)
      );
    });

    describe('should not allow to delete original record if there are lookups referenced this record', function () {
      const getTestFunc = function (settings) {
        return f;

        async function f() {
          const { makeRequest, checkResponse } = settings;
          const req = makeRequest(apiRequest(this.appLib.app));
          if (this.token) {
            req.set('Authorization', `JWT ${this.token}`);
          }

          const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
          checkResponse(res);
        }
      };

      const restSettings = {
        makeRequest: (r) => r.del(`/${lookupModelName}/${lookupDocId}`),
        checkResponse: (res) => {
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
        },
      };
      const graphqlSettings = {
        makeRequest: (r) => r.post('/graphql').send(buildGraphQlDeleteOne(lookupModelName, lookupDocId)),
        checkResponse: checkGraphQlErrorResponse,
      };

      it(
        `REST: should not allow to delete original record if there are lookups referenced this record`,
        getTestFunc(restSettings)
      );
      it(
        `GraphQL: should not allow to delete original record if there are lookups referenced this record`,
        getTestFunc(graphqlSettings)
      );
    });

    describe('should allow to delete original record if lookups referenced this record are removed (using update)', function () {
      const getTestFunc = function (settings) {
        return f;

        async function f() {
          const { putRequest, checkPutResponse, delRequest, checkDelResponse } = settings;

          const putRes = await putRequest(apiRequest(this.appLib.app))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
          checkPutResponse(putRes);
          const delRes = await delRequest(apiRequest(this.appLib.app))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
          checkDelResponse(delRes);
        }
      };

      const putRecord = {
        model4sSingleLookupAnotherName: null,
        model4sSingleLookupName: null,
        model4s2SingleLookup: model3PropagationSample.model4s2SingleLookup,
        model4MultipleLookup: model3PropagationSample.model4MultipleLookup.slice(2),
      };

      const restSettings = {
        putRequest: (r) => r.put(`/${propagationModelName}/${propagationDocId}`).send({ data: putRecord }),
        checkPutResponse: checkRestSuccessfulResponse,
        delRequest: (r) => r.del(`/${lookupModelName}/${lookupDocId}`),
        checkDelResponse: checkRestSuccessfulResponse,
      };
      const graphqlSettings = {
        putRequest: (r) =>
          r.post('/graphql').send(buildGraphQlUpdateOne(propagationModelName, putRecord, propagationDocId)),
        checkPutResponse: checkGraphQlSuccessfulResponse,
        delRequest: (r) => r.post('/graphql').send(buildGraphQlDeleteOne(lookupModelName, lookupDocId)),
        checkDelResponse: checkGraphQlSuccessfulResponse,
      };

      it(
        `REST: should allow to delete original record if lookups referenced this record are removed (using update)`,
        getTestFunc(restSettings)
      );
      it(
        `GraphQL: should allow to delete original record if lookups referenced this record are removed (using update)`,
        getTestFunc(graphqlSettings)
      );
    });

    describe('should allow to delete original record if lookups referenced this record are removed (using delete)', function () {
      const getTestFunc = function (settings) {
        return f;

        async function f() {
          const { delDocRequest, checkDelDocResponse, delLookupRequest, checkDelLookupResponse } = settings;

          const delRes = await delDocRequest(apiRequest(this.appLib.app))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
          checkDelDocResponse(delRes);
          const delLookupRes = await delLookupRequest(apiRequest(this.appLib.app))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
          checkDelLookupResponse(delLookupRes);
        }
      };

      const restSettings = {
        delDocRequest: (r) => r.del(`/${propagationModelName}/${propagationDocId}`),
        checkDelDocResponse: checkRestSuccessfulResponse,
        delLookupRequest: (r) => r.del(`/${lookupModelName}/${lookupDocId}`),
        checkDelLookupResponse: checkRestSuccessfulResponse,
      };
      const graphqlSettings = {
        delDocRequest: (r) => r.post('/graphql').send(buildGraphQlDeleteOne(propagationModelName, propagationDocId)),
        checkDelDocResponse: checkGraphQlSuccessfulResponse,
        delLookupRequest: (r) => r.post('/graphql').send(buildGraphQlDeleteOne(lookupModelName, lookupDocId)),
        checkDelLookupResponse: checkGraphQlSuccessfulResponse,
      };

      it(
        `REST: should allow to delete original record if lookups referenced this record are removed (using delete)`,
        getTestFunc(restSettings)
      );
      it(
        `GraphQL: should allow to delete original record if lookups referenced this record are removed (using delete)`,
        getTestFunc(graphqlSettings)
      );
    });
  });
});
