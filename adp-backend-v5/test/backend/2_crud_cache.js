const request = require('supertest');
require('should');
const sinon = require('sinon');
const _ = require('lodash');
const RedisMock = require('ioredis-mock');
RedisMock.Promise = require('bluebird');

const reqlib = require('app-root-path').require;

const {
  checkForEqualityConsideringInjectedFields,
  samples: { sampleData0, sampleData1, sampleData2, sampleDataToCompare0 },
  getMongoConnection,
  setAppAuthOptions,
  stringifyObjectId,
  prepareEnv,
} = reqlib('test/backend/test-util');

describe('V5 Backend Cache', () => {
  before(function() {
    prepareEnv();
    return getMongoConnection().then(db => {
      this.db = db;
    });
  });

  after(function() {
    return this.db.dropDatabase().then(() => this.db.close());
  });

  describe('Cache enabled/disabled', () => {
    beforeEach(function() {
      this.appLib = reqlib('/lib/app')();
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enablePermissions: false,
      });

      return this.db
        .collection('model1s')
        .remove({})
        .then(() => this.db.collection('model1s').insert(sampleData0))
        .then(() => this.db.collection('model1s').insert(sampleData1));
    });

    afterEach(function() {
      return this.appLib.shutdown();
    });

    it('when cache is enabled returns value from cache on 2nd GET request', function() {
      const redisMockClient = new RedisMock();
      // unlink is not implemented in ioredis-mock, but does logically the same as del
      redisMockClient.unlink = redisMockClient.del;
      // this.appLib.cache.getCacheStorage = () => Promise.resolve(redisMockClient);
      sinon.stub(this.appLib.cache, 'getCacheStorage').resolves(redisMockClient);

      return this.appLib
        .setup()
        .then(() => {
          const { dba, cache } = this.appLib;
          this.getItemsUsingCacheSpy = sinon.spy(dba, 'getItemsUsingCache');
          this.getCacheSpy = sinon.spy(cache, 'getCache');
          this.aggregateItemsSpy = sinon.spy(dba, 'aggregateItems');
          this.setCacheSpy = sinon.spy(cache, 'setCache');

          return request(this.appLib.app)
            .get(`/model1s/${sampleData0._id.toString()}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
        })
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          const { data } = res.body;
          checkForEqualityConsideringInjectedFields(data, sampleDataToCompare0);

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
          _.isEqual(data, stringifiedCachedRecord).should.be.true();

          // request with same params to get value from cache
          return request(this.appLib.app)
            .get(`/model1s/${sampleData0._id.toString()}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
        })
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          checkForEqualityConsideringInjectedFields(res.body.data, sampleDataToCompare0);

          this.getItemsUsingCacheSpy.callCount.should.equal(2);
          // db call count is not increased
          this.aggregateItemsSpy.callCount.should.equal(1);

          // 1st and 3rd for rolesAndPermissions and 2nd and 4th for model1s
          this.getCacheSpy.callCount.should.equal(4);
          this.setCacheSpy.callCount.should.equal(1);
        });
    });

    it('when cache is disabled returns value from db on 2nd GET request', function() {
      delete process.env.REDIS_URL;
      return this.appLib
        .setup()
        .then(() => {
          const { dba, cache } = this.appLib;
          this.getItemsUsingCacheSpy = sinon.spy(dba, 'getItemsUsingCache');
          this.getCacheSpy = sinon.spy(cache, 'getCache');
          this.aggregateItemsSpy = sinon.spy(dba, 'aggregateItems');
          this.setCacheSpy = sinon.spy(cache, 'setCache');

          return request(this.appLib.app)
            .get(`/model1s/${sampleData0._id.toString()}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
        })
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          checkForEqualityConsideringInjectedFields(res.body.data, sampleDataToCompare0);

          this.getItemsUsingCacheSpy.callCount.should.equal(1);
          this.getCacheSpy.callCount.should.equal(2);
          this.aggregateItemsSpy.callCount.should.equal(1);
          // due to disabled cache app unsuccessfully tries to cache every call after cache miss
          // so there are 2 tries: rolesAndPermission and model1s
          this.setCacheSpy.callCount.should.equal(2);

          // request with same params to get value from cache
          return request(this.appLib.app)
            .get(`/model1s/${sampleData0._id.toString()}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/);
        })
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          checkForEqualityConsideringInjectedFields(res.body.data, sampleDataToCompare0);

          this.getItemsUsingCacheSpy.callCount.should.equal(2);
          this.getCacheSpy.callCount.should.equal(4);
          this.aggregateItemsSpy.callCount.should.equal(2);
          this.setCacheSpy.callCount.should.equal(4);
        });
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
    beforeEach(function() {
      this.appLib = reqlib('/lib/app')();
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enablePermissions: false,
      });

      const redisMockClient = new RedisMock();
      // unlink is not implemented in ioredis-mock, but does logically the same as del
      redisMockClient.unlink = redisMockClient.del;
      // this.appLib.cache.getCacheStorage = () => Promise.resolve(redisMockClient);
      sinon.stub(this.appLib.cache, 'getCacheStorage').resolves(redisMockClient);

      return Promise.all([this.db.collection('model1s').remove({}), this.appLib.setup()]);
    });

    afterEach(function() {
      return this.appLib.shutdown();
    });

    const step0 = function() {
      let savedId1 = null;
      let savedId2 = null;
      return request(this.appLib.app)
        .post('/model1s')
        .send({ data: sampleData0 })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res1 => {
          res1.body.success.should.equal(true, res1.body.message);
          res1.body.should.have.property('id');
          savedId1 = res1.body.id;
          this.getCacheSpy.callCount.should.equal(1);

          return request(this.appLib.app)
            .post('/model1s')
            .send({ data: sampleData1 })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
        })
        .then(res2 => {
          res2.body.success.should.equal(true, res2.body.message);
          res2.body.should.have.property('id');
          savedId2 = res2.body.id;
          this.getCacheSpy.callCount.should.equal(2);

          return [savedId1, savedId2];
        });
    };
    const step1 = function() {
      return request(this.appLib.app)
        .get(`/model1s/${sampleData0._id.toString()}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          checkForEqualityConsideringInjectedFields(res.body.data, sampleDataToCompare0);

          this.getItemsUsingCacheSpy.callCount.should.equal(1);
          // +2 - rolesAndPermissions and item
          this.getCacheSpy.callCount.should.equal(4);
          this.aggregateItemsSpy.callCount.should.equal(1);
          this.setCacheSpy.callCount.should.equal(1);
        });
    };
    const step2 = function() {
      return request(this.appLib.app)
        .get(`/model1s/${sampleData0._id.toString()}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          checkForEqualityConsideringInjectedFields(res.body.data, sampleDataToCompare0);

          this.getItemsUsingCacheSpy.callCount.should.equal(2);
          this.getCacheSpy.callCount.should.equal(6);

          this.aggregateItemsSpy.callCount.should.equal(1);
          this.setCacheSpy.callCount.should.equal(1);
        });
    };
    const step4 = function() {
      // no cache - all functions must be called
      const beforeGetItemsCallCount = this.getItemsUsingCacheSpy.callCount;
      const beforeGetCacheSpy = this.getCacheSpy.callCount;
      const beforeAggregateItemsSpy = this.aggregateItemsSpy.callCount;
      const beforeSetCacheSpy = this.setCacheSpy.callCount;

      return request(this.appLib.app)
        .get(`/model1s/${sampleData0._id.toString()}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .then(() => {
          // res is ignored because of different format of update/create/delete
          this.getItemsUsingCacheSpy.callCount.should.equal(beforeGetItemsCallCount + 1);
          this.getCacheSpy.callCount.should.equal(beforeGetCacheSpy + 2);
          this.aggregateItemsSpy.callCount.should.equal(beforeAggregateItemsSpy + 1);
          this.setCacheSpy.callCount.should.equal(beforeSetCacheSpy + 1);
        });
    };
    const cacheTest = function(step3) {
      const { dba, cache } = this.appLib;
      this.getItemsUsingCacheSpy = sinon.spy(dba, 'getItemsUsingCache');
      this.getCacheSpy = sinon.spy(cache, 'getCache');
      this.aggregateItemsSpy = sinon.spy(dba, 'aggregateItems');
      this.setCacheSpy = sinon.spy(cache, 'setCache');

      return step0
        .call(this)
        .then(() => step1.call(this))
        .then(() => step2.call(this))
        .then(() => step3.call(this))
        .then(() => step4.call(this));
    };

    it('clear cache by creating new item', function() {
      const step3 = function() {
        this.clearCacheForModel = sinon.spy(this.appLib.cache, 'clearCacheForModel');
        return request(this.appLib.app)
          .post(`/model1s`)
          .send({ data: sampleData2 })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            this.clearCacheForModel.callCount.should.equal(1);
          });
      };
      return cacheTest.call(this, step3);
    });

    it('clear cache by deleting old item', function() {
      const step3 = function() {
        this.clearCacheForModel = sinon.spy(this.appLib.cache, 'clearCacheForModel');
        return request(this.appLib.app)
          .del(`/model1s/${sampleData0._id.toString()}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            this.clearCacheForModel.callCount.should.equal(1);
          });
      };
      return cacheTest.call(this, step3);
    });

    it('clear cache by updating old item', function() {
      const step3 = function() {
        this.clearCacheForModel = sinon.spy(this.appLib.cache, 'clearCacheForModel');
        return request(this.appLib.app)
          .put(`/model1s/${sampleData0._id.toString()}`)
          .send({ data: sampleData0 }) // update with the same object
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            this.clearCacheForModel.callCount.should.equal(1);
          });
      };
      return cacheTest.call(this, step3);
    });
  });
});
