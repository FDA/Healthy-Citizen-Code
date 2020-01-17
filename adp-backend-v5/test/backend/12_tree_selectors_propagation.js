// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
// TODO: add tests for multiple tables
// TODO: add tests for default foreignKey

const request = require('supertest');
const should = require('should');
const { ObjectID } = require('mongodb');

const reqlib = require('app-root-path').require;

const {
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  checkRestSuccessfulResponse,
  conditionForActualRecord,
} = reqlib('test/test-util');
const {
  buildGraphQlUpdateOne,
  buildGraphQlDeleteOne,
  buildGraphQlQuery,
  checkGraphQlSuccessfulResponse,
  checkGraphQlErrorResponse,
} = reqlib('test/graphql-util.js');

describe('V5 TreeSelectors propagation', () => {
  const parent = {
    _id: ObjectID('5c6d437f9ea7665b9d924b00'),
    name: 'parent',
    hasChildren: true,
    ...conditionForActualRecord,
  };
  const parentLookup = { table: 'treeCollection', label: parent.name, _id: parent._id };

  const child1 = {
    _id: ObjectID('5c6d43809ea7665b9d928e9b'),
    parent: parentLookup,
    name: 'child1',
    hasChildren: true,
    ...conditionForActualRecord,
  };
  const child1Lookup = { table: 'treeCollection', label: child1.name, _id: child1._id };

  const child2 = {
    _id: ObjectID('5c6d43809ea7665b9d9298f7'),
    parent: child1Lookup,
    name: 'child2',
    hasChildren: false,
    ...conditionForActualRecord,
  };

  const treeSelectorData = [
    parentLookup,
    {
      table: 'treeCollection',
      label: child1.name,
      _id: child1._id,
    },
    {
      table: 'treeCollection',
      label: child2.name,
      _id: child2._id,
    },
  ];

  const model11treeselectorSample = {
    _id: ObjectID('3c6d437f9ea7665b9d924b01'),
    treeSelectorRequiredAllowedNode: treeSelectorData,
    treeSelectorRequiredNotAllowedNode: treeSelectorData,
    treeSelectorNotRequiredAllowedNode: treeSelectorData,
    treeSelectorNotRequiredNotAllowedNode: treeSelectorData,
    ...conditionForActualRecord,
  };

  before(async function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    const db = await getMongoConnection();
    this.db = db;
  });

  after(async function() {
    await this.db.dropDatabase();
    await this.db.close();
  });

  beforeEach(function() {
    return Promise.all([
      this.db.collection('treeCollection').deleteMany({}),
      this.db.collection('model11treeselector_propagation').deleteMany({}),
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ])
      .then(() =>
        Promise.all([
          this.db.collection('treeCollection').insertMany([parent, child1, child2]),
          this.db.collection('model11treeselector_propagation').insertOne(model11treeselectorSample),
        ])
      )
      .then(() => {
        setAppAuthOptions(this.appLib, {
          requireAuthentication: false,
        });
        return this.appLib.setup();
      });
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  describe(`should update TreeSelector lookups labels and data when parent's record is updated`, () => {
    const docId = parent._id.toString();
    const modelName = 'treeCollection';
    const record = {
      name: 'new_parent_name',
    };
    const getTestFunc = function(settings) {
      return f;

      function f() {
        const { makeRequest, checkResponse, checkTreeselectorPropagation } = settings;
        const req = makeRequest(request(this.appLib.app));
        if (this.token) {
          req.set('Authorization', `JWT ${this.token}`);
        }

        return req
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(res => {
            checkResponse(res);
            return checkTreeselectorPropagation(this.db);
          });
      }
    };

    const checkTreeselectorPropagation = async db => {
      const doc = await db
        .collection('model11treeselector_propagation')
        .findOne({ _id: model11treeselectorSample._id });
      // check transformation of label
      const treeSelectorExpected = [
        {
          table: parentLookup.table,
          label: 'new_parent_name',
          data: {
            info: 'new_parent_name-undefined',
          },
          _id: parentLookup._id,
        },
        treeSelectorData[1],
        treeSelectorData[2],
      ];
      should(doc).be.deepEqual({
        _id: model11treeselectorSample._id,
        treeSelectorRequiredAllowedNode: treeSelectorExpected,
        treeSelectorRequiredNotAllowedNode: treeSelectorExpected,
        treeSelectorNotRequiredAllowedNode: treeSelectorExpected,
        treeSelectorNotRequiredNotAllowedNode: treeSelectorExpected,
        ...conditionForActualRecord,
      });
    };
    const restSettings = {
      makeRequest: r => r.put(`/${modelName}/${docId}`).send({ data: record }),
      checkResponse: checkRestSuccessfulResponse,
      checkTreeselectorPropagation,
    };
    const graphqlSettings = {
      makeRequest: r => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
      checkResponse: checkGraphQlSuccessfulResponse,
      checkTreeselectorPropagation,
    };

    it(
      `REST: should update TreeSelector lookups labels and data when parent's record is updated`,
      getTestFunc(restSettings)
    );
    it(
      `GraphQL: should update TreeSelector lookups labels and data when parent's record is updated`,
      getTestFunc(graphqlSettings)
    );
  });

  describe(`should not allow to delete TreeSelector item with children`, () => {
    // More info about handling here: https://confluence.conceptant.com/display/DEV/Tree+Selector+Control
    const docId = parent._id.toString();
    const modelName = 'treeCollection';
    const getTestFunc = function(settings) {
      return f;

      function f() {
        const { makeRequest, checkResponse } = settings;
        const req = makeRequest(request(this.appLib.app));
        if (this.token) {
          req.set('Authorization', `JWT ${this.token}`);
        }

        return req
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(res => {
            checkResponse(res);
          });
      }
    };

    const restSettings = {
      makeRequest: r => r.del(`/${modelName}/${docId}`),
      checkResponse: res => {
        res.statusCode.should.equal(409);

        const { success, message } = res.body;
        success.should.equal(false);
        message.should.equal(
          `ERROR: Unable to delete this record because there are other records referring. Please update the referring records and remove reference to this record.`
        );
      },
    };
    const graphqlSettings = {
      makeRequest: r => r.post('/graphql').send(buildGraphQlDeleteOne(modelName, docId)),
      checkResponse: checkGraphQlErrorResponse,
    };

    it(`REST: should not allow to delete TreeSelector item with children`, getTestFunc(restSettings));
    it(`GraphQL: should not allow to delete TreeSelector item with children`, getTestFunc(graphqlSettings));
  });

  describe(`should handle TreeSelector lookups when leaf without record label field is deleted`, () => {
    // More info about handling here: https://confluence.conceptant.com/display/DEV/Tree+Selector+Control
    const getTestFunc = function(settings) {
      return f;

      async function f() {
        const { delRequest, getRequest, putRequest, checkGetResponse, checkPutResponse } = settings;
        await delRequest(request(this.appLib.app))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);

        const getRes = await getRequest(request(this.appLib.app))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);
        checkGetResponse(getRes);

        const putRes = await putRequest(request(this.appLib.app))
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/);
        checkPutResponse(putRes);
      }
    };
    const treeSelectorDataAllItems = treeSelectorData.map(elem => ({
      ...elem,
      _id: elem._id.toString(),
    }));
    const treeDocId = child2._id.toString();
    const treeCollectionName = `treeCollection`;
    const propagationCollectionName = `model11treeselector_propagation`;
    const restSettings = {
      delRequest: r => r.del(`/${treeCollectionName}/${treeDocId}`),
      getRequest: r => r.get(`/${propagationCollectionName}/${model11treeselectorSample._id.toString()}`),
      checkGetResponse: res => {
        res.body.success.should.equal(true);
        const { data } = res.body;

        should(data).be.deepEqual({
          _id: model11treeselectorSample._id.toString(),
          treeSelectorRequiredAllowedNode: treeSelectorDataAllItems.slice(0, 2),
          treeSelectorRequiredNotAllowedNode: treeSelectorDataAllItems,
          treeSelectorNotRequiredAllowedNode: treeSelectorDataAllItems.slice(0, 2),
          treeSelectorNotRequiredNotAllowedNode: null,
          deletedAt: new Date(0).toISOString(),
        });
      },
      putRequest: r =>
        r.put(`/${propagationCollectionName}/${model11treeselectorSample._id.toString()}`).send({
          data: {
            treeSelectorRequiredAllowedNode: treeSelectorDataAllItems,
            treeSelectorRequiredNotAllowedNode: treeSelectorDataAllItems,
            treeSelectorNotRequiredAllowedNode: treeSelectorDataAllItems,
            treeSelectorNotRequiredNotAllowedNode: treeSelectorDataAllItems,
          },
        }),
      checkPutResponse: res => {
        const { success, message } = res.body;
        should(success).be.equal(false);

        const [cause, info] = message.split(':');
        should(cause).be.equal('Found invalid tree selector data');

        const infoMessages = info.trim().split('. ');
        should(infoMessages).containDeep([
          'Unable to find a chain for field "treeSelectorNotRequiredAllowedNode"',
          'Unable to find a chain for field "treeSelectorNotRequiredNotAllowedNode"',
          'Unable to find a chain for field "treeSelectorRequiredAllowedNode"',
          'Unable to find a chain for field "treeSelectorRequiredNotAllowedNode"',
        ]);
      },
    };

    const lookupFields = 'table label _id';
    const selectFields = `items { _id treeSelectorRequiredAllowedNode{${lookupFields}} treeSelectorRequiredNotAllowedNode{${lookupFields}} treeSelectorNotRequiredAllowedNode{${lookupFields}} treeSelectorNotRequiredNotAllowedNode{${lookupFields}} }`;
    const graphqlSettings = {
      delRequest: r => r.post('/graphql').send(buildGraphQlDeleteOne(treeCollectionName, treeDocId)),
      getRequest: r =>
        r
          .post('/graphql')
          .send(
            buildGraphQlQuery(
              propagationCollectionName,
              `{_id: '${model11treeselectorSample._id.toString()}' }`,
              selectFields
            )
          ),
      checkGetResponse: res => {
        const data = res.body.data[propagationCollectionName].items[0];

        should(data).be.deepEqual({
          _id: model11treeselectorSample._id.toString(),
          treeSelectorRequiredAllowedNode: treeSelectorDataAllItems.slice(0, 2),
          treeSelectorRequiredNotAllowedNode: treeSelectorDataAllItems,
          treeSelectorNotRequiredAllowedNode: treeSelectorDataAllItems.slice(0, 2),
          treeSelectorNotRequiredNotAllowedNode: null,
        });
      },
      putRequest: r =>
        r.post('/graphql').send(
          buildGraphQlUpdateOne(
            propagationCollectionName,
            {
              treeSelectorRequiredAllowedNode: treeSelectorDataAllItems,
              treeSelectorRequiredNotAllowedNode: treeSelectorDataAllItems,
              treeSelectorNotRequiredAllowedNode: treeSelectorDataAllItems,
              treeSelectorNotRequiredNotAllowedNode: treeSelectorDataAllItems,
            },
            model11treeselectorSample._id.toString()
          )
        ),
      checkPutResponse: checkGraphQlErrorResponse,
    };
    it(
      `REST: should handle TreeSelector lookups when leaf without record label field is deleted`,
      getTestFunc(restSettings)
    );
    it(
      `GraphQL: should handle TreeSelector lookups when leaf without record label field is deleted`,
      getTestFunc(graphqlSettings)
    );
  });
});
