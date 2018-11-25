import { hcUrl } from '../../../config';
import { GraphQLClient } from 'graphql-request/dist/src/index';

const options = {
  headers: { 'Content-Type': 'application/json' }
};
const endpoint = `${hcUrl}/graphql`;
const client = new GraphQLClient(endpoint, options);

export function drugInfoPredictiveSearch(params) {
  const query = getQuery(params);
  return client.request(query);

  function getQuery({q = '', page = 1}) {
    return `{
      medicationMaster (filter: {mongoQuery: "${getMongoQuery(q)}" }, page: ${page}) {
        items {
          _id
          ndc11
          srcNdc
          brandName
          genericNames
          rxnsatData {
            id
            rxcui
          }
          openFdaData {
            id
          }
        }
      }
    }`;
  }

  function getMongoQuery (match) {
    const condition = {brandName: {$exists: true}, rxnsatData: {$exists: true}, $or: []};
    const regex = {$regex: match, $options: 'i' };
    const brandNameCondition = {brandName: regex};
    const genericNamesCondition = {genericNames: regex};
    condition.$or.push(brandNameCondition, genericNamesCondition);

    const ndc11Condition = {ndc11: regex};
    const notNormalizedNdcCondition = {srcNdc: regex};
    const isPossibleNDC11 = match.split().every(c => /[\d-]/.test(c));
    isPossibleNDC11 && condition.$or.push(ndc11Condition, notNormalizedNdcCondition);

    return JSON.stringify(condition).replace(/"/g, '\\"');
  }
}

export function drugInfoById(id) {
  const query = getQuery(params);
  return client.request(query);

  function getQuery(id) {
    return `{
      medicationMaster (filter: {mongoQuery: "${getMongoQuery(q)}" }, page: ${page}) {
        items {
          _id
          ndc11
          srcNdc
          brandName
          genericNames
          rxnsatData {
            id
            rxcui
          }
          openFdaData {
            id
          }
        }
      }
    }`;
  }

  function getMongoQuery (match) {
    const condition = {brandName: {$exists: true}, rxnsatData: {$exists: true}, $or: []};
    const regex = {$regex: match, $options: 'i' };
    const brandNameCondition = {brandName: regex};
    const genericNamesCondition = {genericNames: regex};
    condition.$or.push(brandNameCondition, genericNamesCondition);

    const ndc11Condition = {ndc11: regex};
    const notNormalizedNdcCondition = {srcNdc: regex};
    const isPossibleNDC11 = match.split().every(c => /[\d-]/.test(c));
    isPossibleNDC11 && condition.$or.push(ndc11Condition, notNormalizedNdcCondition);

    return JSON.stringify(condition).replace(/"/g, '\\"');
  }
}
