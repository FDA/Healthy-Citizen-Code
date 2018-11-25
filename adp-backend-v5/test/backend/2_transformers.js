/* Validate phone and email defaults */
// TODO: test delete

const should = require('should');
const assert = require('assert');
const _ = require('lodash');
const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const request = require('supertest');

const reqlib = require('app-root-path').require;

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
  };

  before(function() {
    require('dotenv').load({ path: './test/backend/.env.test' });
    this.appLib = reqlib('/lib/app')();
    this.appLib.isAuthenticated = (req, res, next) => next(); // disable authentication
    return this.appLib.setup().then(() => {
      this.dba = reqlib('/lib/database-abstraction')(this.appLib);
      this.M6 = mongoose.model('model6s');
    });
  });

  after(function() {
    return this.appLib.shutdown();
  });

  beforeEach(function() {
    return this.M6.remove({});
  });

  // This is a quick sanity check. Most tests are done in CRUD section below
  describe('when called directly in db call', () => {
    describe('creates', () => {
      it('1st level data', function() {
        const data = _.cloneDeep(sampleData0);
        const userContext = { _id: 1 };
        return this.dba
          .createItem(this.M6, userContext, data)
          .then(() => this.dba.findItems({ model: this.M6, userContext }))
          .then(foundData => {
            foundData[0].n.should.equal(8);
            foundData[0].s.should.equal('abcQW');
            foundData[0].as[0].sn.should.equal(8);
            foundData[0].as[0].ss.should.equal('abcQW');
            foundData[0].as[1].sn.should.equal(8);
            foundData[0].as[1].ss.should.equal('abcQW');
            new Date(foundData[0].d).getTime().should.equal(new Date('2017-01-01').getTime());
          });
      });
    });
  });

  describe('When called via CRUD', () => {
    describe('Create Item', () => {
      it('posts and stores 1st level data', function() {
        let savedId = null;
        return request(this.appLib.app)
          .post('/model6s')
          .send({ data: sampleData0 })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.should.have.property('id');
            savedId = res.body.id;

            return request(this.appLib.app)
              .get(`/model6s/${savedId}`)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/);
          })
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            const { data } = res.body;
            assert(data._id.toString() === savedId);
            data.n.should.equal(8);
            data.s.should.equal('abcQW');
            new Date(data.d).getTime().should.equal(new Date('2017-01-01').getTime());
            data.as[0].sn.should.equal(8);
            data.as[0].ss.should.equal('abcQW');
            data.as[1].sn.should.equal(8);
            data.as[1].ss.should.equal('abcQW');

            // should not invoke synthesize.code function, as numberWithInlineSynthesizer field is not virtual
            data.numberWithInlineSynthesizer.should.equal(0);
            // should invoke synthesize function, as virtualNumberWithInlineSynthesizer field is virtual
            data.virtualNumberWithInlineSynthesizer.should.equal('virtualValueForViewAction');
            // should.not.exist(data.virtualNumberWithInlineSynthesizer);
          })
          .then(() => this.M6.findOne({ _id: new ObjectID(savedId) }))
          .then(docInDB => {
            // not virtual synthesize field is stored as it sent to the client
            docInDB.numberWithInlineSynthesizer.should.equal(0);
            // virtual field is not stored in the db
            should.not.exist(docInDB.virtualNumberWithInlineSynthesizer);
          });
      });
      it('supports standard transformers', function() {
        let savedId = null;
        const sampleDataWithStandardTransformers = _.cloneDeep(sampleData0);
        sampleDataWithStandardTransformers.height = [6, 1];
        sampleDataWithStandardTransformers.weight = 100;
        return request(this.appLib.app)
          .post('/model6s')
          .send({ data: sampleDataWithStandardTransformers })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.should.have.property('id');
            savedId = res.body.id;

            return this.M6.findOne({});
          })
          .then(data => {
            data.height.should.equal(185);
            data.weight.should.equal(45359.237001003545);
          })
          .then(() =>
            request(this.appLib.app)
              .get(`/model6s/${savedId}`)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            assert(res.body.data._id.toString() === savedId);
            res.body.data.height.join(',').should.equal('6,1');
            res.body.data.weight.should.equal(100);
          });
      });
    });
    describe('Update Item', () => {
      it('puts and stores 1st level data', function() {
        let savedId = null;
        return request(this.appLib.app)
          .post('/model6s')
          .send({ data: sampleData0 })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.should.have.property('id');
            savedId = res.body.id;

            return request(this.appLib.app)
              .get(`/model6s/${savedId}`)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/);
          })
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            assert(res.body.data._id.toString() === savedId);
            res.body.data.n.should.equal(8);
            res.body.data.s.should.equal('abcQW');
            new Date(res.body.data.d).getTime().should.equal(new Date('2017-01-01').getTime());
            res.body.data.as[0].sn.should.equal(8);
            res.body.data.as[0].ss.should.equal('abcQW');
            res.body.data.as[1].sn.should.equal(8);
            res.body.data.as[1].ss.should.equal('abcQW');

            return request(this.appLib.app)
              .put(`/model6s/${savedId}`)
              .send({ data: sampleData1 })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/);
          })
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);

            return request(this.appLib.app)
              .get(`/model6s/${savedId}`)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/);
          })
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            const { data } = res.body;
            assert(data._id.toString() === savedId);
            data.n.should.equal(11);
            data.s.should.equal('defQW');
            new Date(data.d).getTime().should.equal(new Date('2017-01-01').getTime());
            data.as[0].sn.should.equal(10);
            data.as[0].ss.should.equal('defQW');
            data.as[1].sn.should.equal(10);
            data.as[1].ss.should.equal('defQW');

            // should not invoke synthesize.code function, as numberWithInlineSynthesizer field is not virtual
            data.numberWithInlineSynthesizer.should.equal(0);
            // should invoke synthesize function, as virtualNumberWithInlineSynthesizer field is virtual
            data.virtualNumberWithInlineSynthesizer.should.equal('virtualValueForViewAction');
            // should.not.exist(data.virtualNumberWithInlineSynthesizer);
          })
          .then(() => this.M6.findOne({ _id: new ObjectID(savedId) }))
          .then(docInDB => {
            // not virtual synthesize field is stored as it sent to the client
            docInDB.numberWithInlineSynthesizer.should.equal(0);
            // virtual field is not stored in the db
            should.not.exist(docInDB.virtualNumberWithInlineSynthesizer);
          });
      });
    });
  });
});
