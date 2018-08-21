/* Validate phone and email defaults */
// TODO: test down to 3rd level
// TODO: test delete
// TODO: add test for the situation when one element of an array is invalid and user adds new alement to that array. It should succeed.

const should = require('should');
const assert = require('assert');
const _ = require('lodash');
const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;

const reqlib = require('app-root-path').require;
const {generateObjectId} = reqlib('/lib/backend-util');

describe('V5 Backend Validators', () => {
  const userContext = {_id: 1};
  const sampleData0 = {
    n: 7,
    n2: 10,
    s: "abc",
    d: new Date("2016-01-01"),
    _id: new ObjectID("187179f6ef4807703afd0df7"),
    as: [{
      sn: 7,
      sn2: 9,
      ss: " abc ",
      sd: new Date("2016-01-01"),
      _id: new ObjectID("287179f6ef4807703afd0df7")
    }, {
      sn: 7,
      sn2: 9,
      ss: " abc ",
      sd: new Date("2016-01-01"),
      _id: new ObjectID("387179f6ef4807703afd0df7")
    }]
  };
  const sampleData1 = {
    n: 9,
    n2: 7,
    s: "def",
    d: new Date("2016-01-01"),
    as: [{
      sn: 9,
      sn2: 11,
      ss: "def ",
      sd: new Date("2016-01-01")
    }, {
      sn: 9,
      sn2: 11,
      ss: " def",
      sd: new Date("2016-01-01")
    }]
  };

  before(function () {
    //const fs = require('fs');
    //eval(fs.readFileSync(__dirname + '/../models/helpers/validators.js', 'utf8'));

    const dotenv = require('dotenv').load({path: './test/backend/.env.test'});
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup()
      .then(() => {
        this.dba = reqlib('/lib/database-abstraction')(this.appLib);
        this.M6 = mongoose.model('model6s');
        this.appLib.authenticationCheck = (req, res, next) => next(); // disable authentication
      });
  });

  after(function () {
    return this.appLib.shutdown();
  });

  beforeEach(function (done) {
    this.M6.remove({}, done);
  });

  // This is a quick sanity check. Most tests are done in CRUD section below
  describe('when called directly in db call', function () {
    it('creates record with correct input', function () {
      let data = _.cloneDeep(sampleData0);
      data.n = 11;
      return this.dba.createItem(this.M6, userContext, data)
    });
    it('does not create record with too small numeric input', function () {
      let data = _.cloneDeep(sampleData0);
      data.n = 4;
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: Number1: Value 4 is too small, should be greater than 6");
        });
    });
    it('does not create record with too large numeric input', function () {
      let data = _.cloneDeep(sampleData0);
      data.n = 26;
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: Number1: Value 26 is too large, should be less than or equal to 25");
        })
    });
    it('does not create record with n equal to 9 (before transformation)', function () { // triggers "notEqual(9)"
      let data = _.cloneDeep(sampleData0);
      data.n = 9;
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null, data);
          err.message.should.equal("Error: Number1: Value should not be equal to '9' (9)");
        })
    });
    it('does not create record with two equal numbers (n and n2) in the record', function () { // triggers "notEqual($n)"
      let data = _.cloneDeep(sampleData0);
      data.n = 10;
      data.n2 = 10;
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null, data);
          err.message.should.equal("Error: Number2: This number should not be the same as Number1");
        });
    });
    it('does not create record with date in the future', function () { // triggers "notInFuture()"
      let data = _.cloneDeep(sampleData0);
      data.as[0].sd = new Date("3000-01-01 00:00:00");
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: Subschema Date: This date cannot be in the future");
        });
    });
    it('does not create record with date after year 4000', function () { // triggers "notInFuture()"
      let data = _.cloneDeep(sampleData0);
      data.as[0].sd = new Date("5000-01-01 00:00:00");
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal('Error: Subschema Date: Date 1/1/5000 should be before 1/1/4000 (1/1/4000)');
        });
    });
    it('does not create record with 2nd level string not matching regular expression', function () {
      let data = _.cloneDeep(sampleData0);
      data.as[0].ss = "www";
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: Subschema String: This value doesn't seem right");
        });
    });
    it('does not create record with too short string', function () { // triggers minLength
      let data = _.cloneDeep(sampleData0);
      data.s = "a";
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: String: Value is too short, should be at least 3 characters long");
        });
    });
    it('does not create record with too long string', function () { // triggers maxLength
      let data = _.cloneDeep(sampleData0);
      data.s = "0123456789123";
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: String: Value is too long, should be at most 12 characters long");
        });
    });
    it('does not create record with the same 2nd level numbers', function () { // triggers maxLength
      let data = _.cloneDeep(sampleData0);
      data.as[0].sn = 15;
      data.as[0].sn2 = 15;
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null, data);
          err.message.should.equal("Error: Subschema Number2: Value should not be equal to 'Subschema Number1' (15)");
        });
    });
  });

  describe('when running subtype validators', function () {
    // email
    it('does not create record with incorrect email', function () {
      let data = _.cloneDeep(sampleData0);
      data.email = "www";
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: Email: Please enter correct email");
        });
    });
    it('creates record with correct email', function () {
      let data = _.cloneDeep(sampleData0);
      data.email = "test@test.com";
      return this.dba.createItem(this.M6, userContext, data)
        .then((record) => {
          assert(record);
          record.email.should.equal(data.email);
        });
    });
    // phone
    it('does not create record with incorrect phone', function () {
      let data = _.cloneDeep(sampleData0);
      data.phone = "www";
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          err.message.should.equal("Error: Phone: Please provide correct US phone number");
        });
    });
    it('creates record with correct phone', function () {
      let data = _.cloneDeep(sampleData0);
      data.phone = "123-456-7890";
      return this.dba.createItem(this.M6, userContext, data)
        .then((record) => {
          record.phone.should.equal(data.phone);
        });
    });
    // url
    it('does not create record with incorrect url', function () {
      let data = _.cloneDeep(sampleData0);
      data.url = "www";
      return this.dba.createItem(this.M6, userContext, data)
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: Url: Please enter correct URL");
        });
    });
    it('creates record with correct url', function () {
      let data = _.cloneDeep(sampleData0);
      data.url = "http://www.www.com";
      return this.dba.createItem(this.M6, userContext, data)
        .then((record) => {
          record.url.should.equal(data.url);
        });
    });
  });

  describe('when adding new record to subschema containing invalid records', function () {
    it('should succeed', function () {
      let data = _.cloneDeep(sampleData0);
      data.n = 17;
      // create valid record
      return this.dba.createItem(this.M6, userContext, data)
        .then(() => {
          // check that the next step will break the data integrity
          const data = _.cloneDeep(sampleData0);
          data.n = 3;
          return this.dba.createItem(this.M6, userContext, data)
        })
        .catch((err) => {
          assert(err != null);
          err.message.should.equal("Error: Number1: Value 3 is too small, should be greater than 6");
          // break good record by forcing the same value that was not allowed 1 step above
          return this.M6.update({}, {n: 3});
        })
        .then(() => {
          const data = _.cloneDeep(sampleData0);
          data._id = generateObjectId('anotherId');
          data.n = 17;
          // create new valid record
          return this.dba.createItem(this.M6, userContext, data)
        });
    });
  });
});
