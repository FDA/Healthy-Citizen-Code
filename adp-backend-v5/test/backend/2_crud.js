const should = require('should');
const _ = require('lodash');

const {
  buildGraphQlDeleteOne,
  buildGraphQlUpdateOne,
  buildGraphQlDxQuery,
  buildGraphQlCreate,
} = require('../graphql-util');

const {
  checkForEqualityConsideringInjectedFields,
  samples: { sampleData0, sampleData1, sampleData2, sampleDataToCompare0, sampleDataToCompare2 },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  checkItemSoftDeleted,
  conditionForActualRecord,
  apiRequest,
} = require('../test-util');

// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
describe('V5 Backend CRUD', () => {
  const modelName = 'model1s';
  const selectFields = `_id, deletedAt, string, encounters { _id, diagnoses {_id, data }, vitalSigns { _id, data, array } }`;

  before(async function () {
    this.appLib = prepareEnv();

    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
      enablePermissions: false,
    });

    const [db] = await Promise.all([getMongoConnection(this.appLib.options.MONGODB_URI), this.appLib.setup()]);
    this.db = db;
  });

  after(async function () {
    await this.db.dropDatabase();
    await Promise.all([this.db.close(), this.appLib.shutdown()]);
  });

  beforeEach(async function () {
    const sampleDataModel2 = [{ data: 0 }, { data: 1 }, { data: 2 }, { data: 3 }].map((d) => ({
      ...d,
      ...conditionForActualRecord,
    }));
    await Promise.all([this.db.collection('model1s').deleteMany({}), this.db.collection('model2s').deleteMany({})]);
    await Promise.all([
      this.db.collection('model1s').insertOne(sampleData1),
      this.db.collection('model1s').insertOne(sampleData2),
      this.db.collection('model2s').insertMany(sampleDataModel2),
    ]);
  });

  // Create item
  describe('Create Item', () => {
    describe('1st level', () => {
      it('posts and stores 1st level data', async function () {
        const res = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(sampleData0, '_id')))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        const createdItem = res.body.data[`${modelName}Create`];
        const savedId = createdItem._id;
        should(savedId).not.be.empty();

        const dxQuery = `["_id", "=", "${savedId.toString()}"]`;
        const res2 = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlDxQuery(modelName, dxQuery, undefined, `items { ${selectFields} }`))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        should(res2.body.errors).be.undefined();
        const { items } = res2.body.data[`${modelName}Dx`];
        should(items).not.be.empty();
        const item = items[0];
        checkForEqualityConsideringInjectedFields(item, { ...sampleDataToCompare0, _id: savedId });
      });
    });

    describe('1st level, wrong path', () => {
      it('show error message', async function () {
        const res = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlCreate('notExistingModel', _.omit(sampleData0, '_id')))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400);
        should(res.body.errors).not.be.empty();
      });
    });
  });

  describe('Get Items', () => {
    describe('1st level', () => {
      it('returns correct 1st level data', async function () {
        const res = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlDxQuery(modelName, undefined, undefined, `items { ${selectFields} }`))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        should(res.body.errors).be.undefined();
        const { items } = res.body.data[`${modelName}Dx`];
        should(items.length).be.equal(1); // since limitReturnedRecords is 1

        checkForEqualityConsideringInjectedFields(items[0], sampleDataToCompare2); // since sorting is by _id
      });
    });

    describe('from model 2 capped to 3 items in return', () => {
      it('returns 3 items', async function () {
        const res = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlDxQuery('model2s', undefined, undefined))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        should(res.body.errors).be.undefined();
        const { items } = res.body.data.model2sDx;
        should(items.length).be.equal(3); // since limitReturnedRecords is 3
      });
    });

    describe('Get item', () => {
      describe('1st level', () => {
        it('returns correct 1st level data', async function () {
          const res = await apiRequest(this.appLib)
            .post('/graphql')
            .send(
              buildGraphQlDxQuery(
                modelName,
                '["_id", "=", "587179f6ef4807703afd0dff"]',
                undefined,
                `items { ${selectFields} }`
              )
            )
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          should(res.body.errors).be.undefined();
          const { items } = res.body.data[`${modelName}Dx`];
          checkForEqualityConsideringInjectedFields(items[0], sampleDataToCompare2);
        });
      });
    });

    // Update Item
    describe('Update Item', () => {
      describe('1st level', () => {
        it('updates and stores 1st level data', async function () {
          const updateRes = await apiRequest(this.appLib)
            .post('/graphql')
            .send(buildGraphQlUpdateOne(modelName, _.omit(sampleData0, '_id'), sampleData1._id))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          should(updateRes.body.errors).be.undefined();

          const getRes = await apiRequest(this.appLib)
            .post('/graphql')
            .send(
              buildGraphQlDxQuery(
                modelName,
                `["_id", "=", "${sampleData1._id}"]`,
                undefined,
                `items { ${selectFields} }`
              )
            )
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          should(getRes.body.errors).be.undefined();
          const item = getRes.body.data[`${modelName}Dx`].items[0];

          checkForEqualityConsideringInjectedFields(_.omit(item, ['_id']), _.omit(sampleDataToCompare0, ['_id']));
        });

        it('puts empty object', async function () {
          const updateRes = await apiRequest(this.appLib)
            .post('/graphql')
            .send(buildGraphQlUpdateOne(modelName, {}, sampleData2._id))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          should(updateRes.body.errors).be.undefined();

          const getRes = await apiRequest(this.appLib)
            .post('/graphql')
            .send(
              buildGraphQlDxQuery(
                modelName,
                `["_id", "=", "${sampleData2._id}"]`,
                undefined,
                `items { ${selectFields} }`
              )
            )
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          should(getRes.body.errors).be.undefined();

          const item = getRes.body.data[`${modelName}Dx`].items[0];
          should(item.encounters).deepEqual([]);
        });
      });
    });

    // Delete Item
    describe('Delete Item', () => {
      describe('1st level', () => {
        it('soft deletes 1st level data', async function () {
          const delRes = await apiRequest(this.appLib)
            .post('/graphql')
            .send(buildGraphQlDeleteOne(modelName, sampleData1._id))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          should(delRes.body.errors).be.undefined();

          const getRes = await apiRequest(this.appLib)
            .post('/graphql')
            .send(
              buildGraphQlDxQuery(
                modelName,
                `["_id", "=", "${sampleData1._id}"]`,
                undefined,
                `items { ${selectFields} }`
              )
            )
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          should(getRes.body.errors).be.undefined();
          should(getRes.body.data[`${modelName}Dx`].items).be.empty();

          const deletedAt = await checkItemSoftDeleted(this.appLib.db, 'model1s', sampleData1._id);
          should(deletedAt).not.be.undefined();
        });
      });
    });
  });
});
