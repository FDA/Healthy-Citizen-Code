/* Validate phone and email defaults */
// TODO: test down to 3rd level
// TODO: test delete

const dba = require('../lib/database-abstraction')();
const butil = require('../lib/backend-util')();
butil.loadTransformers();

describe('V3 Backend Transformers', () => {
    before(function (done) {
        global.M6 = mongoose.model('model6s');
        global.sampleData0 = {
            n: 7,
            n2: 8,
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
            n: 10,
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
        describe('creates', function () {
            it('1st level data', function (done) {
                let data = _.cloneDeep(sampleData0);
                async.series([
                    (cb) => {
                        dba.createItem(M6, data, cb);
                    },
                    (cb) => {
                        dba.findItems(M6, (err, data) => {
                            assert(err == null);
                            data[0].n.should.equal(8);
                            data[0].s.should.equal("abcQW");
                            data[0].as[0].sn.should.equal(8);
                            data[0].as[0].ss.should.equal("abcQW");
                            data[0].as[1].sn.should.equal(8);
                            data[0].as[1].ss.should.equal("abcQW");
                            new Date(data[0].d).getTime().should.equal(new Date("2017-01-01").getTime());
                            cb(err);
                        });
                    }
                ], done);
            });
        });
    });

    describe('When called via CRUD', () => {
        describe('Create Item', () => {
            it('posts and stores 1st level data', function (done) {
                let saved_id = null;
                async.series([
                    cb => request(app)
                        .post('/model6s')
                        .send({data: sampleData0})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property("id");
                            saved_id = res.body.id;
                            cb();
                        }),
                    cb => request(app)
                        .get('/model6s/' + saved_id)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            assert(res.body.data._id + "" == saved_id + "");
                            res.body.data.n.should.equal(8);
                            res.body.data.s.should.equal("abcQW");
                            new Date(res.body.data.d).getTime().should.equal(new Date("2017-01-01").getTime());
                            res.body.data.as[0].sn.should.equal(8);
                            res.body.data.as[0].ss.should.equal("abcQW");
                            res.body.data.as[1].sn.should.equal(8);
                            res.body.data.as[1].ss.should.equal("abcQW");
                            cb();
                        })
                ], done);
            });
            it('supports standard transformers', function (done) {
                let saved_id = null;
                let sampleDataWithStandardTransformers = _.cloneDeep(sampleData0);
                sampleDataWithStandardTransformers.height = [6, 1];
                sampleDataWithStandardTransformers.weight = 100;
                async.series([
                        (cb) => {
                            request(app)
                                .post('/model6s')
                                .send({data: sampleDataWithStandardTransformers})
                                .set('Accept', 'application/json')
                                .expect('Content-Type', /json/)
                                .end(function (err, res) {
                                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                                    res.body.success.should.equal(true, res.body.message);
                                    res.body.should.have.property("id");
                                    saved_id = res.body.id;
                                    cb();
                                })
                        },
                        (cb) => {
                            M6.findOne({}, (err, data) => {
                                assert(err == null);
                                data.height.should.equal(185);
                                data.weight.should.equal(45.35923700100354);
                                cb();
                            });
                        },
                        (cb) => {
                            request(app)
                                .get('/model6s/' + saved_id)
                                .set('Accept', 'application/json')
                                .expect('Content-Type', /json/)
                                .end(function (err, res) {
                                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                                    res.body.success.should.equal(true, res.body.message);
                                    assert(res.body.data._id + "" == saved_id + "");
                                    res.body.data.height.join(',').should.equal('6,1');
                                    res.body.data.weight.should.equal(100);
                                    cb();
                                })
                        }
                    ],
                    done
                )
                ;
            });
        });
        describe('Update Item', () => {
            it('puts and stores 1st level data', function (done) {
                async.series([
                    cb => request(app)
                        .post('/model6s')
                        .send({data: sampleData0})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property("id");
                            saved_id = res.body.id;
                            cb();
                        }),
                    cb => request(app)
                        .get('/model6s/' + saved_id)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            assert(res.body.data._id + "" == saved_id + "");
                            res.body.data.n.should.equal(8);
                            res.body.data.s.should.equal("abcQW");
                            new Date(res.body.data.d).getTime().should.equal(new Date("2017-01-01").getTime());
                            res.body.data.as[0].sn.should.equal(8);
                            res.body.data.as[0].ss.should.equal("abcQW");
                            res.body.data.as[1].sn.should.equal(8);
                            res.body.data.as[1].ss.should.equal("abcQW");
                            cb();
                        }),
                    cb => request(app)
                        .put(`/model6s/${saved_id}`)
                        .send({data: sampleData1})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model6s/${saved_id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            assert(res.body.data._id + "" == saved_id + "");
                            res.body.data.n.should.equal(11);
                            res.body.data.s.should.equal("defQW");
                            new Date(res.body.data.d).getTime().should.equal(new Date("2017-01-01").getTime());
                            res.body.data.as[0].sn.should.equal(10);
                            res.body.data.as[0].ss.should.equal("defQW");
                            res.body.data.as[1].sn.should.equal(10);
                            res.body.data.as[1].ss.should.equal("defQW");
                            cb();
                        }),
                ], done);
            });
            it('puts and stores 2nd level data', function (done) {
                async.series([
                    cb => request(app)
                        .post('/model6s')
                        .send({data: sampleData0})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property("id");
                            saved_id = res.body.id;
                            cb();
                        }),
                    cb => {
                        request(app)
                            .put(`/model6s/${saved_id}/as/387179f6ef4807703afd0df7`)
                            .send({
                                data: {
                                    sn: 11,
                                    ss: "ghi ",
                                    sd: new Date("2015-01-01")
                                }
                            })
                            .set('Accept', 'application/json')
                            .expect('Content-Type', /json/)
                            .end(function (err, res) {
                                res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                                res.body.success.should.equal(true, res.body.message);
                                cb();
                            })
                    },
                    cb => request(app)
                        .get(`/model6s/${saved_id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            assert(res.body.data._id + "" == saved_id + "");
                            // the following tests demonstrate that for updates some transformers are called twice and this is ok
                            // for instance when converting height from metric to imperial and back the transformation will happen multiple times and is normal
                            // values provided in the comments are for the version that doesn't call transformers twice
                            res.body.data.n.should.equal(9);//8
                            res.body.data.s.should.equal("abcQQW"); //abcQW
                            new Date(res.body.data.d).getTime().should.equal(new Date("2017-01-01").getTime());
                            res.body.data.as[0].sn.should.equal(9);//8
                            res.body.data.as[0].ss.should.equal("abcQQW"); //abcQW
                            res.body.data.as[1].sn.should.equal(12);
                            res.body.data.as[1].ss.should.equal("ghiQW");
                            new Date(res.body.data.as[1].sd).getTime().should.equal(new Date("2015-01-01").getTime());
                            cb();
                        }),
                ], done);
            });
        });
    });
});
