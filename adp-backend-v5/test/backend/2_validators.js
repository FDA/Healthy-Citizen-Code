/* Validate phone and email defaults */
// TODO: test delete
// TODO: add test for the situation when one element of an array is invalid and user adds new alement to that array. It should succeed.

require('should');
const assert = require('assert');
const _ = require('lodash');
const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const reqlib = require('app-root-path').require;

const { prepareEnv, getMongoConnection } = reqlib('test/test-util');

describe('V5 Backend Validators', () => {
  const userContext = { _id: 1 };
  const sampleData0 = {
    n: 7,
    n2: 10,
    s: 'abc',
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

  before(async function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    await this.appLib.setup();
    this.dba = reqlib('/lib/database-abstraction')(this.appLib);
    this.M6 = mongoose.model('model6s');
    this.M12 = mongoose.model('model12required');
    this.appLib.authenticationCheck = (req, res, next) => next(); // disable authentication
  });

  after(async function() {
    await this.appLib.shutdown();
    const db = await getMongoConnection();
    await db.dropDatabase();
    await db.close();
  });

  beforeEach(function(done) {
    this.M6.remove({}, done);
  });

  // This is a quick sanity check. Most tests are done in CRUD section below
  describe('when called directly in db call', () => {
    it('creates record with correct input', function() {
      const data = _.cloneDeep(sampleData0);
      data.n = 11;
      return this.dba.createItem(this.M6, userContext, data);
    });
    it('does not create record with too small numeric input', function() {
      const data = _.cloneDeep(sampleData0);
      data.n = 4;
      return this.dba.createItem(this.M6, userContext, data).catch(err => {
        assert(err != null);
        err.message.should.equal('Error: Number1: Value 4 is too small, should be greater than 6');
      });
    });
    it('does not create record with too large numeric input', function() {
      const data = _.cloneDeep(sampleData0);
      data.n = 26;
      return this.dba.createItem(this.M6, userContext, data).catch(err => {
        assert(err != null);
        err.message.should.equal('Error: Number1: Value 26 is too large, should be less than or equal to 25');
      });
    });
    it('does not create record with n equal to 9 (before transformation)', function() {
      // triggers "notEqual(9)"
      const data = _.cloneDeep(sampleData0);
      data.n = 9;
      return this.dba.createItem(this.M6, userContext, data).catch(err => {
        assert(err != null, data);
        err.message.should.equal("Error: Number1: Value should not be equal to '9' (9)");
      });
    });
    it('does not create record with two equal numbers (n and n2) in the record', function() {
      // triggers "notEqual($n)"
      const data = _.cloneDeep(sampleData0);
      data.n = 10;
      data.n2 = 10;
      return this.dba.createItem(this.M6, userContext, data).catch(err => {
        assert(err != null, data);
        err.message.should.equal('Error: Number2: This number should not be the same as Number1');
      });
    });
    it('does not create record with too short string', function() {
      // triggers minLength
      const data = _.cloneDeep(sampleData0);
      data.s = 'a';
      return this.dba.createItem(this.M6, userContext, data).catch(err => {
        assert(err != null);
        err.message.should.equal('Error: String: Value is too short, should be at least 3 characters long');
      });
    });
    it('does not create record with too long string', function() {
      // triggers maxLength
      const data = _.cloneDeep(sampleData0);
      data.s = '0123456789123';
      return this.dba.createItem(this.M6, userContext, data).catch(err => {
        assert(err != null);
        err.message.should.equal('Error: String: Value is too long, should be at most 12 characters long');
      });
    });

    it('does not create record with failed dynamic required condition (a2 array)', function() {
      const data = {
        a1: [{ s1: 'o11' }],
      };
      return this.dba.createItem(this.M12, userContext, data).catch(err => {
        assert(err != null);
        err.message.should.equal('Error: A 2: Field is required');
      });
    });

    it('does not create record with failed dynamic required condition (a3 array)', function() {
      const data = {
        a1: [
          {
            s1: 'o11',
            a2: [
              {
                s2: 'o21',
              },
            ],
          },
        ],
      };
      return this.dba.createItem(this.M12, userContext, data).catch(err => {
        assert(err != null);
        err.message.should.equal('Error: A 3: Field is required');
      });
    });

    it('create record with dynamic required condition', function() {
      const data = {
        a1: [
          {
            s1: 'o11',
            a2: [
              {
                s2: 'o21',
                a3: [{ s3: 'o31' }],
              },
            ],
          },
        ],
      };
      return this.dba.createItem(this.M12, userContext, data);
    });
  });

  describe('when running subtype validators', () => {
    // email
    it('does not create record with incorrect email', function() {
      const data = _.cloneDeep(sampleData0);
      data.email = 'www';
      return this.dba.createItem(this.M6, userContext, data).catch(err => {
        assert(err != null);
        err.message.should.equal('Error: Email: Please enter correct email');
      });
    });
    it('creates record with correct email', async function() {
      const data = _.cloneDeep(sampleData0);
      data.email = 'test@test.com';
      const record = await this.dba.createItem(this.M6, userContext, data);
      assert(record);
      record.email.should.equal(data.email);
    });
    // phone
    it('does not create record with incorrect phone', async function() {
      const data = _.cloneDeep(sampleData0);
      data.phone = 'www';
      try {
        await this.dba.createItem(this.M6, userContext, data);
      } catch (e) {
        e.message.should.equal('Error: Phone: Please provide correct US phone number');
      }
    });
    it('creates record with correct phone', async function() {
      const data = _.cloneDeep(sampleData0);
      data.phone = '212-234-5678';
      const record = await this.dba.createItem(this.M6, userContext, data);
      record.phone.should.equal(data.phone);
    });
    // url
    it('does not create record with incorrect url', async function() {
      const data = _.cloneDeep(sampleData0);
      data.url = 'www';
      try {
        await this.dba.createItem(this.M6, userContext, data);
      } catch (e) {
        assert(e != null);
        e.message.should.equal('Error: Url: Please enter correct URL');
      }
    });
    it('creates record with correct url', async function() {
      const data = _.cloneDeep(sampleData0);
      data.url = 'http://www.www.com';
      const record = await this.dba.createItem(this.M6, userContext, data);
      record.url.should.equal(data.url);
    });
  });
});
