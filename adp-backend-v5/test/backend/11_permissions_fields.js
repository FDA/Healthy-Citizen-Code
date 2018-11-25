// TODO: requiresAuthentication is now replaced with permissions: ['authenticated'], update tests
const request = require('supertest');
const _ = require('lodash');
const should = require('should');
const { ObjectID } = require('mongodb');
const reqlib = require('app-root-path').require;

const {
  auth: { admin, user, loginWithUser },
} = reqlib('test/backend/test-util');

describe('V5 Backend Field Permissions', () => {
  before(function() {
    require('dotenv').load({ path: './test/backend/.env.test' });
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup();
  });

  after(function() {
    return this.appLib.shutdown();
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
  };

  beforeEach(function() {
    return Promise.all([
      this.appLib.db.collection('users').remove({}),
      this.appLib.db.collection('model10field_permissions').remove({}),
    ]).then(() =>
      Promise.all([
        this.appLib.db.collection('users').insert(admin),
        this.appLib.db.collection('users').insert(user),
        this.appLib.db.collection('model10field_permissions').insert(MODEL10_SAMPLE),
      ])
    );
  });

  describe('fields permissions', () => {
    describe('read permissions', () => {
      it('check different fields on read permission as user', function() {
        _.merge(this.appLib.appModel.interface.app.auth, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        const { appLib } = this;
        appLib.resetRoutes();
        return loginWithUser(appLib, user)
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
          });
      });

      it('check different fields on read permission as admin', function() {
        _.merge(this.appLib.appModel.interface.app.auth, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        const { appLib } = this;
        appLib.resetRoutes();
        return loginWithUser(appLib, admin)
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
          });
      });

      it('check different fields on read permission as guest', function() {
        _.merge(this.appLib.appModel.interface.app.auth, {
          requireAuthentication: false,
          enablePermissions: true,
        });
        const { appLib } = this;
        appLib.resetRoutes();
        return request(appLib.app)
          .get('/model10field_permissions/587179f6ef4807704afd0daf')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
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
      it('check write permission on create document', function() {
        _.merge(this.appLib.appModel.interface.app.auth, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        const { appLib } = this;
        appLib.resetRoutes();
        let token;
        return loginWithUser(appLib, user)
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
            this.appLib.db
              .collection('model10field_permissions')
              .findOne({ _id: ObjectID(res.body.id) })
          )
          .then(data => {
            data.wField1.should.equal('wField1');
            data.wField2.should.equal('wField2');
            should.not.exist(data.wField3);
            data.rwField1.should.equal('rwField1');
            should.not.exist(data.rwField2);
            data.object1.string1.should.equal('string1');
            should.not.exist(data.object1.string2);
            should.not.exist(data.object2);
          });
      });

      it('check write permission on document update', function() {
        _.merge(this.appLib.appModel.interface.app.auth, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        const { appLib } = this;
        appLib.resetRoutes();
        return loginWithUser(appLib, user)
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
            return this.appLib.db
              .collection('model10field_permissions')
              .findOne({ _id: ObjectID('587179f6ef4807704afd0daf') });
          })
          .then(data => {
            data.wField1.should.equal('wField1Updated');
            data.wField2.should.equal('wField2Updated');
            data.wField3.should.equal('wField3');
            data.rwField1.should.equal('rwField1Updated');
            data.rwField2.should.equal('rwField2');
            data.object1.string1.should.equal('string1Updated');
            data.object1.string2.should.equal('string2');
            data.object2.string1.should.equal('string1');
            data.object2.string2.should.equal('string2');
          });
      });
    });
  });
});
