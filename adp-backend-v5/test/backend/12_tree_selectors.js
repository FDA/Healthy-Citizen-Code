// TODO: add tests for multiple tables
// TODO: add tests for default foreignKey

const request = require('supertest');
const should = require('should');
const { ObjectID } = require('mongodb');

const {
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  checkRestSuccessfulResponse,
  conditionForActualRecord,
  sortByIdDesc,
} = require('../test-util');
const {
  buildGraphQlCreate,
  buildGraphQlTreeselectorQuery,
  checkGraphQlSuccessfulResponse,
  checkGraphQlErrorResponse,
} = require('../graphql-util.js');

const { getTreeselectorTypeName } = require('../../lib/graphql/type/lookup');

describe('V5 TreeSelectors', function () {
  const parent1 = {
    _id: ObjectID('5c6d437f9ea7665b9d924b00'),
    name: 'parent1',
    hasChildren: true,
    ...conditionForActualRecord,
  };
  const parent1Lookup = { table: 'treeCollection', label: parent1.name, _id: parent1._id };

  const parent1children = [
    {
      _id: ObjectID('5c6d43809ea7665b9d928e9b'),
      parent: parent1Lookup,
      name: 'child1',
      hasChildren: false,
    },
    {
      _id: ObjectID('5c6d43809ea7665b9d9298f7'),
      parent: parent1Lookup,
      name: 'child2',
      hasChildren: false,
    },
    {
      _id: ObjectID('5c6d43809ea7665b9d9299e2'),
      parent: parent1Lookup,
      name: 'child3',
      hasChildren: true,
    },
  ].map((d) => ({ ...d, ...conditionForActualRecord }));

  const parent2 = {
    _id: ObjectID('5c6d437f9ea7665b9d924b01'),
    name: 'parent2',
    hasChildren: false,
    ...conditionForActualRecord,
  };

  before(async function () {
    prepareEnv();
    this.appLib = require('../../lib/app')();
    const db = await getMongoConnection();
    this.db = db;
  });

  after(async function () {
    await this.db.dropDatabase();
    await this.db.close();
  });

  beforeEach(async function () {
    await Promise.all([
      this.db.createCollection('model11treeselector'),
      this.db.createCollection('treeCollection'),
      this.db.collection('treeCollection').deleteMany({}),
      this.db.collection('model11treeselector').deleteMany({}),
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ]);
    await Promise.all([this.db.collection('treeCollection').insertMany([parent1, ...parent1children, parent2])]);
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  describe('returns correct results', function () {
    beforeEach(function () {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });
      return this.appLib.setup();
    });

    const getTestFunc = function (settings) {
      return f;

      async function f() {
        const { makeRequest, checkResponse, checkData, getData } = settings;
        const req = makeRequest(request(this.appLib.app));
        if (this.token) {
          req.set('Authorization', `JWT ${this.token}`);
        }

        const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
        checkResponse(res);
        checkData(getData(res));
      }
    };

    const treeselectorId = 'Model11treeselectorTreeselector';
    const treeSelectorTableName = 'treeCollection';

    const getRestData = (res) => res.body.data;
    const treeselectorTypeName = getTreeselectorTypeName(treeselectorId, treeSelectorTableName);
    const getGraphqlData = (res) => res.body.data[treeselectorTypeName].items;

    describe('for search for treeselector with filtering condition', function () {
      const _treeselectorId = 'model11treeselectorWithFilteringId';
      const tableName = 'treeCollection';
      const typeName = getTreeselectorTypeName(_treeselectorId, tableName);
      const form = { filteringField: parent1.name };
      const checkData = (results) => {
        results.length.should.equal(1);
        const { label } = results[0];
        label.should.equal(form.filteringField);
      };

      const restSettings = {
        makeRequest: (r) => r.post(`/treeselectors/${_treeselectorId}/${tableName}`).send(form),
        checkResponse: checkRestSuccessfulResponse,
        checkData,
        getData: getRestData,
      };
      const graphqlSettings = {
        makeRequest: (r) =>
          r.post('/graphql').send(
            buildGraphQlTreeselectorQuery({
              treeselectorId: _treeselectorId,
              tableName,
              form,
              selectFields: 'items { _id label table isLeaf }',
            })
          ),
        checkResponse: checkGraphQlSuccessfulResponse,
        checkData,
        getData: (res) => res.body.data[typeName].items,
      };
      it(
        `REST: returns correct results for search for treeselector with filtering condition`,
        getTestFunc(restSettings)
      );
      it(
        `GraphQL: returns correct results for search for treeselector with filtering condition`,
        getTestFunc(graphqlSettings)
      );
    });

    describe('when requesting roots containing data attribute', function () {
      const checkData = (data) => {
        data.length.should.equal(2);

        should(data[0]).be.deepEqual({
          _id: parent2._id.toString(),
          label: parent2.name,
          isLeaf: !parent2.hasChildren,
          table: 'treeCollection',
          data: {
            info: `${parent2.name}-${parent2.hasChildren}`,
          },
        });

        should(data[1]).be.deepEqual({
          _id: parent1._id.toString(),
          label: parent1.name,
          isLeaf: !parent1.hasChildren,
          table: 'treeCollection',
          data: {
            info: `${parent1.name}-${parent1.hasChildren}`,
          },
        });
      };
      const restSettings = {
        makeRequest: (r) => r.get(`/treeselectors/${treeselectorId}/${treeSelectorTableName}`),
        checkResponse: checkRestSuccessfulResponse,
        checkData,
        getData: getRestData,
      };
      const graphqlSettings = {
        makeRequest: (r) =>
          r.post('/graphql').send(
            buildGraphQlTreeselectorQuery({
              treeselectorId,
              tableName: treeSelectorTableName,
              selectFields: 'items { _id label table isLeaf data { info } }',
            })
          ),
        checkResponse: checkGraphQlSuccessfulResponse,
        checkData,
        getData: getGraphqlData,
      };

      it('REST: when requesting roots containing data attribute', getTestFunc(restSettings));
      it('GraphQL: when requesting roots containing data attribute', getTestFunc(graphqlSettings));
    });

    describe('when requesting children (for default first page)', function () {
      const foreignKeyVal = parent1._id.toString();
      const checkData = (data) => {
        // limitReturnedRecords = 2
        data.length.should.equal(2);
        const childrenSortedByIdDesc = sortByIdDesc(parent1children);
        data.forEach((foundChild, i) => {
          const parentChild = childrenSortedByIdDesc[i];
          should(foundChild).be.deepEqual({
            _id: parentChild._id.toString(),
            label: parentChild.name,
            isLeaf: !parentChild.hasChildren,
            table: 'treeCollection',
            data: {
              info: `${parentChild.name}-${parentChild.hasChildren}`,
            },
          });
        });
      };

      const restSettings = {
        makeRequest: (r) =>
          r.get(`/treeselectors/${treeselectorId}/${treeSelectorTableName}?foreignKeyVal=${foreignKeyVal}`),
        checkResponse: checkRestSuccessfulResponse,
        checkData,
        getData: getRestData,
      };
      const graphqlSettings = {
        makeRequest: (r) =>
          r.post('/graphql').send(
            buildGraphQlTreeselectorQuery({
              treeselectorId,
              tableName: treeSelectorTableName,
              selectFields: 'items { _id label table isLeaf data { info } }',
              foreignKeyVal,
            })
          ),
        checkResponse: checkGraphQlSuccessfulResponse,
        checkData,
        getData: getGraphqlData,
      };

      it('REST: when requesting children (for default first page)', getTestFunc(restSettings));
      it('GraphQL: when requesting children (for default first page)', getTestFunc(graphqlSettings));
    });

    describe('when requesting children with pagination (page=2)', function () {
      const foreignKeyVal = parent1._id.toString();
      const checkData = (data) => {
        data.length.should.equal(1);
        const childrenSortedByIdDesc = sortByIdDesc(parent1children);
        const thirdChild = childrenSortedByIdDesc[2];
        const foundChild = data[0];
        should(foundChild).be.deepEqual({
          _id: thirdChild._id.toString(),
          label: thirdChild.name,
          isLeaf: !thirdChild.hasChildren,
          table: 'treeCollection',
          data: {
            info: `${thirdChild.name}-${thirdChild.hasChildren}`,
          },
        });
      };

      const page = `2`;
      const restSettings = {
        makeRequest: (r) =>
          r.get(
            `/treeselectors/${treeselectorId}/${treeSelectorTableName}?foreignKeyVal=${foreignKeyVal}&page=${page}`
          ),
        checkResponse: checkRestSuccessfulResponse,
        checkData,
        getData: getRestData,
      };
      const graphqlSettings = {
        makeRequest: (r) =>
          r.post('/graphql').send(
            buildGraphQlTreeselectorQuery({
              treeselectorId,
              tableName: treeSelectorTableName,
              selectFields: 'items { _id label table isLeaf data { info } }',
              foreignKeyVal,
              page: 2,
            })
          ),
        checkResponse: checkGraphQlSuccessfulResponse,
        checkData,
        getData: getGraphqlData,
      };

      it('REST: when requesting children with pagination (page=2)', getTestFunc(restSettings));
      it('GraphQL: when requesting children with pagination (page=2)', getTestFunc(graphqlSettings));
    });
  });

  describe('create TreeSelector', function () {
    beforeEach(function () {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });
      return this.appLib.setup();
    });

    describe('should submit doc with TreeSelector data ending with leaf', function () {
      const treeSelectorData = [
        { ...parent1Lookup, _id: parent1Lookup._id.toString() },
        {
          table: 'treeCollection',
          label: parent1children[0].name,
          _id: parent1children[0]._id.toString(),
        },
      ];
      const record = {
        treeSelector: treeSelectorData,
      };
      const getTestFunc = function (settings) {
        return f;

        async function f() {
          const { makeRequest, checkResponse, getCreatedDocId } = settings;
          const req = makeRequest(request(this.appLib.app));
          if (this.token) {
            req.set('Authorization', `JWT ${this.token}`);
          }

          const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
          checkResponse(res);
          const doc = await this.db.collection('model11treeselector').findOne({ _id: ObjectID(getCreatedDocId(res)) });
          // check transformation of lookups field '_id' inside TreeSelector
          const { treeSelector } = doc;
          should(treeSelector.length).be.equal(2);

          const expectedStoredData = treeSelectorData.map((d) => ({ ...d, _id: ObjectID(d._id) }));
          should(treeSelector).be.deepEqual(expectedStoredData);
        }
      };

      const modelName = 'model11treeselector';
      const createDocRestRequest = (r) => r.post(`/${modelName}`).send({ data: record });
      const createDocGraphqlRequest = (r) => r.post('/graphql').send(buildGraphQlCreate(modelName, record));

      const restSettings = {
        makeRequest: createDocRestRequest,
        checkResponse: checkRestSuccessfulResponse,
        getCreatedDocId: (res) => res.body.id,
      };
      const graphqlSettings = {
        makeRequest: createDocGraphqlRequest,
        checkResponse: checkGraphQlSuccessfulResponse,
        getCreatedDocId: (res) => res.body.data[`${modelName}Create`]._id,
      };

      it('REST: should submit doc with TreeSelector data ending with leaf', getTestFunc(restSettings));
      it('GraphQL: should submit doc with TreeSelector data ending with leaf', getTestFunc(graphqlSettings));
    });

    describe('should not submit doc with TreeSelector data ending with not leaf', function () {
      const treeSelectorData = [
        { ...parent1Lookup, _id: parent1Lookup._id.toString() },
        {
          table: 'treeCollection',
          label: parent1children[2].name,
          _id: parent1children[2]._id.toString(),
        },
      ];
      const record = {
        treeSelector: treeSelectorData,
      };
      const getTestFunc = function (settings) {
        return f;

        async function f() {
          const { makeRequest, checkResponse } = settings;
          const req = makeRequest(request(this.appLib.app));
          if (this.token) {
            req.set('Authorization', `JWT ${this.token}`);
          }

          const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
          checkResponse(res);
        }
      };

      const modelName = 'model11treeselector';
      const createDocRestRequest = (r) => r.post(`/${modelName}`).send({ data: record });
      const createDocGraphqlRequest = (r) => r.post('/graphql').send(buildGraphQlCreate(modelName, record));

      const restSettings = {
        makeRequest: createDocRestRequest,
        checkResponse: (res) => {
          const { success, message } = res.body;
          success.should.equal(false);
          message.should.equal(
            'Found invalid tree selector data: Last element must be a leaf for field "treeSelector"'
          );
        },
      };
      const graphqlSettings = {
        makeRequest: createDocGraphqlRequest,
        checkResponse: checkGraphQlErrorResponse,
      };

      it('REST: should not submit doc with TreeSelector data ending with not leaf', getTestFunc(restSettings));
      it('GraphQL: should not submit doc with TreeSelector data ending with not leaf', getTestFunc(graphqlSettings));
    });
  });
});
