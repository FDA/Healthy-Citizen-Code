const should = require('should');
const sinon = require('sinon');

const {
  checkForEqualityConsideringInjectedFields,
  samples: { sampleData0, sampleData1, sampleDataToCompare0 },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  apiRequest,
} = require('../test-util');
const { buildGraphQlDxQuery } = require('../graphql-util');

describe('V5 Backend Cache Disabled', () => {
  const modelName = 'model1s';
  beforeEach(async function () {
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

  afterEach(async function () {
    await this.db.close();
    return this.appLib.shutdown();
  });

  it('when cache is disabled returns value from db on 2nd GET request', async function () {
    delete process.env.REDIS_URL;
    await this.appLib.setup();

    const { dba, cache } = this.appLib;
    this.getItemsUsingCacheSpy = sinon.spy(dba, 'getItemsUsingCache');
    this.getCacheSpy = sinon.spy(cache, 'get');
    this.aggregateItemsSpy = sinon.spy(dba, 'aggregateItems');
    this.setCacheSpy = sinon.spy(cache, 'set');

    const dxQuery = `["_id", "=", "${sampleData0._id}"]`;
    const makeRequest = () =>
      apiRequest(this.appLib)
        .post('/graphql')
        .send(
          buildGraphQlDxQuery(
            modelName,
            dxQuery,
            undefined,
            `items { _id, deletedAt, string, encounters { _id, diagnoses {_id, data }, vitalSigns { _id, data, array } } }`
          )
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200);
    const res = await makeRequest();
    should(res.body.errors).be.undefined();
    const item = res.body.data[`${modelName}Dx`].items[0];
    checkForEqualityConsideringInjectedFields(item, sampleDataToCompare0);

    this.getItemsUsingCacheSpy.callCount.should.equal(1);
    this.getCacheSpy.callCount.should.equal(2);
    this.aggregateItemsSpy.callCount.should.equal(1);
    // due to disabled cache app unsuccessfully tries to cache every call after cache miss
    // so there are 2 tries: rolesAndPermission and model1s
    this.setCacheSpy.callCount.should.equal(2);

    // request with same params to get value from cache
    const res2 = await makeRequest();
    should(res2.body.errors).be.undefined();
    const item2 = res2.body.data[`${modelName}Dx`].items[0];
    checkForEqualityConsideringInjectedFields(item2, sampleDataToCompare0);

    this.getItemsUsingCacheSpy.callCount.should.equal(2);
    this.getCacheSpy.callCount.should.equal(4);
    this.aggregateItemsSpy.callCount.should.equal(2);
    this.setCacheSpy.callCount.should.equal(4);
  });
});
