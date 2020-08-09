"use strict";
const chai = require('chai');
const expect = chai.expect;
const _ = require('lodash');

const onExistValidator = require('./../validators/on_exist_value_validator');

describe('on exist value valitor tests:', () => {
    it('should return true, tested obj contain field with current value', (done) => {
        const testesObj = {
            soloString1: "string1",
            array1: [{foo: "buz"}]
        };
        let result = onExistValidator.isExist(testesObj, "soloString1", "string1")
        expect(result).to.equal(true);
        done();
    });
    
    it('should return false, tested obj not contain field with current value', (done) => {
        const testesObj = {
            soloString1: "string1",
            soloString2: "string2",
            array1: [{foo: "buz"}]
        };
        let result = onExistValidator.isExist(testesObj, "soloString1", "string3")
        expect(result).to.equal(false);
        done();
    });
    
    it('generated model instance structure must be equal model structure (without end values)', (done) => {
        const testesObj = [{foo: "buz"}, {foo: "buz", }, {foo: "buz", }, {foo: "bug", }];
        let result = onExistValidator.isExist(testesObj, "foo", "buz")
        expect(_.isEqual(result, [0, 1, 2])).to.equal(true);
        done();
    });
});