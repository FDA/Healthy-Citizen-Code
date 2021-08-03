/* Validate phone and email defaults */
// TODO: test delete
// TODO: add test for the situation when one element of an array is invalid and user adds new alement to that array. It should succeed.

require('should');
const assert = require('assert');
const _ = require('lodash');
const { ObjectID } = require('mongodb');
const { prepareEnv, getMongoConnection } = require('../test-util');

describe('V5 Backend Validators', function () {
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

    await this.appLib.setup();
    this.dba = require('../../lib/database-abstraction')(this.appLib);
    this.m6ModelName = 'model6s';
    this.m12ModelName = 'model12required';
    this.M6 = this.appLib.db.collection(this.m6ModelName);
    this.M12 = this.appLib.db.collection(this.m12ModelName);
    this.appLib.authenticationCheck = (req, res, next) => next(); // disable authentication
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
  describe('when called directly in db call', function () {
    it('creates record with correct input', function () {
      const data = _.cloneDeep(sampleData0);
      data.n = 11;
      return this.dba.createItem(this.m6ModelName, userContext, data);
    });
    it('does not create record with too small numeric input', function () {
      const data = _.cloneDeep(sampleData0);
      data.n = 4;
      return this.dba.createItem(this.m6ModelName, userContext, data).catch((err) => {
        assert(err != null);
        err.message.should.equal('Number1: Value 4 is too small, should be greater than 6');
      });
    });
    it('does not create record with too large numeric input', function () {
      const data = _.cloneDeep(sampleData0);
      data.n = 26;
      return this.dba.createItem(this.m6ModelName, userContext, data).catch((err) => {
        assert(err != null);
        err.message.should.equal('Number1: Value 26 is too large, should be less than or equal to 25');
      });
    });
    it('does not create record with n equal to 9 (before transformation)', function () {
      // triggers "notEqual(9)"
      const data = _.cloneDeep(sampleData0);
      data.n = 9;
      return this.dba.createItem(this.m6ModelName, userContext, data).catch((err) => {
        assert(err != null, data);
        err.message.should.equal("Number1: Value should not be equal to '9' (9)");
      });
    });
    it('does not create record with two equal numbers (n and n2) in the record', function () {
      // triggers "notEqual($n)"
      const data = _.cloneDeep(sampleData0);
      data.n = 10;
      data.n2 = 10;
      return this.dba.createItem(this.m6ModelName, userContext, data).catch((err) => {
        assert(err != null, data);
        err.message.should.equal('Number2: This number should not be the same as Number1');
      });
    });
    it('does not create record with too short string', function () {
      // triggers minLength
      const data = _.cloneDeep(sampleData0);
      data.s = 'a';
      return this.dba.createItem(this.m6ModelName, userContext, data).catch((err) => {
        assert(err != null);
        err.message.should.equal('String: Value is too short, should be at least 3 characters long');
      });
    });
    it('does not create record with too long string', function () {
      // triggers maxLength
      const data = _.cloneDeep(sampleData0);
      data.s = '0123456789123';
      return this.dba.createItem(this.m6ModelName, userContext, data).catch((err) => {
        assert(err != null);
        err.message.should.equal('String: Value is too long, should be at most 12 characters long');
      });
    });

    it('does not create record with failed dynamic required condition (a2 array)', function () {
      const data = {
        a1: [{ s1: 'o11' }],
      };
      return this.dba.createItem(this.m12ModelName, userContext, data).catch((err) => {
        assert(err != null);
        err.message.should.equal('A 2: Field is required');
      });
    });

    it('does not create record with failed dynamic required condition (a3 array)', function () {
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
      return this.dba.createItem(this.m12ModelName, userContext, data).catch((err) => {
        assert(err != null);
        err.message.should.equal('A 3: Field is required');
      });
    });

    it('create record with dynamic required condition', function () {
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
      return this.dba.createItem(this.m12ModelName, userContext, data);
    });
  });

  describe('when running subtype validators', function () {
    it('does not create record with incorrect email', async function () {
      const data = _.cloneDeep(sampleData0);
      data.email = 'www';
      await this.dba
        .createItem(this.m6ModelName, userContext, data)
        .should.be.rejectedWith(`Email: Please enter correct email`);
    });
    it('creates record with correct email', async function () {
      const data = _.cloneDeep(sampleData0);
      data.email = 'test@test.com';
      const record = await this.dba.createItem(this.m6ModelName, userContext, data);
      assert(record);
      record.email.should.equal(data.email);
    });
    it('does not create record with incorrect phone', async function () {
      const data = _.cloneDeep(sampleData0);
      data.phone = 'www';
      await this.dba
        .createItem(this.m6ModelName, userContext, data)
        .should.be.rejectedWith(`Phone: Please provide correct US phone number`);
    });
    it('creates record with correct phone', async function () {
      const data = _.cloneDeep(sampleData0);
      data.phone = '2122345678';
      const record = await this.dba.createItem(this.m6ModelName, userContext, data);
      record.phone.should.equal(data.phone);
    });
    it('does not create record with incorrect url', async function () {
      const data = _.cloneDeep(sampleData0);
      data.url = 'www';

      await this.dba
        .createItem(this.m6ModelName, userContext, data)
        .should.be.rejectedWith(`Url: Please enter correct URL`);
    });
    it('creates record with correct url', async function () {
      const data = _.cloneDeep(sampleData0);
      data.url = 'http://www.www.com';
      const record = await this.dba.createItem(this.m6ModelName, userContext, data);
      record.url.should.equal(data.url);
    });
    it('does not create record with incorrect string inside array', async function () {
      const data = _.cloneDeep(sampleData0);
      data.as[0].ss = '123';
      await this.dba
        .createItem(this.m6ModelName, userContext, data)
        .should.be.rejectedWith(`Array String: This value doesn't seem right`);
    });
    it('does not create record with incorrect string inside associative array', async function () {
      const data = _.cloneDeep(sampleData0);
      data.assocArray.key1.ss = '123';
      await this.dba
        .createItem(this.m6ModelName, userContext, data)
        .should.be.rejectedWith(`Associative Array String: This value doesn't seem right`);
    });
  });
});
