const should = require('should');
const assert = require('assert');
const _ = require('lodash');
const { ObjectID } = require('mongodb');

const { prepareEnv, getMongoConnection, apiRequest, setAppAuthOptions } = require('../test-util');
const { buildGraphQlUpdateOne, buildGraphQlDxQuery, buildGraphQlCreate } = require('../graphql-util');

describe('V5 Backend Transformers', () => {
  const sampleData0 = {
    n: 7,
    n2: 8,
    s: ' abc ',
    d: new Date('2016-01-01'),
    _id: new ObjectID('187179f6ef4807703afd0df7'),
    as: [
      {
        sn: 7,
        sn2: 9,
        ss: ' abc ',
        sd: new Date('2016-01-01'),
        _id: new ObjectID('287179f6ef4807703afd0df7'),
      },
      {
        sn: 7,
        sn2: 9,
        ss: ' abc ',
        sd: new Date('2016-01-01'),
        _id: new ObjectID('387179f6ef4807703afd0df7'),
      },
    ],
    assocArray: {
      key1: {
        sn: 7,
        sn2: 9,
        ss: ' abc ',
        sd: new Date('2016-01-01'),
        _id: new ObjectID('287179f6ef4807703afd0df7'),
      },
      key2: {
        sn: 7,
        sn2: 9,
        ss: ' abc ',
        sd: new Date('2016-01-01'),
        _id: new ObjectID('387179f6ef4807703afd0df7'),
      },
    },
  };
  const sampleData1 = {
    n: 10,
    n2: 7,
    s: 'def',
    d: new Date('2016-01-01'),
    as: [
      {
        sn: 9,
        sn2: 11,
        ss: 'def ',
        sd: new Date('2016-01-01'),
      },
      {
        sn: 9,
        sn2: 11,
        ss: ' def',
        sd: new Date('2016-01-01'),
      },
    ],
    assocArray: {
      key1: {
        sn: 9,
        sn2: 11,
        ss: 'def ',
        sd: new Date('2016-01-01'),
      },
      key2: {
        sn: 9,
        sn2: 11,
        ss: ' def',
        sd: new Date('2016-01-01'),
      },
    },
  };

  before(async function () {
    this.appLib = prepareEnv();

    setAppAuthOptions(this.appLib, { requireAuthentication: false });
    await this.appLib.setup();
    this.dba = require('../../lib/database-abstraction')(this.appLib);
    this.modelName = 'model6s';
    this.M6 = this.appLib.db.collection(this.modelName);
  });

  after(async function () {
    await this.appLib.shutdown();
    const db = await getMongoConnection(this.appLib.options.MONGODB_URI);
    await db.dropDatabase();
    await db.close();
  });

  beforeEach(function () {
    return this.M6.deleteMany({});
  });

  // This is a quick sanity check. Most tests are done in CRUD section below
  describe('when called directly in db call', () => {
    describe('creates', () => {
      it('1st level data', async function () {
        const data = _.cloneDeep(sampleData0);
        const userContext = { _id: 1 };
        await this.dba.createItem(this.modelName, userContext, data);
        const foundData = await this.dba.getPreparedItems({ modelName: this.modelName, userContext });
        const item = foundData[0];
        should(item.n).be.equal(8);
        should(item.s).be.equal('abcQW');
        should(item.d.getTime()).be.equal(new Date('2017-01-01').getTime());

        const obj = {
          sn: 8,
          sn2: 10,
          ss: 'abcQW',
          sd: new Date('2016-01-01T00:00:00.000Z'),
        };
        should(item.as).be.containDeepOrdered([obj, obj]);
        should(item.assocArray).be.containDeepOrdered({ key1: obj, key2: obj });
      });
    });
  });

  describe('When called via CRUD', () => {
    const modelName = 'model6s';
    const selectFields = `_id, deletedAt, n, n2, s, d, as { sn, sn2, ss, sd, _id }, assocArray, numberWithInlineSynthesizer, virtualStringWithInlineSynthesizer`;

    describe('Create Item', () => {
      it('posts and stores 1st level data', async function () {
        const postRes = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(sampleData0, '_id'), selectFields))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        const createdItem = postRes.body.data[`${modelName}Create`];
        const savedId = createdItem._id;

        const dxQuery = `["_id", "=", "${savedId}"]`;
        const res = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlDxQuery(modelName, dxQuery, undefined, `items { ${selectFields} }`))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        should(res.body.errors).be.undefined();
        const { items } = res.body.data[`${modelName}Dx`];
        should(items).not.be.empty();
        const item = items[0];
        should(item._id.toString()).be.equal(savedId);
        should(item.n).be.equal(8);
        should(item.s).be.equal('abcQW');
        should(new Date(item.d).getTime()).be.equal(new Date('2017-01-01').getTime());

        const obj = {
          sn: 8,
          sn2: 10,
          ss: 'abcQW',
          sd: '2016-01-01T00:00:00.000Z',
        };
        should(item.as).be.containDeepOrdered([obj, obj]);
        should(item.assocArray).be.containDeepOrdered({ key1: obj, key2: obj });

        // should not invoke synthesize.code function, as numberWithInlineSynthesizer field is not virtual
        item.numberWithInlineSynthesizer.should.equal(0);
        // should invoke synthesize function, as virtualStringWithInlineSynthesizer field is virtual
        item.virtualStringWithInlineSynthesizer.should.equal('virtualValueForViewAction');
        const docInDB = await this.M6.findOne({ _id: new ObjectID(savedId) });
        // not virtual synthesize field is stored as it sent to the client
        docInDB.numberWithInlineSynthesizer.should.equal(0);
        // virtual field is not stored in the db
        should.not.exist(docInDB.virtualStringWithInlineSynthesizer);
      });

      it('supports standard transformers', async function () {
        const sampleDataWithStandardTransformers = _.cloneDeep(sampleData0);
        sampleDataWithStandardTransformers.height = [6, 1];
        sampleDataWithStandardTransformers.weight = 100;

        const postRes = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(sampleDataWithStandardTransformers, '_id')))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);
        // .expect(200);
        const createdItem = postRes.body.data[`${modelName}Create`];
        const savedId = createdItem._id;

        const data = await this.M6.findOne({ _id: ObjectID(savedId) });
        data.height.should.equal(185);
        data.weight.should.equal(45359.237001003545);

        const dxQuery = `["_id", "=", "${savedId}"]`;
        const res = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlDxQuery(modelName, dxQuery, undefined, `items { _id, height, weight }`))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        const item = res.body.data[`${modelName}Dx`].items[0];

        assert(item._id.toString() === savedId);
        item.height.should.be.deepEqual(sampleDataWithStandardTransformers.height);
        item.weight.should.equal(100);
      });
    });

    describe('Update Item', () => {
      it('puts and stores 1st level data', async function () {
        const postRes = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(sampleData0, '_id')))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        const createdItem = postRes.body.data[`${modelName}Create`];
        const savedId = createdItem._id;

        const dxQuery = `["_id", "=", "${savedId}"]`;
        const res = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlDxQuery(modelName, dxQuery, undefined, `items { ${selectFields} }`))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        const item = res.body.data[`${modelName}Dx`].items[0];

        assert(item._id.toString() === savedId);
        item.n.should.equal(8);
        item.s.should.equal('abcQW');
        new Date(item.d).getTime().should.equal(new Date('2017-01-01').getTime());
        item.as[0].sn.should.equal(8);
        item.as[0].ss.should.equal('abcQW');
        item.as[1].sn.should.equal(8);
        item.as[1].ss.should.equal('abcQW');

        await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlUpdateOne(modelName, _.omit(sampleData1, '_id'), savedId))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);

        const res2 = await apiRequest(this.appLib)
          .post('/graphql')
          .send(buildGraphQlDxQuery(modelName, dxQuery, undefined, `items { ${selectFields} }`))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
        const item2 = res2.body.data[`${modelName}Dx`].items[0];
        assert(item2._id.toString() === savedId);
        item2.n.should.equal(11);
        item2.s.should.equal('defQW');
        new Date(item2.d).getTime().should.equal(new Date('2017-01-01').getTime());
        item2.as[0].sn.should.equal(10);
        item2.as[0].ss.should.equal('defQW');
        item2.as[1].sn.should.equal(10);
        item2.as[1].ss.should.equal('defQW');

        // should not invoke synthesize.code function, as numberWithInlineSynthesizer field is not virtual
        item2.numberWithInlineSynthesizer.should.equal(0);
        // should invoke synthesize function, as virtualStringWithInlineSynthesizer field is virtual
        item2.virtualStringWithInlineSynthesizer.should.equal('virtualValueForViewAction');
        // should.not.exist(data.virtualStringWithInlineSynthesizer);
        const docInDB = await this.M6.findOne({ _id: new ObjectID(savedId) });
        // not virtual synthesize field is stored as it sent to the client
        docInDB.numberWithInlineSynthesizer.should.equal(0);
        // virtual field is not stored in the db
        should.not.exist(docInDB.virtualStringWithInlineSynthesizer);
      });
    });
  });
});
