// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
// TODO: add tests for multiple tables
// TODO: add tests for default foreignKey

const request = require('supertest');
const should = require('should');
const { ObjectID } = require('mongodb');

const reqlib = require('app-root-path').require;

const { getMongoConnection, setAppAuthOptions, prepareEnv } = reqlib('test/backend/test-util');

describe('V5 Backend Lookups', () => {
  const parent1 = { _id: ObjectID('5c6d437f9ea7665b9d924b00'), name: 'parent1', hasChildren: true };
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
  ];
  const parent2 = {
    _id: ObjectID('5c6d437f9ea7665b9d924b01'),
    name: 'parent2',
    hasChildren: false,
  };

  const treeSelectorData = [
    parent1Lookup,
    {
      table: 'treeCollection',
      label: parent1children[0].name,
      _id: parent1children[0]._id,
    },
    {
      table: 'treeCollection',
      label: parent1children[1].name,
      _id: parent1children[1]._id,
    },
  ];

  const model11treeselectorSample = {
    _id: ObjectID('3c6d437f9ea7665b9d924b01'),
    treeSelectorRequiredAllowedNode: treeSelectorData,
    treeSelectorRequiredNotAllowedNode: treeSelectorData,
    treeSelectorNotRequiredAllowedNode: treeSelectorData,
    treeSelectorNotRequiredNotAllowedNode: treeSelectorData,
  };

  before(function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    return getMongoConnection().then(db => {
      this.db = db;
    });
  });

  after(function() {
    return this.db.dropDatabase().then(() => this.db.close());
  });

  beforeEach(function() {
    return Promise.all([
      this.db.collection('treeCollection').remove({}),
      this.db.collection('model11treeselector_propagation').remove({}),
      this.db.collection('users').remove({}),
      this.db.collection('mongoMigrateChangeLog').remove({}),
    ]).then(() =>
      Promise.all([
        this.db.collection('treeCollection').insertMany([parent1, ...parent1children, parent2]),
        this.db.collection('model11treeselector_propagation').insert(model11treeselectorSample),
      ])
    );
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  it(`should update TreeSelector lookups labels when parent's record label field is updated`, function() {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
    });

    return this.appLib
      .setup()
      .then(() =>
        request(this.appLib.app)
          .put(`/treeCollection/${parent1._id.toString()}`)
          .send({
            data: {
              name: 'new_parent_name',
            },
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
      )
      .then(res => {
        res.body.success.should.equal(true, res.body.message);
        return request(this.appLib.app)
          .get(`/model11treeselector_propagation/${model11treeselectorSample._id.toString()}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
      })
      .then(res => {
        res.body.success.should.equal(true, res.body.message);

        const { data } = res.body;

        // check transformation of label
        const treeSelectorExpected = [
          {
            table: parent1Lookup.table,
            label: 'new_parent_name',
            _id: parent1Lookup._id.toString(),
          },
          {
            ...treeSelectorData[1],
            _id: treeSelectorData[1]._id.toString(),
          },
          {
            ...treeSelectorData[2],
            _id: treeSelectorData[2]._id.toString(),
          },
        ];
        should(data).be.deepEqual({
          _id: model11treeselectorSample._id.toString(),
          treeSelectorRequiredAllowedNode: treeSelectorExpected,
          treeSelectorRequiredNotAllowedNode: treeSelectorExpected,
          treeSelectorNotRequiredAllowedNode: treeSelectorExpected,
          treeSelectorNotRequiredNotAllowedNode: treeSelectorExpected,
        });
      });
  });

  it(`should handle TreeSelector lookups when parent's record label field is deleted`, function() {
    // More info about handling here: https://confluence.conceptant.com/display/DEV/Tree+Selector+Control
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
    });

    return this.appLib
      .setup()
      .then(() =>
        request(this.appLib.app)
          .del(`/treeCollection/${parent1._id.toString()}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
      )
      .then(res => {
        res.body.success.should.equal(true, res.body.message);
        return request(this.appLib.app)
          .get(`/model11treeselector_propagation/${model11treeselectorSample._id.toString()}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200);
      })
      .then(res => {
        res.body.success.should.equal(true, res.body.message);

        const { data } = res.body;

        const treeSelectorDataAllItems = treeSelectorData.map(elem => ({
          ...elem,
          _id: elem._id.toString(),
        }));
        should(data).be.deepEqual({
          _id: model11treeselectorSample._id.toString(),
          treeSelectorRequiredAllowedNode: treeSelectorDataAllItems.slice(0, 2),
          treeSelectorRequiredNotAllowedNode: treeSelectorDataAllItems,
          treeSelectorNotRequiredAllowedNode: treeSelectorDataAllItems.slice(0, 2),
          treeSelectorNotRequiredNotAllowedNode: null,
        });

        // try put data with lookup referenced to deleted treeCollection item
        return request(this.appLib.app)
          .put(`/model11treeselector_propagation/${model11treeselectorSample._id.toString()}`)
          .send({
            data: {
              treeSelectorRequiredAllowedNode: treeSelectorDataAllItems,
              treeSelectorRequiredNotAllowedNode: treeSelectorDataAllItems,
              treeSelectorNotRequiredAllowedNode: treeSelectorDataAllItems,
              treeSelectorNotRequiredNotAllowedNode: treeSelectorDataAllItems,
            },
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400);
      })
      .then(res => {
        const { success, message } = res.body;
        should(success).be.equal(false);

        const [cause, fields] = message.split(':');
        should(cause).be.equal('Found non-existing references in fields');

        const fieldNames = fields.trim().split(', ');
        should(fieldNames).containDeep([
          'treeSelectorRequiredAllowedNode',
          'treeSelectorRequiredNotAllowedNode',
          'treeSelectorNotRequiredAllowedNode',
          'treeSelectorNotRequiredNotAllowedNode',
        ]);
      });
  });
});
