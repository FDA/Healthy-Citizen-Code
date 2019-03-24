// TODO: requiresAuthentication is now replaced with permissions: ['authenticated'], update tests
const request = require('supertest');
const should = require('should');
const { ObjectID } = require('mongodb');
const reqlib = require('app-root-path').require;

const {
  auth: { admin, user, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  checkItemSoftDeleted,
} = reqlib('test/backend/test-util');

describe('V5 Backend Scheme Permissions', () => {
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

  afterEach(function() {
    return this.appLib.shutdown();
  });

  const MODEL8_SAMPLE = {
    _id: ObjectID('587179f6ef4807704afd0daa'),
    number1: 1,
    number2: 2,
  };

  beforeEach(function() {
    return Promise.all([
      this.db.collection('users').remove({}),
      this.db.collection('mongoMigrateChangeLog').remove({}),
      this.db.collection('model8guests').remove({}),
      this.db.collection('model8object_scope').remove({}),
      this.db.collection('model8string_scope').remove({}),
      this.db.collection('model8complex_scope').remove({}),
      this.db.collection('model8any_of_scope').remove({}),
      this.db.collection('model8all_of_scope').remove({}),
      this.db.collection('model8preparations').remove({}),
      this.db.collection('model8multiple_scopes').remove({}),
    ]).then(() =>
      Promise.all([
        this.db.collection('users').insert(admin),
        this.db.collection('users').insert(user),
        this.db.collection('model8guests').insert(MODEL8_SAMPLE),
        this.db.collection('model8object_scope').insert(MODEL8_SAMPLE),
        this.db.collection('model8string_scope').insert(MODEL8_SAMPLE),
        this.db.collection('model8complex_scope').insert(MODEL8_SAMPLE),
        this.db.collection('model8any_of_scope').insert(MODEL8_SAMPLE),
        this.db.collection('model8all_of_scope').insert(MODEL8_SAMPLE),
        this.db.collection('model8preparations').insert(MODEL8_SAMPLE),
        this.db.collection('model8multiple_scopes').insert(MODEL8_SAMPLE),
      ])
    );
  });

  describe('scheme permissions', () => {
    describe('GET', () => {
      it('should not allow authorized user to access the protected document by guest scope', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, user))
          .then(token =>
            request(appLib.app)
              .get(`/model8guests/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
            res.body.success.should.equal(false, res.body.message);
          });
      });

      it('should allow guest user to access the protected document by guest scope', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: false,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() =>
            request(appLib.app)
              .get(`/model8guests/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              // .set("Authorization", `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.data.number1.should.equal(1);
            res.body.data.number2.should.equal(2);
          });
      });

      it('should allow admin to access the protected document by scope with impracticable object condition', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, admin))
          .then(token =>
            request(appLib.app)
              .get(`/model8object_scope/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.data.number1.should.equal(1);
            res.body.data.number2.should.equal(2);
          });
      });

      it('should allow admin to access the protected document by scope with impracticable string condition', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, admin))
          .then(token =>
            request(appLib.app)
              .get(`/model8string_scope/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.data.number1.should.equal(1);
            res.body.data.number2.should.equal(2);
          });
      });

      it('should allow user to access the protected document by scope with condition requiring preparation', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, user))
          .then(token =>
            request(appLib.app)
              .get(`/model8preparations/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.data.number1.should.equal(1);
            res.body.data.number2.should.equal(2);
          });
      });

      it('should allow user to access the protected document by scope with condition requiring GUEST OR USER', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, user))
          .then(token =>
            request(appLib.app)
              .get(`/model8any_of_scope/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.data.number1.should.equal(1);
            res.body.data.number2.should.equal(2);
          });
      });

      it('should not allow user to access the protected document by scope with condition requiring "Guest AND User"', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, user))
          .then(token =>
            request(appLib.app)
              .get(`/model8all_of_scope/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
            res.body.success.should.equal(false, res.body.message);
          });
      });

      it('should not allow user to access the protected document by scope with condition requiring "(Guest OR User) AND FromCar"', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, user))
          .then(token =>
            request(appLib.app)
              .get(`/model8complex_scope/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
            res.body.success.should.equal(false, res.body.message);
          });
      });

      it('should not allow user to access the protected document by impracticable action', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, user))
          .then(token =>
            request(appLib.app)
              .get(`/model8impracticable_action/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
            res.body.success.should.equal(false, res.body.message);
          });
      });

      it('should allow guest to access the protected document with one available and one unavailable scopes', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: false,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() =>
            request(appLib.app)
              .get(`/model8multiple_scopes/${MODEL8_SAMPLE._id}`)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            res.body.data.number1.should.equal(1);
            res.body.data.number2.should.equal(2);
          });
      });
    });
  });

  describe('POST', () => {
    it('should not allow authorized user to create document by guest scope', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() => loginWithUser(appLib, user))
        .then(token =>
          request(appLib.app)
            .post('/model8guests')
            .send({ data: {} })
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
          res.body.success.should.equal(false);
          res.body.message.should.equal(
            'Not enough permissions to create the item.',
            res.body.message
          );
        });
    });

    it('should allow guest user to create document by guest scope', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(appLib.app)
            .post('/model8guests')
            .send({ data: {} })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.id.should.not.be.undefined();
        });
    });

    it('should allow admin to create document by scope with impracticable condition', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() => loginWithUser(appLib, admin))
        .then(token =>
          request(appLib.app)
            .post('/model8object_scope')
            .send({ data: {} })
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
          res.body.id.should.not.be.undefined();
        });
    });
  });

  describe('PUT', () => {
    it('should not allow authorized user to update document by guest scope', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() => loginWithUser(appLib, user))
        .then(token =>
          request(appLib.app)
            .put(`/model8guests/${MODEL8_SAMPLE._id}`)
            .send({ data: {} })
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
          res.body.success.should.equal(false);
          res.body.message.should.equal(
            'Internal error: unable to update this item',
            res.body.message
          );
        });
    });

    it('should allow guest user to update document by guest scope', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(appLib.app)
            .put(`/model8guests/${MODEL8_SAMPLE._id}`)
            .send({ data: {} })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
        });
    });

    it('should allow admin to update document by scope with impracticable condition', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() => loginWithUser(appLib, admin))
        .then(token =>
          request(appLib.app)
            .put(`/model8guests/${MODEL8_SAMPLE._id}`)
            .send({ data: {} })
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);
        });
    });
  });

  describe('DELETE', () => {
    it('should not allow authorized user to delete document by guest scope', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() => loginWithUser(appLib, user))
        .then(token =>
          request(appLib.app)
            .del(`/model8guests/${MODEL8_SAMPLE._id}`)
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(400, JSON.stringify(res, null, 4));
          res.body.success.should.equal(false);
          res.body.message.should.equal(
            'Internal error: unable to delete this item',
            res.body.message
          );
        });
    });

    it('should allow guest user to delete document by guest scope', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() =>
          request(appLib.app)
            .del(`/model8guests/${MODEL8_SAMPLE._id}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);

          return checkItemSoftDeleted(this.appLib.db, 'model8guests', MODEL8_SAMPLE._id);
        })
        .then(deletedAt => {
          should(deletedAt).not.be.undefined();
        });
    });

    it('should allow admin to delete document by scope with impracticable condition', function() {
      const { appLib } = this;
      setAppAuthOptions(this.appLib, {
        requireAuthentication: true,
        enablePermissions: true,
      });

      return this.appLib
        .setup()
        .then(() => loginWithUser(appLib, admin))
        .then(token =>
          request(appLib.app)
            .del(`/model8guests/${MODEL8_SAMPLE._id}`)
            .set('Accept', 'application/json')
            .set('Authorization', `JWT ${token}`)
            .expect('Content-Type', /json/)
        )
        .then(res => {
          res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
          res.body.success.should.equal(true, res.body.message);

          return checkItemSoftDeleted(this.appLib.db, 'model8guests', MODEL8_SAMPLE._id);
        })
        .then(deletedAt => {
          should(deletedAt).not.be.undefined();
        });
    });
  });
});
