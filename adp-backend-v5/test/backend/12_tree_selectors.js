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
      this.db.collection('model11treeselector').remove({}),
      this.db.collection('users').remove({}),
      this.db.collection('mongoMigrateChangeLog').remove({}),
    ]).then(() =>
      Promise.all([
        this.db.collection('treeCollection').insertMany([parent1, ...parent1children, parent2]),
      ])
    );
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  describe('returns correct results', () => {
    it('when requesting roots', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/treeselectors/Model11treeselectorTreeselector/treeCollection')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          const { data } = res.body;
          data.length.should.equal(2);
          should(data[0]).be.deepEqual({
            id: parent1._id.toString(),
            label: parent1.name,
            isLeaf: !parent1.hasChildren,
          });

          should(data[1]).be.deepEqual({
            id: parent2._id.toString(),
            label: parent2.name,
            isLeaf: !parent2.hasChildren,
          });
        });
    });

    it('when requesting children (for default first page)', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get(
              `/treeselectors/Model11treeselectorTreeselector/treeCollection?foreignKeyVal=${parent1._id.toString()}`
            )
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          const { data } = res.body;

          // limitReturnedRecords = 2
          data.length.should.equal(2);
          data.forEach((foundChild, i) => {
            const parentChild = parent1children[i];
            should(foundChild).be.deepEqual({
              id: parentChild._id.toString(),
              label: parentChild.name,
              isLeaf: !parentChild.hasChildren,
            });
          });
        });
    });

    it('when requesting children with pagination (page=2)', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get(
              `/treeselectors/Model11treeselectorTreeselector/treeCollection?foreignKeyVal=${parent1._id.toString()}&page=2`
            )
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          const { data } = res.body;

          data.length.should.equal(1);
          const thirdParentChild = parent1children[2];
          should(data[0]).be.deepEqual({
            id: thirdParentChild._id.toString(),
            label: thirdParentChild.name,
            isLeaf: !thirdParentChild.hasChildren,
          });
        });
    });
  });

  it('should submit doc with TreeSelector field (post)', function() {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: false,
    });

    const treeSelectorData = [
      { ...parent1Lookup, _id: parent1Lookup._id.toString() },
      {
        table: 'treeCollection',
        label: parent1children[0].name,
        _id: parent1children[0]._id.toString(),
      },
    ];

    return this.appLib
      .setup()
      .then(() =>
        request(this.appLib.app)
          .post('/model11treeselector')
          .send({
            data: {
              treeSelector: treeSelectorData,
            },
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
      )
      .then(res => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        should(res.body.id).not.be.undefined();

        return this.db.collection('model11treeselector').findOne({ _id: ObjectID(res.body.id) });
      })
      .then(doc => {
        // check transformation of lookups field '_id' inside TreeSelector
        const { treeSelector } = doc;
        should(treeSelector.length).be.equal(2);

        const expectedStoredData = treeSelectorData.map(d => ({ ...d, _id: ObjectID(d._id) }));
        should(treeSelector).be.deepEqual(expectedStoredData);
      });
  });
});
