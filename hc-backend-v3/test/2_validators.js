/* Validate phone and email defaults */
// TODO: test down to 3rd level
// TODO: test delete
// TODO: add test for the situation when one element of an array is invalid and user adds new alement to that array. It should succeed.

const dba = require('../lib/database-abstraction')();
const butil = require('../lib/backend-util')();
butil.loadTransformers();

describe('V3 Backend Validators', () => {
    before(function (done) {
        //const fs = require('fs');
        //eval(fs.readFileSync(__dirname + '/../models/helpers/validators.js', 'utf8'));
        global.M6 = mongoose.model('model6s');
        global.sampleData0 = {
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
        global.sampleData1 = {
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
        done();
    });
    beforeEach(function (done) {
        M6.remove({}, done);
    });
    // This is a quick sanity check. Most tests are done in CRUD section below
    describe('when called directly in db call', function () {
        it('creates record with correct input', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.n = 11;
            dba.createItem(M6, data, function (err) {
                assert(err == null, err);
                done();
            });
        });
        it('does not create record with too small numeric input', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.n = 4;
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("Number1: Value 4 is too small, should be greater than 6");
                done();
            });
        });
        it('does not create record with too large numeric input', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.n = 26;
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("Number1: Value 26 is too large, should be less than 25");
                done();
            });
        });
        it('does not create record with n equal to 9 (before transformation)', function (done) { // triggers "notEqual(9)"
            let data = _.cloneDeep(sampleData0);
            data.n = 9;
            dba.createItem(M6, data, function (err, data) {
                assert(err != null, data);
                err.should.equal("Number1: Value should not be equal to '9' (9)");
                done();
            });
        });
        it('does not create record with two equal numbers (n and n2) in the record', function (done) { // triggers "notEqual($n)"
            let data = _.cloneDeep(sampleData0);
            data.n = 10;
            data.n2 = 10;
            dba.createItem(M6, data, function (err, data) {
                assert(err != null, data);
                err.should.equal("Number2: This number should not be the same as Number1");
                done();
            });
        });
        it('does not create record with date in the future', function (done) { // triggers "notInFuture()"
            let data = _.cloneDeep(sampleData0);
            data.as[0].sd = new Date("3000-01-01 00:00:00");
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("Subschema Date: This date cannot be in the future");
                done();
            });
        });
        it('does not create record with date after year 4000', function (done) { // triggers "notInFuture()"
            let data = _.cloneDeep(sampleData0);
            data.as[0].sd = new Date("5000-01-01 00:00:00");
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal('Subschema Date: Date 1/1/5000 should be before 1/1/4000 (1/1/4000)');
                done();
            });
        });
        it('does not create record with 2nd level string not matching regular expression', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.as[0].ss = "www";
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("Subschema String: This value doesn't seem right");
                done();
            });
        });
        it('does not create record with too short string', function (done) { // triggers minLength
            let data = _.cloneDeep(sampleData0);
            data.s = "a";
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("String: Value is too short, should be at least 3 characters long");
                done();
            });
        });
        it('does not create record with too long string', function (done) { // triggers maxLength
            let data = _.cloneDeep(sampleData0);
            data.s = "0123456789123";
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("String: Value is too long, should be at most 12 characters long");
                done();
            });
        });
        it('does not create record with the same 2nd level numbers', function (done) { // triggers maxLength
            let data = _.cloneDeep(sampleData0);
            data.as[0].sn = 15;
            data.as[0].sn2 = 15;
            dba.createItem(M6, data, function (err, data) {
                assert(err != null, data);
                err.should.equal("Subschema Number2: Value should not be equal to 'Subschema Number1' (15)");
                done();
            });
        });
    });

    describe('when running subtype validators', function () {
        // email
        it('does not create record with incorrect email', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.email = "www";
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("Email: Please enter correct email");
                done();
            });
        });
        it('creates record with correct email', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.email = "test@test.com";
            dba.createItem(M6, data, function (err) {
                assert(err == null, err);
                done();
            });
        });
        // phone
        it('does not create record with incorrect phone', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.phone = "www";
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("Phone: Please provide correct US phone number");
                done();
            });
        });
        it('creates record with correct phone', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.phone = "123-456-7890";
            dba.createItem(M6, data, function (err) {
                assert(err == null, err);
                done();
            });
        });
        // url
        it('does not create record with incorrect url', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.url = "www";
            dba.createItem(M6, data, function (err) {
                assert(err != null);
                err.should.equal("Url: Please enter correct URL");
                done();
            });
        });
        it('creates record with correct url', function (done) {
            let data = _.cloneDeep(sampleData0);
            data.url = "http://www.www.com";
            dba.createItem(M6, data, function (err) {
                assert(err == null, err);
                done();
            });
        });
    });

    describe('when adding new record to subschema containing invalid records', function () {
        it('shoudl succeed', function (done) {
            async.series([
                (cb) => { // create valid record
                    let data = _.cloneDeep(sampleData0);
                    data.n = 17;
                    dba.createItem(M6, data, function (err) {
                        assert(err == null, err);
                        cb();
                    });
                },
                (cb) => { // check that the next step will break the data integrity
                    let data = _.cloneDeep(sampleData0);
                    data.n = 3;
                    dba.createItem(M6, data, function (err) {
                        assert(err != null);
                        err.should.equal("Number1: Value 3 is too small, should be greater than 6");
                        done();
                    });
                },
                (cb) => { // break good record by forcing the same value that was not allowed 1 step above
                    M6.update({}, {n: 3}, cb);
                },
                (cb) => { // create new valid record
                    let data = _.cloneDeep(sampleData0);
                    data.n = 17;
                    dba.createItem(M6, data, function (err) {
                        assert(err == null, err);
                        cb();
                    });
                }
            ], done);
        });
    });
});
