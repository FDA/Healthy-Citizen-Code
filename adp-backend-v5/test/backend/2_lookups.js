// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
// TODO: add tests for multiple tables
// TODO: add tests for default foreignKey

const request = require('supertest');
const should = require('should');
const { ObjectID } = require('mongodb');

const reqlib = require('app-root-path').require;

const {
  auth: { admin, user, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
} = reqlib('test/backend/test-util');

describe('V5 Backend Lookups', () => {
  const sampleDataModel4 = [
    // model 2 return is capped to 3 elements
    { _id: new ObjectID('587179f6ef4807703afd0df0'), name: 'name1', description: 'description1' },
    { _id: new ObjectID('587179f6ef4807703afd0df1'), name: 'name2', description: 'description2' },
    {
      _id: new ObjectID('587179f6ef4807703afd0df2'),
      name: 'name3',
      description: 'description3_def',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df3'),
      name: 'name4',
      description: 'description4_abc',
    },
    {
      _id: new ObjectID('587179f6ef4807703afd0df4'),
      name: 'name5_abc',
      description: 'description5',
    },
  ];

  const sampleDataModel3 = {
    _id: new ObjectID('487179f6ef4807703afd0df0'),
    model4Id: {
      table: 'model4s',
      label: sampleDataModel4[0].name,
      _id: sampleDataModel4[0]._id,
    },
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
      this.db.collection('model3s').remove({}),
      this.db.collection('model4s').remove({}),
      this.db.collection('users').remove({}),
      this.db.collection('mongoMigrateChangeLog').remove({}),
    ]).then(() =>
      Promise.all([
        this.db.collection('model4s').insert(sampleDataModel4),
        this.db.collection('model3s').insert(sampleDataModel3),
        this.db.collection('users').insert(user),
        this.db.collection('users').insert(admin),
      ])
    );
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  describe('GET /routes', () => {
    it('contains endpoint', function() {
      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/routes')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.brief.should.containEql('GET /lookups/model4Id/model4s AUTH');
        });
    });
  });

  describe('should not insert lookups referenced to non-existing records ', () => {
    it('on POST', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .post('/model3s')
            .send({
              data: {
                model4Id: {
                  table: 'model4s',
                  label: 'some label',
                  _id: new ObjectID(),
                },
                model4IdSortBy: {
                  table: 'nonexistingCollection',
                  label: 'some label',
                  _id: new ObjectID(),
                },
              },
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          const { success, message } = res.body;
          should(success).be.equal(false);

          const [cause, fields] = message.split(':');
          should(cause).be.equal('Found non-existing references in fields');

          const fieldNames = fields.trim().split(', ');
          should(fieldNames).containDeep(['model4Id', 'model4IdSortBy']);
        });
    });

    it('on PUT', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .put(`/model3s/${sampleDataModel3._id.toString()}`)
            .send({
              data: {
                model4Id: {
                  table: 'model4s',
                  label: sampleDataModel4[0].name,
                  _id: new ObjectID(),
                },
                model4IdSortBy: {
                  table: 'nonexistingCollection',
                  label: 'some label',
                  _id: new ObjectID(),
                },
              },
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          const { success, message } = res.body;
          should(success).be.equal(false);

          const [cause, fields] = message.split(':');
          should(cause).be.equal('Found non-existing references in fields');

          const fieldNames = fields.trim().split(', ');
          should(fieldNames).containDeep(['model4Id', 'model4IdSortBy']);
        });
    });
  });

  describe('returns correct results', () => {
    it('for specific search', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/lookups/model4Id/model4s?q=abc')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(2);
          res.body.data[0].label.should.equal('name4');
          res.body.data[1].label.should.equal('name5_abc');
        });
    });
    it('with pagination, page 1', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/lookups/model4Id/model4s?q=name&page=1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          res.body.data[0].label.should.equal('name1');
          res.body.data[1].label.should.equal('name2');
          res.body.data[2].label.should.equal('name3');
        });
    });
    it('with pagination, page 2', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/lookups/model4Id/model4s?q=name&page=2')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(2);
          res.body.data[0].label.should.equal('name4');
          res.body.data[1].label.should.equal('name5_abc');
        });
    });
    it('with pagination and sortBy field, page 1', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/lookups/model4IdSortBy/model4s?q=name&page=1')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(3);
          res.body.data[0].label.should.equal('name5_abc');
          res.body.data[1].label.should.equal('name4');
          res.body.data[2].label.should.equal('name3');
        });
    });
    it('with pagination and sortBy field, page 2', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/lookups/model4IdSortBy/model4s?q=name&page=2')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(2);
          res.body.data[0].label.should.equal('name2');
          res.body.data[1].label.should.equal('name1');
        });
    });
  });
  describe('returns correct results for lookups with scopes and enabled permissions', () => {
    it('should return 401 by not authenticated request', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enableAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/lookups/Model3scopesModel4id/model4s?q=abc')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(401, JSON.stringify(res, null, 4));
          res.body.success.should.equal(false, res.body.message);
        });
    });

    it('should not return model to guest', function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enableAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(this.appLib.app)
            .get('/lookups/Model3scopesModel4id/model4s?q=abc')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(0);
        });
    });

    it('should return model to admin', function() {
      setAppAuthOptions(this.appLib, {
        enableAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() => loginWithUser(this.appLib, admin))
        .then(token =>
          request(this.appLib.app)
            .get('/lookups/Model3scopesModel4id/model4s?q=abc')
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.data.length.should.equal(2);
          res.body.data[0].label.should.equal('name4');
          res.body.data[1].label.should.equal('name5_abc');
        });
    });
  });
});
