const should = require('should');
const _ = require('lodash');
const stringifyObject = require('stringify-object');
const { getTreeselectorTypeName, getLookupTypeName } = require('../lib/graphql/type/lookup');

const formatGraphqlFilter = obj => {
  const objWithoutUndefined = _.pickBy(obj, val => val !== undefined);
  return stringifyObject(objWithoutUndefined, { indent: '  ', singleQuotes: false });
};

const buildGraphQlCreate = (modelName, record, selectFields = '_id') => ({
  query: `mutation ($record: ${modelName}InputWithoutId!) { ${modelName}Create (record: $record) { ${selectFields} } }  `,
  variables: { record },
});
const buildGraphQlUpdateOne = (modelName, record, docId, selectFields = '_id') => ({
  query: `mutation ($record: ${modelName}InputWithoutId!) { ${modelName}UpdateOne (filter: { _id: "${docId}" }, record: $record) { ${selectFields} } }  `,
  variables: { record },
});
const buildGraphQlDeleteOne = (modelName, docId) => ({
  query: `mutation { ${modelName}DeleteOne (filter: { _id: "${docId}" } ) { deletedCount } }`,
});
const buildGraphQlQuery = (modelName, mongoQuery, selectFields = 'items { _id }') => ({
  query: `query { ${modelName} (filter: { mongoQuery: "${mongoQuery}" } ) { ${selectFields} } }`,
});
const buildGraphQlDxQuery = (modelName, dxQuery, quickFilterId, selectFields = 'items { _id }') => {
  const filter = `filter: ${formatGraphqlFilter({ dxQuery, quickFilterId })}`;
  return { query: `query { ${modelName}Dx (${filter}) { ${selectFields} } }` };
};

const buildGraphQlLookupQuery = ({
  lookupId,
  tableName,
  dxQuery,
  q = '',
  form,
  selectFields = 'items { _id label table }',
  page,
  perPage,
  sort,
}) => {
  const filterObj = { q, form, dxQuery };
  const filter = `filter: ${formatGraphqlFilter(filterObj)}`;
  const queryName = getLookupTypeName(lookupId, tableName);
  return {
    query: `query { ${queryName} (${filter} ${getQueryParams({ page, perPage, sort })}) { ${selectFields} } }`,
  };
};
const buildGraphQlTreeselectorQuery = ({
  treeselectorId,
  tableName,
  q,
  form,
  foreignKeyVal,
  selectFields = 'items { _id label table isLeaf }',
  page,
  perPage,
  sort,
}) => {
  const filterObj = { q, foreignKeyVal, form };
  const filter = `filter: ${formatGraphqlFilter(filterObj)}`;
  const queryName = getTreeselectorTypeName(treeselectorId, tableName);
  return {
    query: `query { ${queryName} (${filter} ${getQueryParams({ page, perPage, sort })}) { ${selectFields} } }`,
  };
};

function getQueryParams({ page, perPage, sort }) {
  const pagePart = `${page ? `page: ${page}` : ''}`;
  const perPagePart = `${perPage ? `perPage: ${perPage}` : ''}`;
  const sortPart = `${sort ? `sort: "${sort}"` : ''}`;
  return `${pagePart} ${perPagePart} ${sortPart}`;
}

const checkGraphQlSuccessfulResponse = res => {
  should(res.statusCode).equal(200);
  should(res.body.errors).be.undefined();
};
const checkGraphQlErrorResponse = res => {
  should(res.statusCode).equal(200);
  should(res.body.errors).not.be.undefined();
};
const checkGraphQlInvalidRequest = res => {
  should(res.statusCode).equal(500);
  should(res.body.errors).not.be.undefined();
};
const checkGraphQlNoDataResponse = res => {
  should(res.statusCode).equal(200);
  const dataKeys = Object.keys(res.body.data);
  should(dataKeys.length).be.equal(1);
  const [modelName] = dataKeys;
  should(res.body.data[modelName].items).be.empty();
};

module.exports = {
  buildGraphQlCreate,
  buildGraphQlUpdateOne,
  buildGraphQlDeleteOne,
  buildGraphQlQuery,
  buildGraphQlDxQuery,
  buildGraphQlLookupQuery,
  buildGraphQlTreeselectorQuery,
  checkGraphQlSuccessfulResponse,
  checkGraphQlErrorResponse,
  checkGraphQlNoDataResponse,
  checkGraphQlInvalidRequest,
};
