// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
/**
 * Tests basic static routes in V3
 */
describe('V3 Backend Basic Routes', () => {
    describe('GET /', function () {
        it('responds with backend status', function (done) {
            request(app)
                .get('/')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    res.body.message.should.equal('HC Backend V3 is working correctly');
                    done();
                });
        });
    });
    describe('GET /schemas', function () {
        it('responds with list of schemas', function (done) {
            request(app)
                .get('/schemas')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    res.body.success.should.equal(true, res.body.message);
                    res.body.data.should.have.property('model1s');
                    res.body.data.model1s.should.have.property('type');
                    res.body.data.model1s.type.should.be.equal('Schema');
                    res.body.data.model1s.should.have.property('fields');
                    res.body.data.model1s.fields.should.have.property('encounters');
                    res.body.data.should.not.have.property('metaschema');
                    done();
                });
        });
    });
    describe('GET /routes', function () {
        it('responds with list of basic routes', function (done) {
            request(app)
                .get('/routes')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    res.body.success.should.equal(true, res.body.message);
                    res.body.data.should.have.property('brief');
                    res.body.data.brief.should.containEql('GET /');
                    res.body.data.brief.should.containEql('GET /schemas');
                    res.body.data.brief.should.containEql('GET /metaschema');
                    res.body.data.brief.should.containEql('GET /routes');
                    res.body.data.brief.should.containEql('GET /lists');
                    res.body.data.brief.should.containEql('GET /interface');
                    res.body.data.brief.should.containEql('GET /typeDefaults');
                    done();
                });
        });
    });
});
