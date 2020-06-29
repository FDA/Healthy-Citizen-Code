// check search[value] and q
// check wrong parameters
// check that return contains draw, total, filtered counts
// sort ordering - default from model or multiple orders in query or wrong query or nonexisting attribute in collection

const request = require('supertest');
require('should');
const _ = require('lodash');
const { ObjectID } = require('mongodb');

const { getMongoConnection, setAppAuthOptions, prepareEnv, conditionForActualRecord } = require('../test-util');

describe('V5 Backend Datatables Support', function () {
  const sampleDataModel5 = [
    // model 5 return is capped to 3 elements
    {
      _id: new ObjectID('587179f6ef4807703afd0dfa'),
      n: 1,
      s: 'c',
      d: new Date('2017-01-01 00:00:00'),
      q: 'aaa123',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df0'),
      n: 3,
      s: 'a',
      d: new Date('2017-01-01 01:00:00'),
      q: 'aaa12',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df7'),
      n: 7,
      s: 'i',
      d: new Date('2017-01-01 00:01:00'),
      q: 'aaa1',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df8'),
      n: 2,
      s: 'f',
      d: new Date('2019-01-01 00:00:00'),
      q: 'aaa',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df9'),
      n: 9,
      s: 'e',
      d: new Date('2018-01-01 00:00:00'),
      q: 'aaa456',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df4'),
      n: 4,
      s: 'j',
      d: new Date('2017-05-01 00:00:00'),
      q: '456',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df6'),
      n: 6,
      s: 'd',
      d: new Date('2017-01-01 00:00:02'),
      q: '456',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df5'),
      n: 5,
      s: 'h',
      d: new Date('2017-01-02 00:00:00'),
      q: '789',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df2'),
      n: 8,
      s: 'a',
      d: new Date('2017-01-03 00:00:00'),
      q: '',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df3'),
      n: 1,
      s: 'g',
      d: new Date('2017-01-01 00:00:01'),
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df1'),
      n: 0,
      s: 'b',
      d: new Date('2017-04-01 00:00:00'),
      as: [
        {
          _id: new ObjectID('487179f6ef4807703afd0df1'),
          n: 1,
          s: 'c',
          d: new Date('2017-01-01 00:00:00'),
          q: 'aaa123',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df0'),
          n: 3,
          s: 'a',
          d: new Date('2017-01-01 01:00:00'),
          q: 'aaa12',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df7'),
          n: 7,
          s: 'i',
          d: new Date('2017-01-01 00:01:00'),
          q: 'aaa1',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df8'),
          n: 2,
          s: 'f',
          d: new Date('2019-01-01 00:00:00'),
          q: 'aaa',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df9'),
          n: 9,
          s: 'e',
          d: new Date('2018-01-01 00:00:00'),
          q: 'aaa456',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df4'),
          n: 4,
          s: 'j',
          d: new Date('2017-05-01 00:00:00'),
          q: '456',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df6'),
          n: 6,
          s: 'd',
          d: new Date('2017-01-01 00:00:02'),
          q: '789',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df5'),
          n: 5,
          s: 'h',
          d: new Date('2017-01-02 00:00:00'),
          q: '789',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df2'),
          n: 8,
          s: 'a',
          d: new Date('2017-01-03 00:00:00'),
          q: '',
        },
        {
          _id: new ObjectID('487179f6ef4807703afd0df3'),
          n: 1,
          s: 'g',
          d: new Date('2017-01-01 00:00:01'),
        },
      ],
    },
  ].map((d) => ({ ...d, ...conditionForActualRecord }));

  const columnsDatatablesSpec = _.map(
    ['_id', 'n', 's', 'd', 'q'],
    (name, idx) =>
      `columns[${idx}][data]=${name}&columns[${idx}][name]=${name}&columns[${idx}][searchable]=true&columns[${idx}][orderable]=true&columns[${idx}][search]=&columns[${idx}][search][regex]=false`
  ).join('&');

  before(async function () {
    prepareEnv();
    this.appLib = require('../../lib/app')();
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
      enablePermissions: false,
    });

    const [db] = await Promise.all([getMongoConnection(), this.appLib.setup()]);
    this.db = db;
  });

  after(async function () {
    await this.db.dropDatabase();
    await Promise.all([this.db.close(), this.appLib.shutdown()]);
  });

  beforeEach(async function () {
    await this.db.collection('model5s').deleteMany({});
    await this.db.collection('model5s').insertMany(sampleDataModel5);
  });

  describe('1st level', function () {
    it('returns correct 1st level data without any parameters', function (done) {
      request(this.appLib.app)
        .get('/model5s')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          res.body.data[0]._id.should.equal('587179f6ef4807703afd0df9');
          res.body.data[1]._id.should.equal('587179f6ef4807703afd0df2');
          res.body.data[2]._id.should.equal('587179f6ef4807703afd0df7');
          done();
        });
    });
    it('returns correct 1st level data with draw parameters', function (done) {
      request(this.appLib.app)
        .get('/model5s?draw=1')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          res.body.data[0]._id.should.equal('587179f6ef4807703afd0df9');
          res.body.data[1]._id.should.equal('587179f6ef4807703afd0df2');
          res.body.data[2]._id.should.equal('587179f6ef4807703afd0df7');
          res.body.recordsTotal.should.equal(11);
          res.body.recordsFiltered.should.equal(11);
          done();
        });
    });
    it('returns correct 1st level data with number sort asc parameters in datatables format with all visible columns', function (done) {
      request(this.appLib.app)
        .get(
          '/model5s?order[0][column]=1&order[0][dir]=asc&visible_columns[_id]=true&visible_columns[n]=true&visible_columns[s]=true&visible_columns[d]=true&visible_columns[as]=true'
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          res.body.data[0].n.should.equal(0);
          res.body.data[1].n.should.equal(1);
          res.body.data[2].n.should.equal(1);
          done();
        });
    });
    it('returns correct 1st level data with number sort asc parameters in datatables format with some visible columns', function (done) {
      request(this.appLib.app)
        .get(
          '/model5s?order[0][column]=0&order[0][dir]=asc&visible_columns[_id]=false&visible_columns[n]=true&visible_columns[s]=true&visible_columns[d]=true&visible_columns[as]=true'
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          res.body.data[0].n.should.equal(0);
          res.body.data[1].n.should.equal(1);
          res.body.data[2].n.should.equal(1);
          done();
        });
    });
    it('returns correct 1st level data with string sort desc parameters', function (done) {
      request(this.appLib.app)
        .get(
          '/model5s?order[0][column]=1&order[0][dir]=desc&visible_columns[_id]=false&visible_columns[n]=true&visible_columns[s]=true&visible_columns[d]=true&visible_columns[as]=true'
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          res.body.data[0].s.should.equal('j');
          res.body.data[1].s.should.equal('i');
          res.body.data[2].s.should.equal('h');
          done();
        });
    });
    it('returns correct 1st level data with date sort desc parameters', function (done) {
      request(this.appLib.app)
        .get(
          '/model5s?order[0][column]=2&order[0][dir]=desc&visible_columns[_id]=false&visible_columns[n]=true&visible_columns[s]=true&visible_columns[d]=true&visible_columns[as]=true'
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          new Date(res.body.data[0].d).getTime().should.equal(new Date('2019-01-01 00:00:00').getTime());
          new Date(res.body.data[1].d).getTime().should.equal(new Date('2018-01-01 00:00:00').getTime());
          new Date(res.body.data[2].d).getTime().should.equal(new Date('2017-05-01 00:00:00').getTime());
          done();
        });
    });
    it('returns correct 1st level data with all datatables parameters', function (done) {
      request(this.appLib.app)
        .get(
          '/model5s?draw=1&order[0][column]=0&order[0][dir]=asc&length=2&start=1&visible_columns[_id]=false&visible_columns[n]=true&visible_columns[s]=true&visible_columns[d]=true&visible_columns[as]=true'
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(2);
          res.body.data[0].n.should.equal(1);
          res.body.data[1].n.should.equal(1);
          res.body.recordsTotal.should.equal(11);
          res.body.recordsFiltered.should.equal(11);
          done();
        });
    });
    it('returns correct 1st level data with all datatables parameters and search in searchable field', function (done) {
      request(this.appLib.app)
        .get(
          '/model5s?draw=1&order[0][column]=0&order[0][dir]=desc&length=2&start=1&search[value]=456&visible_columns[_id]=false&visible_columns[n]=true&visible_columns[s]=true&visible_columns[d]=true&visible_columns[as]=true'
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(2);
          res.body.data[0].n.should.equal(6);
          res.body.data[1].n.should.equal(4);
          res.body.recordsTotal.should.equal(11);
          res.body.recordsFiltered.should.equal(3);
          done();
        });
    });
    it('returns correct 1st level data with all datatables parameters and search in searchable field for angular datatables directive', function (done) {
      request(this.appLib.app)
        .get(
          `/model5s?draw=1&order[0][column]=1&order[0][dir]=desc&length=2&start=1&search[value]=aaa&search[regex]=true&${columnsDatatablesSpec}`
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end((err, res) => {
          res.body.success.should.equal(true, res.body.message);
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.data.length.should.equal(2);
          res.body.data[0].n.should.equal(7);
          res.body.data[1].n.should.equal(3);
          res.body.recordsTotal.should.equal(11);
          res.body.recordsFiltered.should.equal(5);
          done();
        });
    });
  });
});
