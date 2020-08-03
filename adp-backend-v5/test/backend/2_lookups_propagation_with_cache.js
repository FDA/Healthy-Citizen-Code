const should = require('should');
const { ObjectID } = require('mongodb');

const {
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  checkRestSuccessfulResponse,
  conditionForActualRecord,
  checkForEqualityConsideringInjectedFields,
  apiRequest,
} = require('../test-util');
const { buildGraphQlUpdateOne, buildGraphQlQuery, checkGraphQlSuccessfulResponse } = require('../graphql-util.js');

describe('V5 Backend Lookups Backpropagation With Cache', function () {
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

  const model3PropagationSample = {
    _id: new ObjectID('487179f6ef4807703afd0df0'),
    model4sSingleLookupName: {
      table: 'lookup_test_model1',
      label: model4sSamples[0].name,
      _id: model4sSamples[0]._id,
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
    ],
    ...conditionForActualRecord,
  };

  before(async function () {
    prepareEnv();
    this.appLib = require('../../lib/app')();
    const db = await getMongoConnection();
    this.db = db;

    const RedisMock = require('ioredis-mock');
    const redisMockClient = new RedisMock();
    // unlink is not implemented in ioredis-mock, but does logically the same as del
    redisMockClient.unlink = redisMockClient.del;
    // this.appLib.cache.getCacheStorage = () => Promise.resolve(redisMockClient);
    const sinon = require('sinon');
    sinon.stub(this.appLib.cache, 'getCacheStorage').resolves(redisMockClient);
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

  describe('backpropagation with cache enabled', function () {
    describe('should update label in single and multiple lookups when original record is changed', function () {
      const getTestFunc = function (settings) {
        return f;

        async function f() {
          const {
            warmupCache,
            propagationModelRequest,
            changeLookupRequest,
            checkResponse,
            checkLookupPropagation,
            getData,
            checkPropagationModelCacheIsClear,
          } = settings;

          await warmupCache(this.appLib, propagationModelRequest, checkResponse);
          const res = await changeLookupRequest(apiRequest(this.appLib.app))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
          checkResponse(res);
          await checkPropagationModelCacheIsClear(this.appLib);
          await checkLookupPropagation(this.appLib, this.db, propagationModelRequest, getData);
        }
      };
      const warmupCache = async (appLib, propagationModelRequest, checkResponse) => {
        const res = await propagationModelRequest(apiRequest(appLib.app))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);
        checkResponse(res);
        const keys = await appLib.cache.getKeys(`${propagationModelName}:*`);
        should(keys.length).be.equal(1);
      };
      const checkPropagationModelCacheIsClear = async (appLib) => {
        const keys = await appLib.cache.getKeys(`${propagationModelName}:*`);
        should(keys).be.empty();
      };

      const checkLookupPropagation = async (appLib, db, propagationModelRequest, getData) => {
        // changed label only for one lookup record, the rest stays the same
        const dbDoc = await db.collection(propagationModelName).findOne({ _id: ObjectID(propagationDocId) });
        const expectedDbDoc = {
          _id: ObjectID(propagationDocId),
          ...conditionForActualRecord,
          model4sSingleLookupName: {
            ...model3PropagationSample.model4sSingleLookupName,
            label: 'new_name',
          },
          model4MultipleLookup: [
            {
              ...model3PropagationSample.model4MultipleLookup[0],
              label: 'new_name',
            },
            model3PropagationSample.model4MultipleLookup[1],
          ],
        };
        should(dbDoc).be.deepEqual(expectedDbDoc);

        const responseDoc = await propagationModelRequest(apiRequest(appLib.app))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        const data = getData(responseDoc);
        const expectedResponseDoc = {
          _id: propagationDocId,
          model4sSingleLookupName: {
            table: 'lookup_test_model1',
            label: 'new_name',
            _id: model4sSamples[0]._id.toString(),
          },
          model4MultipleLookup: [
            {
              table: 'lookup_test_model1',
              label: 'new_name',
              _id: model4sSamples[0]._id.toString(),
            },
            {
              table: 'lookup_test_model1',
              label: model4sSamples[1].name,
              _id: model4sSamples[1]._id.toString(),
            },
          ],
        };
        checkForEqualityConsideringInjectedFields(data, expectedResponseDoc);
      };

      const putRecord = { name: 'new_name', anotherName: 'new_anotherName' };

      const restSettings = {
        propagationModelRequest: (r) => r.get(`/${propagationModelName}/${propagationDocId}`),
        warmupCache,
        changeLookupRequest: (r) => r.put(`/${lookupModelName}/${lookupDocId}`).send({ data: putRecord }),
        checkResponse: checkRestSuccessfulResponse,
        checkLookupPropagation,
        getData: (res) => res.body.data,
        checkPropagationModelCacheIsClear,
      };

      const selectFields = `items { 
        _id, 
        model4sSingleLookupName { table, label, _id },
        model4MultipleLookup { 
          ... on Lookup_model4MultipleLookup_lookup_test_model1 { table, label, _id }
          ... on Lookup_model4MultipleLookup_lookup_test_model2 { table, label, _id }
        }
      }`;
      const graphqlSettings = {
        propagationModelRequest: (r) =>
          r
            .post('/graphql')
            .send(buildGraphQlQuery(propagationModelName, `{_id: '${propagationDocId}' }`, selectFields)),
        warmupCache,
        changeLookupRequest: (r) =>
          r.post('/graphql').send(buildGraphQlUpdateOne(lookupModelName, putRecord, lookupDocId)),
        checkResponse: checkGraphQlSuccessfulResponse,
        checkLookupPropagation,
        getData: (res) => res.body.data[propagationModelName].items[0],
        checkPropagationModelCacheIsClear,
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
  });
});
