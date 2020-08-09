"use strict";
const modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate;
const modelJson = require('../src/data_model/model-v2.json');
const model = modelInstanceGenerator(modelJson.models.phi, "mongoose");
const dependencies = require('./../src/data_model/model_dependencies').phiDependecies;
const chai = require('chai');
const expect = chai.expect;
const _ = require('lodash');

let phi;

// Function check structures model and generated model instance.
const checkEqualWithoutEndValues = function (model, instance) {
    if (model.type) {
        return
    }
    if (typeof model !==  typeof instance) {
        return false;
    }
    
    const modelKeys = _.keys(model);
    const instanceKeys = _.keys(instance);
    if (!_.isEqual(modelKeys, instanceKeys)) {
        return false;
    }
    if (_.isArray(model) && _.isArray(instance)) {
        _.each(modelKeys, function(key) {
            if (checkEqualWithoutEndValues(model[key], instance[key]) === false) {
                return false
            }
        })
    }
    if (_.isObject(model) && _.isObject(instance)) {
        _.each(modelKeys, function(key) {
            if (checkEqualWithoutEndValues(model[key], instance[key]) === false) {
                return false
            }
        })
    }
    return true
};

describe('Model generator tests', () => {
    it('should create a new instance model via generator', (done) => {
        const phiObj = modelInstanceGenerator(model, "instance", dependencies);
        phi = phiObj;
        expect(true).to.equal(_.isObject(phiObj));
        done();
    });
    
    it('generated model instance structure must be equal model structure (without end values)', (done) => {
        expect(true).to.equal(checkEqualWithoutEndValues(model, phi));
        done();
    });
    
});