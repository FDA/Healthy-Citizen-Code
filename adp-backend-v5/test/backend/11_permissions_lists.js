const request = require('supertest');
const _ = require('lodash');
require('should');

const {
  auth: { admin, user, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  checkRestSuccessfulResponse,
  checkRestErrorResponse,
} = require('../test-util');
const {
  buildGraphQlCreate,
  buildGraphQlUpdateOne,
  checkGraphQlSuccessfulResponse,
  checkGraphQlErrorResponse,
} = require('../graphql-util.js');

describe('V5 Backend List Permissions', function () {
  const modelName = 'model9list_permissions';

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
      this.db.createCollection(modelName),
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ]);
    await Promise.all([this.db.collection('users').insertOne(admin), this.db.collection('users').insertOne(user)]);
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  describe('lists permissions', function () {
    describe('check lists in app-model-code', function () {
      it('should allow admin to access all the lists', async function () {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        await this.appLib.setup();
        const token = await loginWithUser(appLib, admin);

        const res = await request(appLib.app)
          .get('/app-model')
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/);
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));

        const expectedList = {
          val1: 'val1',
          val2: 'val2',
          val3: 'val3',
          val4: 'val4',
        };
        const listModelFields = res.body.data.models[modelName].fields;

        const objectListWithObjectValueList = _.get(listModelFields, 'objectListWithObjectValueList.list');
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

      it('should allow user to access only lists with user scope', async function () {
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        await this.appLib.setup();
        const token = await loginWithUser(appLib, user);

        const res = await request(appLib.app)
          .get('/app-model')
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/);
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));

        const expectedAvailableList = {
          val1: 'val1',
          val2: 'val2',
          val3: 'val3',
          val4: 'val4',
        };
        const expectedListWithCustomScopes = {
          val1: 'val1',
          val2: 'val2',
        };

        const listModelFields = res.body.data.models[modelName].fields;

        const objectListWithObjectValueList = _.get(listModelFields, 'objectListWithObjectValueList.list');
        _.isEqual(objectListWithObjectValueList, expectedAvailableList).should.be.true();

        const objectListWithReferenceAndCustomScopes = _.get(
          listModelFields,
          'objectListWithReferenceAndCustomScopes.list'
        );
        _.isEqual(objectListWithReferenceAndCustomScopes, expectedListWithCustomScopes).should.be.true();

        const objectListWithReferenceAndNoCustomScopes = _.get(
          listModelFields,
          'objectListWithReferenceAndNoCustomScopes.list'
        );
        _.isEqual(objectListWithReferenceAndNoCustomScopes, expectedAvailableList).should.be.true();

        const objectValueList = _.get(listModelFields, 'objectValueList.list');
        _.isEqual(objectValueList, expectedAvailableList).should.be.true();
      });

      describe('check security for writing operations', function () {
        const getCreateItemTestFunc = function (settings) {
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

        describe('for admin', function () {
          beforeEach(async function () {
            const { appLib } = this;
            setAppAuthOptions(this.appLib, {
              requireAuthentication: true,
              enablePermissions: true,
            });
            await appLib.setup();
            this.token = await loginWithUser(appLib, admin);
          });

          describe('should allow admin to create item with any valid list values', function () {
            const record = {
              objectValueList: 'val1',
              objectListWithObjectValueList: 'val2',
              objectListWithReferenceAndNoCustomScopes: 'val3',
              objectListWithReferenceAndCustomScopes: 'val4',
            };
            const restSettings = {
              makeRequest: (r) => r.post(`/${modelName}`).send({ data: record }),
              checkResponse: checkRestSuccessfulResponse,
            };
            const graphqlSettings = {
              makeRequest: (r) => r.post('/graphql').send(buildGraphQlCreate(modelName, record)),
              checkResponse: checkGraphQlSuccessfulResponse,
            };

            it(
              'REST: should allow admin to create item with any valid list values',
              getCreateItemTestFunc(restSettings)
            );
            it(
              'GraphQL: should allow admin to create item with any valid list values',
              getCreateItemTestFunc(graphqlSettings)
            );
          });

          describe('should not allow admin to create item with invalid list values', function () {
            const record = {
              objectValueList: 'invalid1',
              objectListWithObjectValueList: 'invalid2',
              objectListWithReferenceAndNoCustomScopes: 'invalid3',
              objectListWithReferenceAndCustomScopes: 'invalid4',
            };

            const restSettings = {
              makeRequest: (r) => r.post(`/${modelName}`).send({ data: record }),
              checkResponse: checkRestErrorResponse,
            };
            const graphqlSettings = {
              makeRequest: (r) => r.post('/graphql').send(buildGraphQlCreate(modelName, record)),
              checkResponse: checkGraphQlErrorResponse,
            };

            it(
              'REST: should not allow admin to create item with invalid list values',
              getCreateItemTestFunc(restSettings)
            );
            it(
              'GraphQL: should not allow admin to create item with invalid list values',
              getCreateItemTestFunc(graphqlSettings)
            );
          });
        });

        describe('for user', function () {
          beforeEach(async function () {
            const { appLib } = this;
            setAppAuthOptions(this.appLib, {
              requireAuthentication: true,
              enablePermissions: true,
            });
            await appLib.setup();
            const token = await loginWithUser(appLib, user);
            this.token = token;
          });

          it('should allow user to create and update item with list values available for that user', function () {
            const record = {
              objectValueList: '',
              objectListWithObjectValueList: '',
              objectListWithReferenceAndNoCustomScopes: '',
              objectListWithReferenceAndCustomScopes: 'val1',
            };
            const restSettings = {
              createRequest: (r) => r.post(`/${modelName}`).send({ data: record }),
              getCreatedDocId: (res) => {
                res.statusCode.should.equal(200);
                res.body.success.should.equal(true);
                const docId = res.body.id;
                docId.should.not.be.empty();
                return docId;
              },
              updateRequest: (r, docId) => r.put(`/${modelName}/${docId}`).send({ data: record }),
              checkUpdate: checkRestSuccessfulResponse,
            };
            const graphqlSettings = {
              createRequest: (r) => r.post('/graphql').send(buildGraphQlCreate(modelName, record)),
              getCreatedDocId: (res) => {
                res.statusCode.should.equal(200);
                const docId = res.body.data[`${modelName}Create`]._id;
                docId.should.not.be.empty();
                return docId;
              },
              updateRequest: (r, docId) => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
              checkUpdate: checkGraphQlSuccessfulResponse,
            };

            const getCreateAndUpdateItemTestFunc = function (settings) {
              return f;

              async function f() {
                const { createRequest, getCreatedDocId, updateRequest, checkUpdate } = settings;
                const createReq = createRequest(request(this.appLib.app));
                if (this.token) {
                  createReq.set('Authorization', `JWT ${this.token}`);
                }

                const res = await createReq.set('Accept', 'application/json').expect('Content-Type', /json/);
                const createdDocId = getCreatedDocId(res);
                const updateReq = updateRequest(request(this.appLib.app), createdDocId);
                if (this.token) {
                  updateReq.set('Authorization', `JWT ${this.token}`);
                }

                const res2 = await updateReq.set('Accept', 'application/json').expect('Content-Type', /json/);
                checkUpdate(res2);
              }
            };

            it(
              'REST: should allow user to create and update item with list values available for that user',
              getCreateAndUpdateItemTestFunc(restSettings)
            );
            it(
              'GraphQL: should allow user to create and update item with list values available for that user',
              getCreateAndUpdateItemTestFunc(graphqlSettings)
            );
          });

          it('should not allow user to create item with list values not available for that user', function () {
            const record = {
              objectValueList: 'val1',
              objectListWithObjectValueList: 'val2',
              objectListWithReferenceAndNoCustomScopes: 'val3',
              objectListWithReferenceAndCustomScopes: 'val4',
            };
            const restSettings = {
              makeRequest: (r) => r.post(`/${modelName}`).send({ data: record }),
              checkResponse: checkRestSuccessfulResponse,
            };
            const graphqlSettings = {
              makeRequest: (r) => r.post('/graphql').send(buildGraphQlCreate(modelName, record)),
              checkResponse: checkGraphQlSuccessfulResponse,
            };

            it(
              'REST: should not allow user to create item with list values not available for that user',
              getCreateItemTestFunc(restSettings)
            );
            it(
              'GraphQL: should not allow user to create item with list values not available for that user',
              getCreateItemTestFunc(graphqlSettings)
            );
          });
        });
      });
    });
  });
});
