// TODO: requiresAuthentication is now replaced with permissions: ['authenticated'], update tests
const request = require('supertest');
const _ = require('lodash');
require('should');

const reqlib = require('app-root-path').require;

const {
  auth: { admin, user, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
} = reqlib('test/backend/test-util');

describe('V5 Backend List Permissions', () => {
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
      this.db.collection('users').remove({}),
      this.db.collection('mongoMigrateChangeLog').remove({}),
    ]).then(() =>
      Promise.all([
        this.db.collection('users').insert(admin),
        this.db.collection('users').insert(user),
      ])
    );
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  describe('lists permissions', () => {
    describe('check lists in app-model-code', () => {
      it('should allow admin to access all the lists', function() {
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
              .get('/app-model')
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));

            const expectedList = {
              val1: 'val1',
              val2: 'val2',
              val3: 'val3',
              val4: 'val4',
            };
            const listModelFields = res.body.data.models.model9list_permissions.fields;

            const objectListWithObjectValueList = _.get(
              listModelFields,
              'objectListWithObjectValueList.list'
            );
            _.isEqual(objectListWithObjectValueList, expectedList).should.be.true();

            const objectListWithReferenceAndCustomScopes = _.get(
              listModelFields,
              'objectListWithReferenceAndCustomScopes.list'
            );
            _.isEqual(objectListWithReferenceAndCustomScopes, expectedList).should.be.true();

            const objectListWithReferenceAndNoCustomScopes = _.get(
              listModelFields,
              'objectListWithReferenceAndNoCustomScopes.list'
            );
            _.isEqual(objectListWithReferenceAndNoCustomScopes, expectedList).should.be.true();

            const objectValueList = _.get(listModelFields, 'objectValueList.list');
            _.isEqual(objectValueList, expectedList).should.be.true();
          });
      });

      it('should allow user to access only lists with user scope', function() {
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
              .get('/app-model')
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));

            const expectedRestrictedList = {};
            const expectedListWithCustomScopes = {
              val1: 'val1',
              val2: 'val2',
            };

            const listModelFields = res.body.data.models.model9list_permissions.fields;

            const objectListWithObjectValueList = _.get(
              listModelFields,
              'objectListWithObjectValueList.list'
            );
            _.isEqual(objectListWithObjectValueList, expectedRestrictedList).should.be.true();

            const objectListWithReferenceAndCustomScopes = _.get(
              listModelFields,
              'objectListWithReferenceAndCustomScopes.list'
            );
            _.isEqual(
              objectListWithReferenceAndCustomScopes,
              expectedListWithCustomScopes
            ).should.be.true();

            const objectListWithReferenceAndNoCustomScopes = _.get(
              listModelFields,
              'objectListWithReferenceAndNoCustomScopes.list'
            );
            _.isEqual(
              objectListWithReferenceAndNoCustomScopes,
              expectedRestrictedList
            ).should.be.true();

            const objectValueList = _.get(listModelFields, 'objectValueList.list');
            _.isEqual(objectValueList, expectedRestrictedList).should.be.true();
          });
      });
    });

    describe('check security for writing operations', () => {
      it('should allow admin to create item with any valid list values', function() {
        const model9Sample = {
          objectValueList: 'val1',
          objectListWithObjectValueList: 'val2',
          objectListWithReferenceAndNoCustomScopes: 'val3',
          objectListWithReferenceAndCustomScopes: 'val4',
        };

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
              .post('/model9list_permissions')
              .send({ data: model9Sample })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 2));
            res.body.success.should.equal(true);
            res.body.id.should.not.be.empty();
          });
      });

      it('should not allow admin to create item with invalid list values', function() {
        const model9Sample = {
          objectValueList: 'invalid1',
          objectListWithObjectValueList: 'invalid2',
          objectListWithReferenceAndNoCustomScopes: 'invalid3',
          objectListWithReferenceAndCustomScopes: 'invalid4',
        };
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
              .post('/model9list_permissions')
              .send({ data: model9Sample })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(400, JSON.stringify(res, null, 2));
            res.body.success.should.equal(false);
          });
      });

      it('should allow user to create and update item with list values available for that user', function() {
        const model9Sample = {
          objectValueList: '',
          objectListWithObjectValueList: '',
          objectListWithReferenceAndNoCustomScopes: '',
          objectListWithReferenceAndCustomScopes: 'val1',
        };
        let savedToken;
        let savedId;

        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        return this.appLib
          .setup()
          .then(() => loginWithUser(appLib, user))
          .then(token => {
            savedToken = token;
            return request(appLib.app)
              .post('/model9list_permissions')
              .send({ data: model9Sample })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${savedToken}`)
              .expect('Content-Type', /json/);
          })
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 2));
            res.body.success.should.equal(true);
            savedId = res.body.id;
            savedId.should.not.be.empty();
            return request(appLib.app)
              .put(`/model9list_permissions/${savedId}`)
              .send({ data: model9Sample })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${savedToken}`)
              .expect('Content-Type', /json/);
          })
          .then(res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 2));
            res.body.success.should.equal(true);
          });
      });

      it('should not allow user to create item with list values not available for that user', function() {
        const model9Sample = {
          objectValueList: 'val1',
          objectListWithObjectValueList: 'val2',
          objectListWithReferenceAndNoCustomScopes: 'val3',
          objectListWithReferenceAndCustomScopes: 'val4',
        };
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
              .post('/model9list_permissions')
              .send({ data: model9Sample })
              .set('Accept', 'application/json')
              .set('Authorization', `JWT ${token}`)
              .expect('Content-Type', /json/)
          )
          .then(res => {
            res.statusCode.should.equal(400, JSON.stringify(res, null, 2));
            res.body.success.should.equal(false);
          });
      });
    });
  });
});
