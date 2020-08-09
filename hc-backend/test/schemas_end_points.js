const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const app = require('../app.js');
const modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate;
const _ = require('lodash');
const fixSchema = require('./../controllers/generator').fixSchema;


const modelsJson = require('./../src/data_model/model-v2');
const models = modelInstanceGenerator(modelsJson.models, "form");


const removeValidators = function (Schema) {
    for(var key in Schema){
        var field = Schema[key];
        
        if(_.isArray(field)){
            // TODO: rewrite as normal array (not sure will it be more than one item here os not!)
            field[0] = removeValidators(field[0]);
        }
        // console.log(typeof field.enum)
        
        if(!field.hasOwnProperty('type')){
            // TODO: rewrite as normal array (not sure will it be more than one item here os not!)
            field = removeValidators(field);
        }

        if(field.type !== undefined){
            if (field.validate && field.validate.validator) {
                delete field.validate.validator;
            }
            if (field.match) {
                if (_.isArray(field.match)) {
                    field.match[0] = {};
                }
                else {
                    field.match = {};
                }
            }
            if (field.default) {
                delete field.default;
            }
        }
        if (_.isArray(field.type)) {
            field.type[0] = null;
            // TODO is it correct case?
            if (field.enum === undefined) {
                delete field.enum;
            }
        }

    }
    return Schema;
};

describe('GET /api/schema name', () => {
    // TODO requests not return correct match regexp. Is it correct?
    it('should return status 200 and user schema', (done) => {
        request(app)
            .get('/api/schema/user')
            .expect(200)
            .end(function (err, res) {
                const schema = fixSchema(models.pii);
                console.log(res.body.data)
                // expect(schema).equal(res.body.data);
                expect(_.isEqual(schema, res.body.data)).equal(true);
                done();
            })
    });
    it('should return status 200 and phi schema', (done) => {
        request(app)
            .get('/api/schema/phidata')
            .expect(200)
            .end(function (err, res) {
                const schema = fixSchema(models.phi);
                // expect(schema).equal(res.body.data);
                expect(_.isEqual(schema, res.body.data)).equal(true);
                done();
            })
    });
    it('should return status 200 and pii schema', (done) => {
        request(app)
            .get('/api/schema/piidata')
            .expect(200)
            .end(function (err, res) {
                const schema = fixSchema(models.pii);
                // expect(schema).equal(res.body.data)
                expect(_.isEqual(schema, res.body.data)).equal(true);
                // expect(schema).equal(res.body.data);
                done();
            })
    });
    it('should return status 200 and medication schema', (done) => {
        request(app)
            .get('/api/schema/medication')
            .expect(200)
            .end(function (err, res) {
                const schema = fixSchema(models.phi.products);
                expect(_.isEqual(schema, res.body.data)).equal(true);
                done();
            })
    });
    it('should return status 200 and settings schema', (done) => {
        request(app)
            .get('/api/schema/settings')
            .expect(200)
            .end(function (err, res) {
                const schema = fixSchema(models.settings);
                expect(_.isEqual(schema, res.body.data)).equal(true);
                done();
            })
    });
});
