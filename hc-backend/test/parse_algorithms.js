
const request = require('supertest')
    , chai = require('chai')
    , expect = chai.expect
    , assert = chai.assert
    , _ = require('lodash')
    , parseAlgorithms = require("./../lib/parse_algorithms");


describe('Test parseReqParamsForDynamicRoutesAndBuildPaths', () => {
    it('should return correct built path, first assert with last index, second - not.', (done) => {
        const pathToModel = "bar[0].buz[0]";
        const params = {
            fooId: "1",
            barId: "2",
            buzId: "3",
            extraId: "4"
        };
        const expectedObject = [{path: "bar", id: "2"}, {path: "buz"}];
        const expectedObjectWithEndIndex = [{path: "bar", id: "2"}, {path: "buz", id: "3"}];
        
        const result = parseAlgorithms.parseReqParamsForDynamicRoutesAndBuildPaths(pathToModel, params);
        const resultWithLastIndex = parseAlgorithms.parseReqParamsForDynamicRoutesAndBuildPaths(pathToModel, params, true);
        expect(_.isEqual(result, expectedObject)).to.equal(true);
        expect(_.isEqual(resultWithLastIndex, expectedObjectWithEndIndex)).to.equal(true);
        done();
    });
});
