const validations = require('./../index').validators
    , chai = require('chai')
    , expect = chai.expect

const fooList = {
    testList: {
        foo: "foo",
        bar: "bar",
        buz: "buz"
    }
};

describe('Test validations', () => {
    it('should return error, body contain extra field ', (done) => {
        const body = {foo: 1, bar: 2};
        const model = {foo: {type: "Number"}};
        
        const result = validations.validateObjectWithModel(body, model, fooList);
        expect(result.bar.code).to.equal(validations.errorCodes.extraField);
        done();
    });
    
    it('should return error, model not contain type for field', (done) => {
        const body = {foo: 1};
        const model = {foo: {foo: "Number"}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result.foo.code).to.equal(validations.errorCodes.noTypeInModel);
        done();
    });
    
    it('should return error, model contain type but it subschema', (done) => {
        const body = {foo: 1};
        const model = {foo: {type: {any: "any"}}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result.foo.code).to.equal(validations.errorCodes.fieldForSubSchema);
        done();
    });
    
    it('test simple types validations, should return true', (done) => {
        const body = {foo: 1, bar: "2", bool: false};
        const model = {foo: {type: "Number"}, bar: {type: "String"}, bool: {type: "Boolean"}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result).to.equal(true);
        done();
    });
    
    it('maxlength string negative test, should return error', (done) => {
        const body = {bar: "123456"};
        const model = {bar: {type: "String", maxlength: 5}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result.bar.code).to.equal(validations.errorCodes.maxlengthError);
        done();
    });
    
    it('minlength string negative test, should return error', (done) => {
        const body = {bar: "1234"};
        const model = {bar: {type: "String", minlength: 5}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result.bar.code).to.equal(validations.errorCodes.minlengthError);
        done();
    });
    
    it('regexp string positive test, should return true', (done) => {
        const body = {email: "test@mail.ru"};
        const model = {email: {type: "String", regexp: ".+\\@.+\\..+"}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result).to.equal(true);
        done();
    });
    
    it('regexp string negative test, should return error', (done) => {
        const body = {email: "test"};
        const model = {email: {type: "String", regexp: ".+\\@.+\\..+"}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result.email.code).to.equal(validations.errorCodes.notCorrectFormat);
        done();
    });
    
    it('enum string positive test, should return true', (done) => {
        const body = {foo: "foo"};
        const model = {foo: {type: "String", list: "testList"}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result).to.equal(true);
        done();
    });
    
    it('enum string negative test, should return error', (done) => {
        const body = {foo: "fee"};
        const model = {foo: {type: "String", list: "testList"}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result.foo.code).to.equal(validations.errorCodes.notFoundValueInlist);
        done();
    });
    
    it('Date positive test, should return error', (done) => {
        const body = {foo: "2011-08-25T12:15:00Z"};
        const model = {foo: {type: "Date"}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result).to.equal(true);
        done();
    });
    
    it('Date negative test, should return error', (done) => {
        const body = {foo: "2011-08-ee25T12:15:00Z"};
        const model = {foo: {type: "Date"}};
        
        const result = validations.validateObjectWithModel(body, model);
        expect(result.foo.code).to.equal(validations.errorCodes.mustBeDate);
        done();
    });
});
