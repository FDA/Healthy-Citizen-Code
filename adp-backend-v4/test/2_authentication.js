// TODO: requiresAuthentication is now replaced with permissions: ['authenticated'], update tests
// TODO: add tests for permissions

/*
describe('V3 Backend Authentication', () => {
    before(function (done) {
        global.M7 = mongoose.model('model7s');
        global.M7a = mongoose.model('model7as');
        global.User = mongoose.model('users');
        global.authSampleData0 = {_id: new ObjectID("587179f6ef4807704afd0df1"), n: 7};
        global.authSampleData1 = {_id: new ObjectID("587179f6ef4807704afd0df2"), n: 9};
        done();
    });
//     after(function (done) {
//     delete mongoose.connection.models['users'];
//     delete mongoose.connection.models['piis'];
//     delete mongoose.connection.models['phis'];
//     });
    beforeEach(function (done) {
        async.series([
            cb => M7.remove({}, cb),
            cb => M7a.remove({}, cb),
            cb => appLib.db.connection.collection('model7s').insert(authSampleData0, cb),
            cb => appLib.db.connection.collection('model7as').insert(authSampleData1, cb),
            cb => appLib.db.connection.collection('users').remove({}, cb),
            cb => appLib.db.connection.collection('phis').remove({}, cb),
            cb => appLib.db.connection.collection('piis').remove({}, cb),
        ], done);
    });
    // This is a quick sanity check. Most tests are done in CRUD section below
    it('should configure routes', function (done) {
        request(app)
            .get('/routes')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                res.body.success.should.equal(true, res.body.message);
                res.body.data.should.have.property('brief');
                res.body.data.brief.should.containEql('POST /login');
                res.body.data.brief.should.containEql('GET /logout');
                //res.body.data.brief.should.containEql('GET /forgot');
                res.body.data.brief.should.containEql('POST /signup');
                done();
            });
    });
    it('should prevent unauthorized access to protected resources', function (done) {
        request(app)
            .get('/model7s/587179f6ef4807704afd0df1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
                done();
            });
    });
    it('should allow unauthorized access to unprotected resources', function (done) {
        request(app)
            .get('/model7as/587179f6ef4807704afd0df2')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                res.body.success.should.equal(true, res.body.message);
                done();
            });
    });
    describe('Sign up', () => {
        it('should create new account and prevent creating another account with the same name', function (done) {
            async.series([
                (cb) => { // signup
                    request(app)
                        .post('/signup')
                        .send({
                            login: "user_2",
                            password: "password2",
                            firstName: "John",
                            lastName: "Smith",
                            email: "test2@mail.rtfms.com"
                        })
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        });
                },
                (cb) => { // signup
                    request(app)
                        .post('/signup')
                        .send({
                            login: "user_2",
                            password: "password2",
                            firstName: "John",
                            lastName: "Smith",
                            email: "test2@mail.rtfms.com"
                        })
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(400, JSON.stringify(res, null, 4), res);
                            res.body.success.should.equal(false, res.body);
                            res.body.message.should.equal("User user_2 already exists", res.body.message);
                            cb();
                        });
                }
            ], done);
        });
        it('should not create account with too simple password', function (done) {
            request(app)
                .post('/signup')
                .send({
                    login: "user_2",
                    password: "pass",
                    firstName: "John",
                    lastName: "Smith",
                    email: "test2@mail.rtfms.com"
                })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
                    res.body.success.should.equal(false, res.body.message);
                    res.body.message.should.equal("Password: Password must contain at least one of each: digit 0-9, lowercase character, uppercase character and one special character: @#$%!&^*-_ and be at least 8 characters long", res.body.message);
                    done();
                });
        });
    });
    describe('After login', () => {
        it('should allow authorized access to protected resources and prevent access to someone else\'s resources', function (done) {
            let token;
            let user2, user3;
            async.series([
                (cb) => { // signup
                    request(app)
                        .post('/signup')
                        .send({
                            login: "user_2",
                            password: "password2",
                            firstName: "John",
                            lastName: "Smith",
                            email: "test2@mail.rtfms.com"
                        })
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property('id');
                            res.body.should.have.property('data');
                            cb();
                        });
                },
                (cb) => { // signup
                    request(app)
                        .post('/signup')
                        .send({
                            login: "user_3",
                            password: "password3",
                            firstName: "Jane",
                            lastName: "Doe",
                            email: "test3@mail.rtfms.com"
                        })
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property('id');
                            res.body.should.have.property('data');
                            user3 = res.body.data;
                            cb();
                        });
                },
                (cb) => { // check token validity, should be invalid before login
                    request(app)
                        .get('/is-authenticated')
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(false, res.body.message);
                            cb();
                        });
                },
                (cb) => { // check token validity, should be valid after login
                    request(app)
                        .get('/is-authenticated')
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT blah`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
                            cb();
                        });
                },
                (cb) => { // login
                    request(app)
                        .post('/login')
                        .send({login: "user_2", password: "password2"})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            res.body.should.have.property('data');
                            res.body.data.should.have.property('token');
                            res.body.data.should.have.property('user');
                            res.body.data.user.should.have.property('piiId');
                            res.body.data.user.should.have.property('phiId');
                            res.body.data.user.should.have.property('login');
                            res.body.data.user.should.not.have.property('email');
                            res.body.data.user.should.not.have.property('password');
                            res.body.data.user.should.not.have.property('salt');
                            res.body.data.user.login.should.equal('user_2');
                            token = res.body.data.token;
                            user2 = res.body.data.user;
                            cb();
                        });
                },
                (cb) => { // check token validity, should be valid after login
                    request(app)
                        .get('/is-authenticated')
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        });
                },
                (cb) => { // request data requiring authentication in general
                    request(app)
                        .get('/model7s/587179f6ef4807704afd0df1')
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            res.body.data.should.have.property('n');
                            res.body.data.n.should.equal(7);
                            cb();
                        });
                },
                // own records
                (cb) => { // request user's own phi data
                    request(app)
                        .get(`/phis/${user2.phiId}`)
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        });
                },
                (cb) => { // request user's own pii data
                    request(app)
                        .get(`/piis/${user2.piiId}`)
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
                            res.body.success.should.equal(true, res.body.message);
                            cb();
                        });
                },
                (cb) => { // request user's own pii data should fail, this is not a supported interface
                    request(app)
                        .get(`/users/${user2.id}`)
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
                            cb();
                        });
                },
                // someone else's records
                (cb) => { // someone else's phi data
                    request(app)
                        .get(`/phis/${user3.phiId}`)
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
                            cb();
                        });
                },
                (cb) => { // someone else's pii data
                    request(app)
                        .get(`/piis/${user3.piiId}`)
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
                            cb();
                        });
                },
                // /phis and /piis routes should not work
                (cb) => { // someone else's phi data
                    request(app)
                        .get(`/phis`)
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
                            cb();
                        });
                },
                (cb) => { // someone else's phi data
                    request(app)
                        .get(`/piis`)
                        .set('Accept', 'application/json')
                        .set('Authorization', `JWT ${token}`)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(404, JSON.stringify(res, null, 4));
                            cb();
                        });
                }
            ], done);
        });
    });
    describe('After login', () => {
        it('should not expose routes /phis and /piis to unauthenticated users', function (done) {
            async.series([
                // /phis and /piis routes should not work
                (cb) => { // someone else's phi data
                    request(app)
                        .get(`/phis`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
                            cb();
                        });
                },
                (cb) => { // someone else's phi data
                    request(app)
                        .get(`/piis`)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
                            cb();
                        });
                },
            ], done);
        });
    });
});
*/