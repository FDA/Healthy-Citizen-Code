const should = require('should');
const _ = require('lodash');
const sinon = require('sinon');
const RedisMock = require('ioredis-mock');
RedisMock.Promise = require('bluebird');
const {
  buildGraphQlDeleteOne,
  buildGraphQlUpdateOne,
  buildGraphQlDxQuery,
  buildGraphQlCreate,
} = require('../graphql-util');

const rewiremock = require('../rewiremock');

const {
  checkForEqualityConsideringInjectedFields,
  samples: { sampleData0, sampleData1, sampleData2, sampleDataToCompare0 },
  getMongoConnection,
  setAppAuthOptions,
  stringifyObjectId,
  prepareEnv,
  apiRequest,
} = require('../test-util');

function mockRedisConnection() {
  rewiremock(() => require('../../lib/util/redis'))
    .callThrough()
    .with({
      getRedisConnection: () => {
        const redisMockClient = new RedisMock();
        // unlink is not implemented in ioredis-mock, but does logically the same as del
        redisMockClient.unlink = redisMockClient.del;

        // Bull is checking redis status in node_modules/bull/lib/utils.js isRedisReady function
        // Pass 'ready' status to redisMock to avoid adding multiple listeners
        // and message "Possible EventEmitter memory leak detected. 11 error listeners added to [RedisMock] ..."
        redisMockClient.status = 'ready';

        return redisMockClient;
      },
    });
}

function mockRedisUrl() {
  // Enable cache by setting REDIS_URL.
  // Setting process.env.REDIS_URL is not used since it enables unwanted BULL_REDIS_URL, SESSIONS_REDIS_URL, SOCKETIO_REDIS_URL
  const { getConfigFromDb: originalConfigFromDb } = require('../../config/util');
  rewiremock(() => require('../../config/util'))
    .callThrough()
    .with({
      getConfigFromDb: async (mongodbUri) => {
        const result = await originalConfigFromDb(mongodbUri);
        result.config.REDIS_URL = 'redis://127.0.0.1:6379';
        return result;
      },
    });
}

describe('V5 Backend Cache Enabled', () => {
  const modelName = 'model1s';
  const selectFields = `_id, deletedAt, string, encounters { _id, diagnoses {_id, data }, vitalSigns { _id, data, array } }`;

  before(async () => {
    // these mocks will affect calls during appLib setup
    mockRedisUrl();
    mockRedisConnection();
    rewiremock.enable();
  });

  after(async () => {
    rewiremock.disable();
  });

  const makeRequest = async (appLib, id, includeActions) => {
    const _selectFields = includeActions ? `${selectFields}, _actions` : selectFields;
    const dxQuery = `["_id", "=", "${id.toString()}"]`;
    const res = await apiRequest(appLib)
      .post('/graphql')
      .send(buildGraphQlDxQuery(modelName, dxQuery, undefined, `items { ${_selectFields} }`))
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
    should(res.body.errors).be.undefined();
    const { items } = res.body.data[`${modelName}Dx`];
    should(items).not.be.empty();
    return items[0];
  };
  describe('Cache enabled', () => {
    before(async function () {
      this.appLib = prepareEnv();

      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enablePermissions: false,
      });

      this.db = await getMongoConnection(this.appLib.options.MONGODB_URI);

      await this.db.collection(modelName).deleteMany({});
      await Promise.all([
        this.db.collection(modelName).insertOne(sampleData0),
        this.db.collection(modelName).insertOne(sampleData1),
      ]);
    });

    after(async function () {
      await this.appLib.shutdown();
    });
    it('when cache is enabled returns value from cache on 2nd GET request', async function () {
      await this.appLib.setup();

      const { dba, cache } = this.appLib;
      this.getItemsUsingCacheSpy = sinon.spy(dba, 'getItemsUsingCache');
      this.getCacheSpy = sinon.spy(cache, 'get');
      this.aggregateItemsSpy = sinon.spy(dba, 'aggregateItems');
      this.setCacheSpy = sinon.spy(cache, 'set');

      const item = await makeRequest(this.appLib, sampleData0._id, true);
      checkForEqualityConsideringInjectedFields(item, sampleDataToCompare0);

      this.getItemsUsingCacheSpy.callCount.should.equal(1);
      this.aggregateItemsSpy.callCount.should.equal(1);

      this.getCacheSpy.callCount.should.equal(2);

      // 1st getCache call made for rolesAndPermissions, 2nd for model1s
      const getModel1sCacheArgs = this.getCacheSpy.args[1];
      const [getModel1sCacheKey] = getModel1sCacheArgs;
      this.model1sCacheKey = getModel1sCacheKey;

      this.setCacheSpy.callCount.should.equal(1);
      const [setModel1sCacheArgs] = this.setCacheSpy.args;
      const [setModel1sCacheKey, model1sValue] = setModel1sCacheArgs;
      this.model1sCacheKey.should.equal(setModel1sCacheKey);

      // body.data for GET single record is an object, cache value is of array type
      // cache contains value as is i.e. with ObjectID
      const stringifiedCachedRecord = stringifyObjectId(model1sValue[0]);
      checkForEqualityConsideringInjectedFields(item, stringifiedCachedRecord);

      // request with same params to get value from cache
      const item2 = await makeRequest(this.appLib, sampleData0._id);
      checkForEqualityConsideringInjectedFields(item2, sampleDataToCompare0);

      this.getItemsUsingCacheSpy.callCount.should.equal(2);
      // db call count is not increased
      this.aggregateItemsSpy.callCount.should.equal(1);

      // 1st and 3rd for rolesAndPermissions and 2nd and 4th for model1s
      this.getCacheSpy.callCount.should.equal(4);
      this.setCacheSpy.callCount.should.equal(1);
    });
  });

  /**
   * Each request gets rolesAndPermissions from cache.
   * Test steps:
   * 0. Create 2 items
   * 1. Get 1st item from db (this action caches the item, gets cached rolesAndPermissions from app setup)
   * 2. Get 1st item from cache (also gets cached rolesAndPermissions)
   * 3. (Here comes multiple branches) Post new item or Put/Delete 2nd item, it should clear cache for whole item collection
   * 4. Get 1st item, it should be retrieved from db
   */
  describe('Cache complex scenario', () => {
    before(async function () {
      this.appLib = prepareEnv();

      this.db = await getMongoConnection(this.appLib.options.MONGODB_URI);

      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enablePermissions: false,
      });
    });

    after(async function () {
      await this.db.close();
    });

    beforeEach(async function () {
      await this.appLib.setup();

      return Promise.all([this.db.collection(modelName).deleteMany({}), this.appLib.setup()]);
    });

    afterEach(function () {
      return this.appLib.shutdown();
    });

    const postData = async (appLib, data) => {
      const res = await apiRequest(appLib)
        .post('/graphql')
        .send(buildGraphQlCreate(modelName, _.omit(data, '_id'), selectFields))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200);
      const item = res.body.data[`${modelName}Create`];
      should(item._id).not.be.empty();
      return item;
    };

    const step0 = async function () {
      const item1 = await postData(this.appLib, sampleData0);
      this.getCacheSpy.callCount.should.equal(1);

      const item2 = await postData(this.appLib, sampleData1);
      this.getCacheSpy.callCount.should.equal(2);

      return [item1, item2];
    };

    const step1 = async function (createdItemId) {
      const item = await makeRequest(this.appLib, createdItemId);
      checkForEqualityConsideringInjectedFields(item, { ...sampleDataToCompare0, _id: createdItemId });

      this.getItemsUsingCacheSpy.callCount.should.equal(1);
      // +2 - rolesAndPermissions and item
      this.getCacheSpy.callCount.should.equal(4);
      this.aggregateItemsSpy.callCount.should.equal(1);
      this.setCacheSpy.callCount.should.equal(1);
    };

    const step2 = async function (createdItemId) {
      const item = await makeRequest(this.appLib, createdItemId);
      checkForEqualityConsideringInjectedFields(item, { ...sampleDataToCompare0, _id: createdItemId });

      this.getItemsUsingCacheSpy.callCount.should.equal(2);
      this.getCacheSpy.callCount.should.equal(6);

      this.aggregateItemsSpy.callCount.should.equal(1);
      this.setCacheSpy.callCount.should.equal(1);
    };

    const step4 = async function (itemId) {
      // no cache - all functions must be called
      const beforeGetItemsCallCount = this.getItemsUsingCacheSpy.callCount;
      const beforeGetCacheSpy = this.getCacheSpy.callCount;
      const beforeAggregateItemsSpy = this.aggregateItemsSpy.callCount;
      const beforeSetCacheSpy = this.setCacheSpy.callCount;

      await makeRequest(this.appLib, itemId);
      // res is ignored because of different format of update/create/delete
      this.getItemsUsingCacheSpy.callCount.should.equal(beforeGetItemsCallCount + 1);
      this.getCacheSpy.callCount.should.equal(beforeGetCacheSpy + 2);
      this.aggregateItemsSpy.callCount.should.equal(beforeAggregateItemsSpy + 1);
      this.setCacheSpy.callCount.should.equal(beforeSetCacheSpy + 1);
    };

    const cacheTest = async function (step3) {
      const { dba, cache } = this.appLib;
      this.getItemsUsingCacheSpy = sinon.spy(dba, 'getItemsUsingCache');
      this.getCacheSpy = sinon.spy(cache, 'get');
      this.aggregateItemsSpy = sinon.spy(dba, 'aggregateItems');
      this.setCacheSpy = sinon.spy(cache, 'set');

      const items = await step0.call(this);
      const itemId = items[0]._id.toString();
      const itemId2 = items[1]._id.toString();
      await step1.call(this, itemId);
      await step2.call(this, itemId);
      await step3.call(this, itemId2);
      await step4.call(this, itemId);
    };

    it('clear cache by creating new item', function () {
      const step3 = async function () {
        this.clearCacheForModel = sinon.spy(this.appLib.cache, 'clearCacheForModel');
        await postData(this.appLib, sampleData2);
        this.clearCacheForModel.callCount.should.equal(1);
      };
      return cacheTest.call(this, step3);
    });

    it('clear cache by deleting old item', function () {
      const step3 = async function (itemId2) {
        this.clearCacheForModel = sinon.spy(this.appLib.cache, 'clearCacheForModel');
        const res = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlDeleteOne(modelName, itemId2))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        this.clearCacheForModel.callCount.should.equal(1);
      };
      return cacheTest.call(this, step3);
    });

    it('clear cache by updating old item', function () {
      const step3 = async function (itemId2) {
        this.clearCacheForModel = sinon.spy(this.appLib.cache, 'clearCacheForModel');
        await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlUpdateOne(modelName, _.omit(sampleData0, '_id'), itemId2, selectFields)) // update with the same object
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        this.clearCacheForModel.callCount.should.equal(1);
      };
      return cacheTest.call(this, step3);
    });
  });
});
