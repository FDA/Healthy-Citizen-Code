const request = require('supertest');
const should = require('should');
const { ObjectID } = require('mongodb');

const reqlib = require('app-root-path').require;

const { getMongoConnection, setAppAuthOptions, prepareEnv, conditionForActualRecord } = reqlib('test/test-util');
const { buildGraphQlDxQuery, buildGraphQlCreate } = reqlib('test/graphql-util.js');

describe('V5 Backend DevExtreme and Quick Filter Support', () => {
  const modelName = 'model5s';
  const quickFiltersModelName = 'quickFilters';

  const sampleDataModel5 = [
    {
      _id: new ObjectID('587179f6ef4807703afd0dfa'),
      n: 1,
      d: new Date('2017-01-01T00:00:00.000Z'),
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df0'),
      n: 3,
      d: new Date('2017-01-01T00:00:00.000Z'),
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df7'),
      n: 7,
      d: new Date('2019-01-01T00:00:00.000Z'),
    },
  ].map(r => ({ ...r, ...conditionForActualRecord }));

  const quickFilterRecord = {
    _id: new ObjectID('587179f6ef4807703afd1111'),
    name: 'model5sFilter',
    model: modelName,
    filter: `{ n: { '$gt': 2 } }`,
    ...conditionForActualRecord,
  };

  const quickFilterId = quickFilterRecord._id.toString();
  const dxQuery = '["d", "=", "2017-01-01T00:00:00.000Z"]';

  before(async function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
      enablePermissions: false,
    });

    const [db] = await Promise.all([getMongoConnection(), this.appLib.setup()]);
    this.db = db;
  });

  beforeEach(async function() {
    await this.db.collection(modelName).deleteMany({});
    await this.db.collection(modelName).insertMany(sampleDataModel5);
    await this.db.collection('quickFilters').deleteMany({});
    await this.db.collection('quickFilters').insertOne(quickFilterRecord);
  });

  after(async function() {
    await this.db.dropDatabase();
    await Promise.all([this.db.close(), this.appLib.shutdown()]);
  });

  describe('Filtering', () => {
    it('should filter with Quick Filter', async function() {
      const res = await request(this.appLib.app)
        .post('/graphql')
        .send(buildGraphQlDxQuery(modelName, undefined, quickFilterId, `items { _id, n, d }`))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      const {
        statusCode,
        body: { data, errors },
      } = res;
      should(statusCode).be.equal(200);
      should(errors).be.undefined();
      const { items } = data.model5sDx;
      should(items.length).be.equal(2);
      should(items).be.containDeep([
        {
          _id: '587179f6ef4807703afd0df0',
          n: 3,
          d: '2017-01-01T00:00:00.000Z',
        },
        {
          _id: '587179f6ef4807703afd0df7',
          n: 7,
          d: '2019-01-01T00:00:00.000Z',
        },
      ]);
    });

    it('should filter with DevExtreme filter', async function() {
      const res = await request(this.appLib.app)
        .post('/graphql')
        .send(buildGraphQlDxQuery(modelName, dxQuery, undefined, `items { _id, n, d }`))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      const {
        statusCode,
        body: { data, errors },
      } = res;
      should(statusCode).be.equal(200);
      should(errors).be.undefined();
      const { items } = data.model5sDx;
      should(items.length).be.equal(2);
      should(items).be.containDeep([
        {
          _id: '587179f6ef4807703afd0dfa',
          n: 1,
          d: '2017-01-01T00:00:00.000Z',
        },
        {
          _id: '587179f6ef4807703afd0df0',
          n: 3,
          d: '2017-01-01T00:00:00.000Z',
        },
      ]);
    });

    it('should filter with DevExtreme and Quick Filters combined', async function() {
      const res = await request(this.appLib.app)
        .post('/graphql')
        .send(buildGraphQlDxQuery(modelName, dxQuery, quickFilterId, `items { _id, n, d }`))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      const {
        statusCode,
        body: { data, errors },
      } = res;
      should(statusCode).be.equal(200);
      should(errors).be.undefined();
      const { items } = data.model5sDx;
      should(items.length).be.equal(1);
      should(items).be.containDeep([
        {
          _id: '587179f6ef4807703afd0df0',
          n: 3,
          d: '2017-01-01T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('Quick Filter record saving', () => {
    it('should not create a quick filter record on invalid filter field', async function() {
      const newQuickFilter = { name: '1', model: modelName, filter: '{ "n": { "$ft": 1 }}' };
      const res = await request(this.appLib.app)
        .post('/graphql')
        .send(buildGraphQlCreate(quickFiltersModelName, newQuickFilter))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      const {
        statusCode,
        body: { errors },
      } = res;
      should(statusCode).be.equal(200);
      should(errors).not.be.undefined();
      should(errors.length).be.equal(1);
      should(errors[0].message).be.equal('unknown operator: $ft');
    });

    it('should not create a quick filter record on invalid model field', async function() {
      const newQuickFilter = { name: '1', model: 'not_existing_model', filter: '{ "n": { "$gt": 1 }}' };
      const res = await request(this.appLib.app)
        .post('/graphql')
        .send(buildGraphQlCreate(quickFiltersModelName, newQuickFilter))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      const {
        statusCode,
        body: { errors },
      } = res;
      should(statusCode).be.equal(200);
      should(errors).not.be.undefined();
      should(errors.length).be.equal(1);
      should(errors[0].message).be.equal(`Model 'not_existing_model' does not exist`);
    });

    it('should create a quick filter record with correct data', async function() {
      const newQuickFilter = { name: '1', model: modelName, filter: '{ "n": { "$gt": 1 }}' };
      const res = await request(this.appLib.app)
        .post('/graphql')
        .send(buildGraphQlCreate(quickFiltersModelName, newQuickFilter))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      const {
        statusCode,
        body: { errors, data },
      } = res;
      should(statusCode).be.equal(200);
      should(errors).be.undefined();
      should(data.quickFiltersCreate._id).not.be.undefined();
    });
  });

  describe(`GraphQL 'testQuickFilter' query`, () => {
    const query = projections => ({
      query: `query { testQuickFilter (model: "${modelName}", filter: "${quickFilterRecord.filter}") { ${projections} } }`,
    });

    it('should get items and count', async function() {
      const res = await request(this.appLib.app)
        .post('/graphql')
        .send(query('items count'))
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      const {
        statusCode,
        body: { errors, data },
      } = res;
      should(statusCode).be.equal(200);
      should(errors).be.undefined();
      const { items, count } = data.testQuickFilter;
      should(count).be.equal(2);
      should(items).be.containDeep([
        {
          _id: '587179f6ef4807703afd0df0',
          n: 3,
          d: '2017-01-01T00:00:00.000Z',
          deletedAt: '1970-01-01T00:00:00.000Z',
        },
        {
          _id: '587179f6ef4807703afd0df7',
          n: 7,
          d: '2019-01-01T00:00:00.000Z',
          deletedAt: '1970-01-01T00:00:00.000Z',
        },
      ]);
    });
  });
});
