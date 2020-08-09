// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
describe('V3 Backend CRUD', () => {
    before(function (done) {
        appLib.authenticationCheck = function (req, res, next) {
            next(); // disable authentication
        };
        done();
    });
    beforeEach(function (done) {
        let sampleDataModel2 = [ // model 2 return is capped to 3 elements
            {data: 0},
            {data: 1},
            {data: 2},
            {data: 3}
        ];
        async.series([
            (cb) => appLib.db.connection.collection('model1s').remove({}, cb),
            (cb) => appLib.db.connection.collection('model1s').insert(sampleData1, cb),
            (cb) => appLib.db.connection.collection('model1s').insert(sampleData2, cb),
            (cb) => appLib.db.connection.collection('model2s').remove({}, cb),
            (cb) => appLib.db.connection.collection('model2s').insert(sampleDataModel2[0], cb),
            (cb) => appLib.db.connection.collection('model2s').insert(sampleDataModel2[1], cb),
            (cb) => appLib.db.connection.collection('model2s').insert(sampleDataModel2[2], cb),
            (cb) => appLib.db.connection.collection('model2s').insert(sampleDataModel2[3], cb)
        ], done)
    });

    // Create item
    describe('Create Item', () => {
        describe('1st level', function () {
            it('posts and stores 1st level data', function (done) {
                let saved_id = null;
                async.series([
                    cb => request(app)
                        .post('/model1s')
                        .send({data: sampleData0})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property("id");
                            saved_id = res.body.id;
                            cb();
                        }),
                    cb => request(app)
                        .get('/model1s/' + sampleData0._id)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(true, res.body.message);
                            assert(_.isEqual(res.body.data, sampleDataToCompare0), `\nEXP: ${JSON.stringify(sampleDataToCompare0)}\nGOT: ${JSON.stringify(res.body.data)}`);
                            assert(res.body.data._id + "" == saved_id + "");
                            done();
                        })
                ], done);
            });
        });
        describe('2nd level', function () {
            it('posts and stores 2nd level data', function (done) {
                let saved_id = null;
                async.series([
                    cb => request(app)
                        .post(`/model1s/${sampleData1._id}/encounters`)
                        .send({data: sampleData0.encounters[1]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property("id");
                            saved_id = res.body.id;
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model1s/${sampleData1._id}/encounters/${saved_id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(true, res.body.message);
                            assert(res.body.data._id + "" == saved_id + "");
                            deleteObjectId(res.body.data);
                            deleteObjectId(sampleDataToCompare0.encounters[1]);
                            // need to remove _id since backend assigns its own _id
                            assert(_.isEqual(res.body.data, sampleDataToCompare0.encounters[1]));
                            done();
                        })
                ], done);
            });
        });
        describe('3rd level', function () {
            it('posts and stores 3rd level data', function (done) {
                let saved_id = null;
                async.series([
                    cb => request(app)
                        .post(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}/vitalSigns`)
                        .send({data: sampleData0.encounters[1].vitalSigns[1]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property("id");
                            saved_id = res.body.id;
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}/vitalSigns/${saved_id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(true, res.body.message);
                            assert(res.body.data._id + "" == saved_id + "");
                            deleteObjectId(res.body.data);
                            deleteObjectId(sampleDataToCompare0.encounters[1].vitalSigns[1]);
                            // need to remove _id since backend assigns its own _id
                            assert(_.isEqual(res.body.data, sampleDataToCompare0.encounters[1].vitalSigns[1]));
                            done();
                        })
                ], done);
            });
        });
        describe('3rd level, empty parent', function () {
            it('posts and stores 3rd level data with nonexisting parent', function (done) {
                let saved_id = null;
                async.series([
                    cb => request(app)
                        .post(`/model1s/${sampleData2._id}/encounters/${sampleData2.encounters[2]._id}/vitalSigns`)
                        .send({data: sampleData0.encounters[1].vitalSigns[1]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property("id");
                            saved_id = res.body.id;
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model1s/${sampleData2._id}/encounters/${sampleData2.encounters[2]._id}/vitalSigns/${saved_id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(true, res.body.message);
                            assert(res.body.data._id + "" == saved_id + "");
                            deleteObjectId(res.body.data);
                            deleteObjectId(sampleDataToCompare0.encounters[1].vitalSigns[1]);
                            assert(_.isEqual(res.body.data, sampleDataToCompare0.encounters[1].vitalSigns[1]));
                            done();
                        })
                ], done);
            });
        });
        describe('1st level, wrong path', function () {
            it('show error message', function (done) {
                async.series([
                    cb => request(app)
                        .post(`/model1s1/`)
                        .send({data: sampleData0.encounters[1].vitalSigns[1]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        // TODO: it seems like the return code is never checked - why?
                        .expect(404)
                        .end(function (err, res) {
                            // TODO: make these consistent with success=false
                            res.body.message.should.equal('/model1s1/ does not exist');
                            cb();
                        }),
                ], done);
            });
        });
        describe('2nd level, wrong path', function () {
            it('show error message', function (done) {
                async.series([
                    cb => request(app)
                        .post(`/model1s/1${sampleData2._id}/encounters/`)
                        .send({data: sampleData0.encounters[1].vitalSigns[1]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(404)
                        .end(function (err, res) {
                            // TODO: make these consistent with success=false
                            res.body.message.should.equal('');
                            cb();
                        }),
                ], done);
            });
        });
        describe('3rd level, wrong path', function () {
            it('show error message', function (done) {
                async.series([
                    cb => request(app)
                        .post(`/model1s/${sampleData2._id}/encounters/1${sampleData2.encounters[2]._id}/vitalSigns`)
                        .send({data: sampleData0.encounters[1].vitalSigns[1]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            res.body.success.should.equal(false);
                            cb();
                        }),
                ], done);
            });
        });
    });

    // Get Items ---------------------------------------------------------------------------
    describe('Get Items', () => {
        describe('1st level', function () {
            it('returns correct 1st level data', function (done) {
                request(app)
                    .get('/model1s')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        res.body.data.length.should.equal(1); // since the collection limit is 1
                        assert(_.isEqual(res.body.data[0], sampleDataToCompare2)); // since sorting is by _id
                        done();
                    });
            });
        });
        describe('2nd level', function () {
            it('returns correct 2nd level data', function (done) {
                request(app)
                    .get('/model1s/587179f6ef4807703afd0dff/encounters')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        assert(_.isEqual(res.body.data, sampleDataToCompare2.encounters), `Expected ${JSON.stringify(sampleDataToCompare2.encounters, null, 4)}, but got ${JSON.stringify(res.body.data, null, 4)}`);
                        res.body.data.length.should.equal(3);
                        done();
                    });
            });
        });
        describe('2nd level with extra parameter', function () {
            it('returns correct 2nd level data', function (done) {
                request(app)
                    .get('/model1s/587179f6ef4807703afd0dff/encounters?_=1489752996234')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        assert(_.isEqual(res.body.data, sampleDataToCompare2.encounters), `Expected ${JSON.stringify(sampleDataToCompare2.encounters, null, 4)}, but got ${JSON.stringify(res.body.data, null, 4)}`);
                        res.body.data.length.should.equal(3);
                        done();
                    });
            });
        });
        describe('3rd level', function () {
            it('returns correct 3rd level data', function (done) {
                request(app)
                    .get(`/model1s/587179f6ef4807703afd0dff/encounters/${mainController.generateObjectId('s2e2')}/vitalSigns`)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        assert(_.isEqual(res.body.data, sampleDataToCompare2.encounters[1].vitalSigns), `Expected ${JSON.stringify(sampleDataToCompare2.encounters[1].vitalSigns, null, 4)}, but got ${JSON.stringify(res.body.data, null, 4)}`);
                        res.body.data.length.should.equal(2);
                        done();
                    });
            });
        });
        describe('from model 2 capped to 3 items in return', function () {
            it('returns 3 items', function (done) {
                request(app)
                    .get(`/model2s`)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        res.body.data.length.should.equal(3);
                        done();
                    });
            });
        });
        describe('1st level with extra query parameter', function () {
            it('returns 3 items', function (done) {
                request(app)
                    .get(`/model2s?_=1489752996234`)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        res.body.data.length.should.equal(3);
                        done();
                    });
            });
        });
    });

    // Get Item ------------------------------------------------------------
    describe('Get item', function () {
        describe('1st level', function () {
            it('returns correct 1st level data', function (done) {
                request(app)
                    .get('/model1s/587179f6ef4807703afd0dff')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        assert(_.isEqual(res.body.data, sampleDataToCompare2));
                        done();
                    });
            });
        });
        describe('2nd level', function () {
            it('returns correct 2nd level data', function (done) {
                request(app)
                    .get(`/model1s/587179f6ef4807703afd0dff/encounters/${mainController.generateObjectId('s2e2')}`)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        assert(_.isEqual(res.body.data, sampleDataToCompare2.encounters[1]));
                        done();
                    });
            });
        });
        describe('3rd level', function () {
            it('returns correct 3rd level data', function (done) {
                request(app)
                    .get(`/model1s/587179f6ef4807703afd0dff/encounters/${mainController.generateObjectId("s2e2")}/vitalSigns/${mainController.generateObjectId("s2e2v2")}`)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end(function (err, res) {
                        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                        res.body.success.should.equal(true, res.body.message);
                        assert(_.isEqual(res.body.data, sampleDataToCompare2.encounters[1].vitalSigns[1]));
                        done();
                    });
            });
        });
    });

    // Update Item
    describe('Update Item', () => {
        describe('1st level', function () {
            it('puts and stores 1st level data', function (done) {
                async.series([
                    cb => request(app)
                        .put(`/model1s/${sampleData1._id}`)
                        .send({data: sampleData0})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        }),
                    cb => request(app)
                        .get('/model1s/' + sampleData1._id)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            deleteObjectId(res.body.data);
                            deleteObjectId(sampleDataToCompare0);
                            assert(_.isEqual(res.body.data, sampleDataToCompare0));
                            done();
                        })
                ], done);
            });
        });
        describe('2nd level', function () {
            it('puts and stores 2nd level data', function (done) {
                async.series([
                    cb => request(app)
                        .put(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}`)
                        .send({data: sampleData0.encounters[1]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            deleteObjectId(res.body.data);
                            deleteObjectId(sampleData0.encounters[1]);
                            assert(_.isEqual(res.body.data, sampleData0.encounters[1]));
                            done();
                        })
                ], done);
            });
        });
        describe('3rd level', function () {
            it('puts and stores 3rd level data (and then updates String[] array attribute)', function (done) {
                async.series([
                    cb => request(app)
                        .put(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}/vitalSigns/${sampleData1.encounters[1].vitalSigns[0]._id}`)
                        .send({data: sampleData0.encounters[1].vitalSigns[1]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}/vitalSigns/${sampleData1.encounters[1].vitalSigns[0]._id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            deleteObjectId(res.body.data);
                            deleteObjectId(sampleData0.encounters[1].vitalSigns[1]);
                            // need to remove _id since backend assigns its own _id
                            assert(_.isEqual(res.body.data, sampleData0.encounters[1].vitalSigns[1]));
                            cb();
                        }),
                    // Update String[] array
                    cb => request(app)
                        .put(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}/vitalSigns/${sampleData1.encounters[1].vitalSigns[0]._id}`)
                        .send({data: sampleData0.encounters[1].vitalSigns[0]})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}/vitalSigns/${sampleData1.encounters[1].vitalSigns[0]._id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            deleteObjectId(res.body.data);
                            deleteObjectId(sampleData0.encounters[1].vitalSigns[0]);
                            // need to remove _id since backend assigns its own _id
                            assert(_.isEqual(res.body.data, sampleData0.encounters[1].vitalSigns[0]), `\nEXP: ${JSON.stringify(sampleData0.encounters[1].vitalSigns[0])}\nGOT: ${JSON.stringify(res.body.data)}`);
                            cb();
                        }),
                ], done);
            });
        });
    });

    // Delete Item
    describe('Delete Item', () => {
        describe('1st level', function () {
            it('deletes 1st level data', function (done) {
                async.series([
                    cb => request(app)
                        .del(`/model1s/${sampleData1._id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        }),
                    cb => request(app)
                        .get('/model1s/' + sampleData1._id)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(false);
                            done();
                        })
                ], done);
            });
        });
        describe('2nd level', function () {
            it('deletes 2nd level data', function (done) {
                async.series([
                    cb => request(app)
                        .del(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(false);
                            done();
                        })
                ], done);
            });
        });
        describe('3rd level', function () {
            it('deletes 3rd level data', function (done) {
                async.series([
                    cb => request(app)
                        .del(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}/vitalSigns/${sampleData1.encounters[1].vitalSigns[0]._id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        }),
                    cb => request(app)
                        .get(`/model1s/${sampleData1._id}/encounters/${sampleData1.encounters[1]._id}/vitalSigns/${sampleData1.encounters[1].vitalSigns[0]._id}`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(false);
                            done();
                        })
                ], done);
            });
        });
    });
});
