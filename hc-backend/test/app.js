const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const app = require('../app.js');
const modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate;
const _ = require('lodash');

const Phi = require('./../models/phi_data');
const Pii = require('./../models/pii_data');
const Settings = require('./../models/settings');
const Medication = require('./../models/medication');
const User = require('./../models/pii_data');
const generateString = require('../lib/randomstring');

const PASSWORD = 'mocha_test';
const EMAIL = 'mocha_test@gmail.com';

const modelsJson = require('./../src/data_model/model-v2');
let models = modelInstanceGenerator(modelsJson.models, "mongoose");

let userObj = modelInstanceGenerator(models.pii, "instance");


userObj.email = EMAIL;
userObj.password = PASSWORD;
let user = new User(userObj);
let token;


user.save(function (err) {
    let userId;
    describe('POST /api/login', () => {
        it('should return token and status success===true', (done) => {
            request(app)
                .post('/api/login')
                .send({email: EMAIL, password: PASSWORD})
                .end(function (err, res) {
                    expect(res.body.success).equal(true);
                    userId = res.body.user._id;
                    expect(res.body.token).to.be.a("string");
                    token = res.body.token;
                    done();
                })
        });
    });
    
    describe('USER requests', () => {
        let user;
        before(function () {
            user = {
                firstName: generateString.generate(),
                lastName: generateString.generate(),
                email: generateString.generate() + "@gmail.com",
                provider: generateString.generate(),
                password: "qe1qwqd"
            }
        });
        it('POST /api/user should return status 200 and create new user', (done) => {
            request(app)
                .post('/api/user')
                .send(user)
                .expect(200)
                .end(function (err, res) {
                    User.find({email: user.email}).lean().exec()
                        .then(function (result) {
                            expect(result.length).to.equal(1);
                            expect(user.firstName).to.equal(result[0].firstName);
                            expect(user.lastName).to.equal(result[0].lastName);
                            expect(user.provider).to.equal(result[0].provider);
                            userId = result[0]._id;
                            done();
                        })
                        .catch(function (error) {
                            done(error);
                        })
                })
        });
        it('GET /api/user should return status 200 and user datat', (done) => {
            request(app)
                .get('/api/user/' + userId)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    expect(res.body.firstName).to.equal(user.firstName);
                    expect(res.body.lastName).to.equal(user.lastName);
                    expect(res.body.provider).to.equal(user.provider);
                    done();
                })
        });
        it('PUT /api/user/:id should return status 200 and update user', (done) => {
            let updatedUser = Object.assign(user);
            updatedUser.firstName = "pepe1";
            request(app)
                .put('/api/user/' + userId)
                .set('authorization', "Bearer: " + token)
                .send(updatedUser)
                .expect(200)
                .end(function (err, res) {
                    User.find({_id: userId}).lean().exec()
                        .then(function (result) {
                            expect(result.length).to.equal(1);
                            expect(result[0].firstName).to.equal(updatedUser.firstName);
                            done();
                        })
                        .catch(function (error) {
                            done(error);
                        })
                })
        });
        it('DEl /api/user/:id should return status 200 and remove user from bd', (done) => {
            request(app)
                .del('/api/user/' + userId)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    User.find({email: user.email}).lean().exec()
                        .then(function (result) {
                            expect(result.length).to.equal(0);
                            done();
                        })
                        .catch(function (error) {
                            done(error);
                        })
                });
        });
        after(function () {
            User.find({email: userObj.email}).remove().exec();
        });
    });
    
    
    // describe('MEDICATIONS request', () => {
    //     let medication;
    //     let medicationId;
    //     before(function () {
    //         medication = models.phi.products;
    //     });
    //     it('GET /api/medication should return status 200', (done) => {
    //         request(app)
    //             .get('/api/medication')
    //             .set('authorization', "Bearer: " + token)
    //             .expect(200, done)
    //     });
    //     it('POST /api/medication should return status 200', (done) => {
    //         request(app)
    //             .post('/api/medication')
    //             .send(medication)
    //             .set('authorization', "Bearer: " + token)
    //             .expect(200)
    //             .end(function (err, res) {
    //                 medicationId = res.body._id;
    //                 Medication.find({medicationName: medication.medicationName}).lean().exec()
    //                     .then(function (result) {
    //                         const medicationFromBD = result[0];
    //                         expect(medicationFromBD.dosage).to.equal(medication.dosage);
    //                         expect(_.isEqual(medicationFromBD.frequency, medication.frequency)).to.equal(true);
    //                         expect(medicationFromBD.route).to.equal(medication.route);
    //                         done();
    //                     })
    //                     .catch(function (error) {
    //                         done(error);
    //                     })
    //             })
    //     });
    //     it('GET /api/medication/:id should return status 200', (done) => {
    //         request(app)
    //             .get('/api/medication/' + medicationId)
    //             .set('authorization', "Bearer: " + token)
    //             .expect(200)
    //             .end(function (err, res) {
    //                 expect(res.body.medicationName).to.equal(medication.medicationName);
    //                 expect(res.body.dosage).to.equal(medication.dosage);
    //                 expect(res.body.frequency, medication.frequency).to.equal(medication.frequency);
    //                 expect(res.body.route).to.equal(medication.route);
    //                 done();
    //             })
    //     });
    //     it('PUT /api/medication/:id should return status 200 and update medication in bd', (done) => {
    //         medication.dosage = "";
    //         request(app)
    //             .put('/api/medication/' + medicationId)
    //             .send(medication)
    //             .set('authorization', "Bearer: " + token)
    //             .expect(200)
    //             .end(function (err, res) {
    //                 Medication.find({medicationName: medication.medicationName}).lean().exec()
    //                     .then(function (result) {
    //                         expect(result.length).to.equal(1);
    //                         expect(result[0].dosage).to.equal("");
    //                         done();
    //                     })
    //                     .catch(function (error) {
    //                         done(error);
    //                     })
    //             });
    //     });
    //     it('DEl /api/medication/:id should return status 200 and remove medication from bd', (done) => {
    //         request(app)
    //             .del('/api/medication/' + medicationId)
    //             .set('authorization', "Bearer: " + token)
    //             .expect(200)
    //             .end(function (err, res) {
    //                 Medication.find({medicationName: medication.medicationName}).lean().exec()
    //                     .then(function (result) {
    //                         expect(result.length).to.equal(0);
    //                         done();
    //                     })
    //                     .catch(function (error) {
    //                         done(error);
    //                     })
    //             });
    //     });
    //     after(function () {
    //         Medication.find({_id: medicationId}).remove().exec();
    //     });
    // });
        

    describe('PHI requests', () => {
        let phi;
        before(function () {
            phi = modelInstanceGenerator(models.phi, "instance");
            phi.email = phi.email + '@gmail.com'
        });
        it('GET should return status 200', (done) => {
            request(app)
                .get('/api/phidata')
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    done()
                })
        });
        it('POST /api/phidata should return status 200 and create phi in db', (done) => {
            request(app)
                .post('/api/phidata')
                .set('authorization', "Bearer: " + token)
                .send(phi)
                .expect(200)
                .end(function (err, res) {
                    let resPhi = res.res.body;
                    Phi.find({email: resPhi.email}).lean().exec()
                        .then(function (result) {
                            const phiFromBD = result[0];
                            expect(phiFromBD.encounters[0].facilityCode).to.equal(resPhi.encounters[0].facilityCode);
                            expect(_.isEqual(phiFromBD.labTests[0].testName, resPhi.labTests[0].testName)).to.equal(true);
                            expect(phiFromBD.products[0].fdaProductCode).to.equal(resPhi.products[0].fdaProductCode);
                            done();
                        })
                        .catch(function (err) {
                            done(err)
                        })
                });
        });
        it('PUT /api/phidata/:id should return status 200 and update phi', (done) => {
            let updatedPhi = Object.assign({}, phi);
            updatedPhi.encounters = [];
            request(app)
                .put('/api/phidata/' + phi._id)
                .set('authorization', "Bearer: " + token)
                .send(updatedPhi)
                .expect(200)
                .end(function (err, res) {
                    Phi.find({email: updatedPhi.email}).lean().exec()
                        .then(function (result) {
                            expect(result[0].encounters).to.equal([]);
                            done();
                        })
                        .catch(function (err) {
                            done(err)
                        })
                })
                
        });
        it('DEl /api/phidata/:id should return status 200 and remove phi from db', (done) => {
            request(app)
                .del('/api/phidata/' + phi._id)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    Phi.find({email: phi.email}).lean().exec()
                        .then(function (result) {
                            expect(result.length).to.equal(0);
                            done();
                        })
                        .catch(function (err) {
                            done(err)
                        })
                })
        });
        it('GET /api/phidata/by-email/:email should return status 200 and phi from bd', (done) => {
            console.log(phi.email)
            request(app)
                .get('/api/phidata/by-email/' + phi.email)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    expect(res.body.encounters[0].facilityCode).to.equal(phi.encounters[0].facilityCode);
                    expect(_.isEqual(res.body.labTests[0].testName, phi.labTests[0].testName)).to.equal(true);
                    expect(res.body.products[0].fdaProductCode).to.equal(phi.products[0].fdaProductCode);
                    done();
                })
        });
        after(function () {
            Phi.find({email: phi.email}).remove().exec();
        });
        
    });

    
    describe('PII requests', () => {
        let pii;
        let piId;
        before(function () {
            pii = modelInstanceGenerator(models.pii, "instance");
            pii.email = generateString.generate() + "@gmail.com"
        });
        it('GET should return status 200', (done) => {
            request(app)
                .get('/api/piidata')
                .set('authorization', "Bearer: " + token)
                .expect(200, done)
        });
        it('POST /api/piidata should return status 200', (done) => {
            request(app)
                .post('/api/piidata')
                .set('authorization', "Bearer: " + token)
                .send(pii)
                .expect(200)
                .end(function (err, res) {
                    Pii.find({email: pii.email}).lean().exec()
                        .then(function (response) {
                            expect("find pii count: "+response.length).to.equal("find pii count: "+1);
                            expect(pii.citizenPiiId).to.equal(response[0].citizenPiiId);
                            expect(pii.email).to.equal(response[0].email);
                            piId = response[0]._id;
                            done();
                        })
                        .catch(function (err) {
                            done(err);
                        })
                })
        });
        it('GET /api/piidata/:id should return status 200', (done) => {
            request(app)
                .get('/api/piidata/' + piId)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    let response = res.body;
                    expect(pii.citizenPiiId).to.equal(response.citizenPiiId);
                    expect(pii.email).to.equal(response.email);
                    done();
                });
        });
        it('PUT /api/piidata/:id should return status 200', (done) => {
            let updatedPii = Object.assign({}, pii);
            updatedPii.demographic = {};
            request(app)
                .put('/api/piidata/' + piId)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    Pii.find({email: updatedPii.email}).lean().exec()
                        .then(function (result) {
                            expect(_.isEqual(result[0].demographic, {})).to.equal(true);
                            done();
                        })
                        .catch(function (err) {
                            done(err);
                        })
                })
        });
        it('DEl /api/piidata/:id should return status 200', (done) => {
            request(app)
                .del('/api/piidata/' + piId)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    Pii.find({email: pii.email}).lean().exec()
                        .then(function (result) {
                            expect(result.length).to.equal(0);
                            done();
                        })
                        .catch(function (err) {
                            done(err);
                        })
                })
        });
        it('GET /api/piidata/by-email/:email should return status 200', (done) => {
            request(app)
                .get('/api/piidata/by-email/' + pii.email)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    expect(res.body.citizenPiiId).to.equal(pii.citizenPiiId);
                    done();
                });
        });
        after(function () {
            Pii.find({email: pii.email}).remove().exec();
        });
        
        
    });
    
    
    describe('SETTINGS requests', () => {
        let setting;
        let settingsId;
        before(function () {
            setting = {key: "qweqweqwe", val: "qwecqcqfqff"};
        });
        it('GET /api/settings should return status 200', (done) => {
            request(app)
                .get('/api/settings')
                .set('authorization', "Bearer: " + token)
                .expect(200, done)
        });
        it('POST /api/settings should return status 200 and create setting in bd', (done) => {
            request(app)
                .post('/api/settings')
                .set('authorization', "Bearer: " + token)
                .send(setting)
                .expect(200)
                .end(function (err, res) {
                    settingsId = res.body._id;
                    Settings.find({_id: settingsId}).lean().exec()
                        .then(function (response) {
                            expect("find setting count: "+response.length).to.equal("find setting count: "+1);
                            expect(setting.key).to.equal(response[0].key);
                            expect(setting.val).to.equal(response[0].val);
                            done();
                        })
                        .catch(function (err) {
                            done(err);
                        })
                })
        });
        
        it('GET /api/settings/:id should return status 200 and return setting', (done) => {
            request(app)
                .get('/api/settings/' + settingsId)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    expect(setting.key).to.equal(res.body.key);
                    expect(setting.val).to.equal(res.body.val);
                    done();
                })
        });
        
        it('PUT /api/settings/:id should return status 200 and update setting in bd', (done) => {
            let updatedSetting = Object.assign({}, setting);
            updatedSetting.key = "";
            request(app)
                .put('/api/settings/' + settingsId)
                .set('authorization', "Bearer: " + token)
                .send(updatedSetting)
                .expect(200)
                .end(function (err, res) {
                    Settings.find({_id: settingsId}).lean().exec()
                        .then(function (result) {
                            expect(result[0].key).to.equal("");
                            done();
                        })
                        .catch(function (err) {
                            done(err);
                        })
                })
        });
        it('DEl /api/settings/:id should return status 200 and remove setting from bd', (done) => {
            request(app)
                .del('/api/settings/' + settingsId)
                .set('authorization', "Bearer: " + token)
                .expect(200)
                .end(function (err, res) {
                    Settings.find({_id: settingsId}).lean().exec()
                        .then(function (result) {
                            expect(result.length).to.equal(0);
                            done();
                        })
                        .catch(function (err) {
                            done(err);
                        })
                })
        });
        after(function () {
            Settings.find({_id: settingsId}).remove().exec();
        });
    });
  
    
    describe('GET /', () => {
        it('should return 200 OK', (done) => {
            request(app)
                .get('/')
                .expect(200, done);
        });
    });
    
    describe('GET /random-url', () => {
        it('should return 404', (done) => {
            request(app)
                .get('/reset')
                .expect(404, done);
        });
    });

    // User.remove({ email: EMAIL }, (err) => {});
});

