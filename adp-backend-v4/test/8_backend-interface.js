// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
/**
 * Tests basic static routes in V3
 */
describe('V3 Backend Routes Functionality', () => {
    describe('GET /lists', function () {
        it('responds with list of lists', function (done) {
            request(app)
                .get('/lists')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    res.body.success.should.equal(true, res.body.message);
                    res.body.should.have.property('data');
                    assert(Object.keys( res.body.data ).length > 0);
                    done();
                });
        });
    });
    describe('GET /lists.js', function () {
        it('responds with list javascript file', function (done) {
            request(app)
                .get('/lists.js')
                //.set('Accept', 'application/json')
                .expect('Content-Type', /application\/javascript/)
                .end(function (err, res) {
                    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                    assert(res.text.indexOf( "appModelHelpers['Lists'] = {" ) >= 0);
                    done();
                });
        });
    });
});
