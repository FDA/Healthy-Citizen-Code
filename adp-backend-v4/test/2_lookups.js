// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
// TODO: add tests for multiple tables
// TODO: add tests for default foreignKey
describe('V3 Backend Lookups', () => {
    let sampleDataModel3 = [ // model 2 return is capped to 3 elements
        {"_id": new ObjectID("487179f6ef4807703afd0df0"), "model4Id": new ObjectID("587179f6ef4807703afd0df2")}
    ];
    let sampleDataModel4 = [ // model 2 return is capped to 3 elements
        {"_id": new ObjectID("587179f6ef4807703afd0df0"), "name": "name1", "description": "description1"},
        {"_id": new ObjectID("587179f6ef4807703afd0df1"), "name": "name2", "description": "description2"},
        {"_id": new ObjectID("587179f6ef4807703afd0df2"), "name": "name3", "description": "description3_def"},
        {"_id": new ObjectID("587179f6ef4807703afd0df3"), "name": "name4", "description": "description4_abc"},
        {"_id": new ObjectID("587179f6ef4807703afd0df4"), "name": "name5_abc", "description": "description5"}
    ];
    beforeEach(function (done) {
        async.series([
            (cb) => appLib.db.connection.collection('model3s').remove({}, cb),
            (cb) => appLib.db.connection.collection('model4s').remove({}, cb),
            (cb) => appLib.db.connection.collection('model4s').insert(sampleDataModel4, cb),
            (cb) => appLib.db.connection.collection('model3s').insert(sampleDataModel3, cb)
        ], done)
    });
    describe('updates model', function () {
        it('adds ref', function (done) {
            //appLib.db.model('model3s').schema.paths.model4Id.options.ref.should.equal('model4s');
            done();
        });
        it('supports simple populate', function (done) {
            /*
            appLib.db.model('model3s').findOne({}).populate('model4Id').exec((err, data) => {
                data.model4Id.name.should.equal("name3");
                data.model4Id.description.should.equal("description3_def");
                (data.model4Id._id + "").should.equal("587179f6ef4807703afd0df2");
                done();
            });
            */
            done();
        });
    });
    describe('GET /routes', function () {
        it('contains endpoint', function (done) {
            request(app)
                .get('/routes')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    res.body.success.should.equal(true, res.body.message);
                    res.body.data.brief.should.containEql('GET /lookups/model4Id AUTH');
                    done();
                });
        });
    });
    describe('returns correct results', function () {
        it('for specific search', function (done) {
            request(app)
                .get('/lookups/model4Id?q=abc')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    res.body.success.should.equal(true, res.body.message);
                    res.body.data.length.should.equal(2);
                    res.body.data[0].label.should.equal("name4");
                    res.body.data[1].label.should.equal("name5_abc");
                    done();
                });
        });
        it('with pagination, page 1', function (done) {
            request(app)
                .get('/lookups/model4Id?q=name&page=1')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    res.body.success.should.equal(true, res.body.message);
                    res.body.data.length.should.equal(3);
                    console.log(">> got data ", JSON.stringify(res.body.data));
                    res.body.data[0].label.should.equal("name1");
                    res.body.data[1].label.should.equal("name2");
                    res.body.data[2].label.should.equal("name3");
                    done();
                });
        });
        it('with pagination, page 2', function (done) {
            request(app)
                .get('/lookups/model4Id?q=name&page=2')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    res.body.success.should.equal(true, res.body.message);
                    res.body.data.length.should.equal(2);
                    console.log(">> got data ", JSON.stringify(res.body.data));
                    res.body.data[0].label.should.equal("name4");
                    res.body.data[1].label.should.equal("name5_abc");
                    done();
                });
        });
    });
});
