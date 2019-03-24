// TODO: requiresAuthentication is now replaced with permissions: ['authenticated'], update tests
const request = require('supertest');
const _ = require('lodash');
const should = require('should');
const { ObjectID } = require('mongodb');
const reqlib = require('app-root-path').require;

const {
  auth: { admin, user, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
} = reqlib('test/backend/test-util');

describe('V5 Backend Field Permissions', () => {
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

  const MODEL10_SAMPLE = {
    _id: ObjectID('587179f6ef4807704afd0daf'),
    rField1: 'rField1',
    rField2: 'rField2',
    rField3: 'rField3',
    wField1: 'wField1',
    wField2: 'wField2',
    wField3: 'wField3',
    rwField1: 'rwField1',
    rwField2: 'rwField2',
    object1: {
      string1: 'string1',
      string2: 'string2',
    },
    object2: {
      string1: 'string1',
      string2: 'string2',
    },
    array1: [
      {
        _id: new ObjectID(),
        string1: 'string11',
        string2: 'string12',
      },
      {
        _id: new ObjectID(),
        string1: 'string21',
        string2: 'string22',
      },
    ],
    array2: [
      {
        _id: new ObjectID(),
        string1: 'string11',
        string2: 'string12',
      },
      {
        _id: new ObjectID(),
        string1: 'string21',
        string2: 'string22',
      },
    ],
  };

  beforeEach(function() {
    return Promise.all([
      this.db.collection('users').remove({}),
      this.db.collection('mongoMigrateChangeLog').remove({}),
      this.db.collection('model10field_permissions').remove({}),
    ]).then(() =>
      Promise.all([
        this.db.collection('users').insert(admin),
        this.db.collection('users').insert(user),
        this.db.collection('model10field_permissions').insert(MODEL10_SAMPLE),
      ])
    );
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  describe('fields permissions', () => {
    describe('read permissions', () => {
      it('check different fields on read permission as user', function() {
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
              .get('/model10field_permissions/587179f6ef4807704afd0daf')
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            const { data } = res.body;
            data.rField1.should.equal('rField1');
            data.rField2.should.equal('rField2');
            should.not.exist(data.rField3);
            data.rwField1.should.equal('rwField1');
            should.not.exist(data.rwField2);
            data.object1.string1.should.equal('string1');
            should.not.exist(data.object1.string2);
            should.not.exist(data.object2);

            should(data.array1[0]._id).not.be.empty();
            should(data.array1[0].string1).be.equal('string11');
            should(data.array1[0].string2).be.undefined();
            should(data.array1[1]._id).not.be.empty();
            should(data.array1[1].string1).be.equal('string21');
            should(data.array1[1].string2).be.undefined();

            should(data.array2[0]._id).not.be.empty();
            should(data.array2[0].string1).be.equal('string11');
            should(data.array2[0].string2).be.undefined();
            should(data.array2[1]._id).not.be.empty();
            should(data.array2[1].string1).be.equal('string21');
            should(data.array2[1].string2).be.undefined();
          });
      });

      it('check different fields on read permission as admin', function() {
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
              .get('/model10field_permissions/587179f6ef4807704afd0daf')
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            const { data } = res.body;
            data.rField1.should.equal('rField1');
            data.rField2.should.equal('rField2');
            data.rField3.should.equal('rField3');
            data.rwField1.should.equal('rwField1');
            data.rwField2.should.equal('rwField2');
            data.object1.string1.should.equal('string1');
            data.object1.string2.should.equal('string2');
            data.object2.string1.should.equal('string1');
            data.object2.string2.should.equal('string2');

            should(data.array1[0]._id).not.be.empty();
            should(data.array1[0].string1).be.equal('string11');
            should(data.array1[0].string2).be.equal('string12');
            should(data.array1[1]._id).not.be.empty();
            should(data.array1[1].string1).be.equal('string21');
            should(data.array1[1].string2).be.equal('string22');

            should(data.array2[0]._id).not.be.empty();
            should(data.array2[0].string1).be.equal('string11');
            should(data.array2[0].string2).be.equal('string12');
            should(data.array2[1]._id).not.be.empty();
            should(data.array2[1].string1).be.equal('string21');
            should(data.array2[1].string2).be.equal('string22');
          });
      });

      it('check different fields on read permission as guest', function() {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: false,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() =>
            request(appLib.app)
              .get('/model10field_permissions/587179f6ef4807704afd0daf')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            const { data } = res.body;
            data.rField1.should.equal('rField1');
            should.not.exist(data.rField2);
            should.not.exist(data.rField3);
            should.not.exist(data.rwField1);
            should.not.exist(data.rwField2);
            should.not.exist(data.object1);
            should.not.exist(data.object2);
          });
      });
    });

    describe('write permissions', () => {
      it('create document', function() {
        const { appLib } = this;
        let token;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, user))
          .then(userToken => {
            token = userToken;
            return request(appLib.app)
              .post('/model10field_permissions')
              .send({ data: _.omit(MODEL10_SAMPLE, '_id') })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/);
          })
          .then(res =>
            this.db.collection('model10field_permissions').findOne({ _id: ObjectID(res.body.id) })
          )
          .then(data => {
            // db check
            data.wField1.should.equal('wField1');
            data.wField2.should.equal('wField2');
            should.not.exist(data.wField3);
            data.rwField1.should.equal('rwField1');
            should.not.exist(data.rwField2);
            should(data.object1).be.deepEqual({ string1: 'string1' });
            should.not.exist(data.object2);
            // TODO: rewrite with something like jest 'objectContaining' or use jest for tests
            should(data.array1[0].string2).be.equal('string12');
            should(data.array1[0]._id).not.be.empty();
            should(data.array1[1].string2).be.equal('string22');
            should(data.array1[1]._id).not.be.empty();
            should(data.array2).be.deepEqual([]);
          });
      });

      it('update document (fields without arrays)', function() {
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
              .put('/model10field_permissions/587179f6ef4807704afd0daf')
              .send({
                data: {
                  rField1: 'rField1Updated',
                  rField2: 'rField2Updated',
                  rField3: 'rField3Updated',
                  wField1: 'wField1Updated',
                  wField2: 'wField2Updated',
                  wField3: 'wField3Updated',
                  rwField1: 'rwField1Updated',
                  rwField2: 'rwField2Updated',
                  object1: {
                    string1: 'string1Updated',
                    string2: 'string2Updated',
                  },
                  object2: {
                    string1: 'string1Updated',
                    string2: 'string2Updated',
                  },
                },
              })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            return this.db
              .collection('model10field_permissions')
              .findOne({ _id: ObjectID('587179f6ef4807704afd0daf') });
          })
          .then(data => {
            should(data.wField1).be.equal('wField1Updated');
            should(data.wField2).be.equal('wField2Updated');
            should(data.wField3).be.equal('wField3');
            should(data.rwField1).be.equal('rwField1Updated');
            should(data.rwField2).be.equal('rwField2');
            should(data.object1).be.deepEqual({
              string1: 'string1Updated',
              string2: 'string2',
            });
            should(data.object2).be.deepEqual({
              string1: 'string1',
              string2: 'string2',
            });
          });
      });

      // frontend should always send _id to merge items in array properly
      // otherwise elems
      it('update document (array permissions without merging by _id)', function() {
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
              .put('/model10field_permissions/587179f6ef4807704afd0daf')
              .send({
                data: {
                  array1: [
                    {
                      string1: 'string11Updated',
                      string2: 'string12Updated',
                    },
                    {
                      string1: 'string21Updated',
                      string2: 'string22Updated',
                    },
                  ],
                  array2: [
                    {
                      string1: 'string11Updated',
                      string2: 'string12Updated',
                    },
                    {
                      string1: 'string21Updated',
                      string2: 'string22Updated',
                    },
                  ],
                },
              })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            return this.db
              .collection('model10field_permissions')
              .findOne({ _id: ObjectID('587179f6ef4807704afd0daf') });
          })
          .then(data => {
            // should not write second elem at all
            should(data.array1[0]._id).not.be.empty();
            should(data.array1[0].string1).be.undefined();
            should(data.array1[0].string2).be.equal('string12Updated');
            should(data.array1[1]._id).not.be.empty();
            should(data.array1[1].string1).be.undefined();
            should(data.array1[1].string2).be.equal('string22Updated');

            // should not write whole user array, keeps old value
            should(data.array2[0]._id).not.be.empty();
            should(data.array2[0].string1).be.equal('string11');
            should(data.array2[0].string2).be.equal('string12');
            should(data.array2[1]._id).not.be.empty();
            should(data.array2[1].string1).be.equal('string21');
            should(data.array2[1].string2).be.equal('string22');
          });
      });

      it('update document (array permissions with merging by _id)', function() {
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
              .put('/model10field_permissions/587179f6ef4807704afd0daf')
              .send({
                data: {
                  array1: [
                    {
                      string1: 'newString11',
                      string2: 'newString12',
                    },
                    {
                      _id: new ObjectID(),
                      string1: 'newString21',
                      string2: 'newString22',
                    },
                    {
                      _id: MODEL10_SAMPLE.array1[1]._id,
                      string1: 'string21Updated',
                      string2: 'string22Updated',
                    },
                  ],
                },
              })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            return this.db
              .collection('model10field_permissions')
              .findOne({ _id: ObjectID('587179f6ef4807704afd0daf') });
          })
          .then(data => {
            // should not write second elem at all
            should(data.array1[0]._id).not.be.empty();
            should(data.array1[0].string1).be.undefined();
            should(data.array1[0].string2).be.equal('newString12');
            should(data.array1[1]._id).not.be.empty();
            should(data.array1[1].string1).be.undefined();
            should(data.array1[1].string2).be.equal('newString22');
            should(data.array1[2]._id).not.be.empty();
            should(data.array1[2].string1).be.equal('string21'); // merged by _id from old item
            should(data.array1[2].string2).be.equal('string22Updated');
          });
      });

      it('update document with empty doc as user (should leave all the fields which cannot be written)', function() {
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
              .put('/model10field_permissions/587179f6ef4807704afd0daf')
              .send({ data: {} })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            return this.db
              .collection('model10field_permissions')
              .findOne({ _id: ObjectID('587179f6ef4807704afd0daf') });
          })
          .then(data => {
            // should return only generated fields and empty arrays(due to the way mongoose handles arrays)
            should(data._id).not.be.undefined();
            should(data.rField1).be.undefined();
            should(data.rField2).be.equal('rField2');
            should(data.rField3).be.equal('rField3');
            should(data.wField1).be.undefined();
            should(data.wField2).be.undefined();
            should(data.wField3).be.equal('wField3');
            should(data.rwField1).be.undefined();
            should(data.rwField2).be.equal('rwField2');
            should(data.object1).be.deepEqual({ string2: 'string2' });
            should(data.object2).be.deepEqual({ string1: 'string1', string2: 'string2' });
            should(data.array1).be.empty();

            should(data.array2[0]._id).not.be.undefined();
            should(data.array2[0].string1).be.equal('string11');
            should(data.array2[0].string2).be.equal('string12');
            should(data.array2[1]._id).not.be.undefined();
            should(data.array2[1].string1).be.equal('string21');
            should(data.array2[1].string2).be.equal('string22');
          });
      });

      it('update document with empty doc as admin (should merge as empty doc)', function() {
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
              .put('/model10field_permissions/587179f6ef4807704afd0daf')
              .send({ data: {} })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            return this.db
              .collection('model10field_permissions')
              .findOne({ _id: ObjectID('587179f6ef4807704afd0daf') });
          })
          .then(data => {
            // should return only generated fields and empty arrays(due to the way mongoose handles arrays)
            should(_.keys(data).length).equal(6);
            should(data.array1).be.empty();
            should(data.array2).be.empty();
            should(data._id).not.be.undefined();
            should(data.creator).not.be.undefined();
            should(data.updatedAt).not.be.undefined();
            should(data.createdAt).not.be.undefined();
          });
      });
    });
  });
});
