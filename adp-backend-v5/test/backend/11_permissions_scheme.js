const should = require('should');
const { ObjectID } = require('mongodb');

const {
  auth: { admin, user },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  setupAppAndGetToken,
  checkItemSoftDeleted,
  conditionForActualRecord,
  apiRequest,
} = require('../test-util');
const {
  buildGraphQlQuery,
  buildGraphQlCreate,
  buildGraphQlUpdateOne,
  buildGraphQlDeleteOne,
  checkGraphQlSuccessfulResponse,
  checkGraphQlErrorResponse,
  checkGraphQlNoDataResponse,
} = require('../graphql-util');

describe('V5 Backend Scheme Permissions', () => {
  before(async function () {
    this.appLib = prepareEnv();

    const db = await getMongoConnection(this.appLib.options.MONGODB_URI);
    this.db = db;
  });

  after(async function () {
    await this.db.dropDatabase();
    await this.db.close();
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  const MODEL8_SAMPLE = {
    _id: ObjectID('587179f6ef4807704afd0daa'),
    number1: 1,
    number2: 2,
    ...conditionForActualRecord,
  };

  beforeEach(async function () {
    await Promise.all([
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
      this.db.collection('model8guests').deleteMany({}),
      this.db.collection('model8object_scope').deleteMany({}),
      this.db.collection('model8string_scope').deleteMany({}),
      this.db.collection('model8complex_scope').deleteMany({}),
      this.db.collection('model8any_of_scope').deleteMany({}),
      this.db.collection('model8all_of_scope').deleteMany({}),
      this.db.collection('model8preparations').deleteMany({}),
      this.db.collection('model8multiple_scopes').deleteMany({}),
    ]);
    await Promise.all([
      this.db.collection('users').insertOne(admin),
      this.db.collection('users').insertOne(user),
      this.db.collection('model8guests').insertOne(MODEL8_SAMPLE),
      this.db.collection('model8object_scope').insertOne(MODEL8_SAMPLE),
      this.db.collection('model8string_scope').insertOne(MODEL8_SAMPLE),
      this.db.collection('model8complex_scope').insertOne(MODEL8_SAMPLE),
      this.db.collection('model8any_of_scope').insertOne(MODEL8_SAMPLE),
      this.db.collection('model8all_of_scope').insertOne(MODEL8_SAMPLE),
      this.db.collection('model8preparations').insertOne(MODEL8_SAMPLE),
      this.db.collection('model8multiple_scopes').insertOne(MODEL8_SAMPLE),
    ]);
  });

  describe('scheme permissions', () => {
    const docId = MODEL8_SAMPLE._id.toString();
    const getGraphqlData = (modelName) => (res) => res.body.data[modelName].items[0];

    describe('GET', () => {
      const getFunc = function (settings) {
        return f;

        async function f() {
          const { makeRequest, checkData, checkResponse, getData } = settings;
          const req = makeRequest(apiRequest(this.appLib));
          if (this.token) {
            req.set('Authorization', `JWT ${this.token}`);
          }

          const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
          checkResponse(res);
          checkData && checkData(getData(res));
        }
      };
      const checkData = (data) => {
        data.number1.should.equal(1);
        data.number2.should.equal(2);
      };

      const fieldsToGet = 'number1, number2';
      const readDocGraphqlRequest = (modelName) => (r) =>
        r.post('/graphql').send(buildGraphQlQuery(modelName, `{_id: '${docId}'}`, `items { ${fieldsToGet} }`));

      describe('should not allow authorized user to read the protected document by guest scope', () => {
        beforeEach(async function () {
          this.token = await setupAppAndGetToken(
            this.appLib,
            {
              requireAuthentication: true,
              enablePermissions: true,
            },
            user
          );
        });

        const modelName = 'model8guests';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlNoDataResponse,
        };

        it(
          'GraphQL: should not allow authorized user to read the protected document by guest scope',
          getFunc(graphqlSettings)
        );
      });

      describe('should allow guest user to read the protected document by guest scope', () => {
        beforeEach(async function () {
          setAppAuthOptions(this.appLib, {
            requireAuthentication: false,
            enablePermissions: true,
          });
          return this.appLib.setup();
        });

        const modelName = 'model8guests';

        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlSuccessfulResponse,
          getData: getGraphqlData(modelName),
          checkData,
        };

        it('GraphQL: should allow guest user to read the protected document by guest scope', getFunc(graphqlSettings));
      });

      describe('should allow admin to read the protected document by scope with impracticable object condition', () => {
        beforeEach(async function () {
          this.token = await setupAppAndGetToken(
            this.appLib,
            {
              requireAuthentication: true,
              enablePermissions: true,
            },
            admin
          );
        });

        const modelName = 'model8object_scope';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlSuccessfulResponse,
          getData: getGraphqlData(modelName),
          checkData,
        };

        it(
          'GraphQL: should allow admin to read the protected document by scope with impracticable object condition',
          getFunc(graphqlSettings)
        );
      });

      describe('should allow admin to read the protected document by scope with impracticable string condition', () => {
        beforeEach(async function () {
          this.token = await setupAppAndGetToken(
            this.appLib,
            {
              requireAuthentication: true,
              enablePermissions: true,
            },
            admin
          );
        });

        const modelName = 'model8string_scope';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlSuccessfulResponse,
          getData: getGraphqlData(modelName),
          checkData,
        };

        it(
          'GraphQL: should allow admin to read the protected document by scope with impracticable string condition',
          getFunc(graphqlSettings)
        );
      });

      describe('should allow user to read the protected document by scope with condition requiring preparation', () => {
        beforeEach(async function () {
          this.token = await setupAppAndGetToken(
            this.appLib,
            {
              requireAuthentication: true,
              enablePermissions: true,
            },
            admin
          );
        });

        const modelName = 'model8preparations';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlSuccessfulResponse,
          getData: getGraphqlData(modelName),
          checkData,
        };

        it(
          'GraphQL: should allow user to read the protected document by scope with condition requiring preparation',
          getFunc(graphqlSettings)
        );
      });

      describe('should allow user to read the protected document by scope with condition requiring "GUEST OR USER"', () => {
        beforeEach(async function () {
          this.token = await setupAppAndGetToken(
            this.appLib,
            {
              requireAuthentication: true,
              enablePermissions: true,
            },
            user
          );
        });

        const modelName = 'model8any_of_scope';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlSuccessfulResponse,
          getData: getGraphqlData(modelName),
          checkData,
        };

        it(
          'GraphQL: should allow user to read the protected document by scope with condition requiring "GUEST OR USER"',
          getFunc(graphqlSettings)
        );
      });

      describe('should not allow user to read the protected document by scope with condition requiring "Guest AND User"', () => {
        beforeEach(async function () {
          this.token = await setupAppAndGetToken(
            this.appLib,
            {
              requireAuthentication: true,
              enablePermissions: true,
            },
            user
          );
        });

        const modelName = 'model8all_of_scope';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlNoDataResponse,
        };

        it(
          'GraphQL: should not allow user to read the protected document by scope with condition requiring "Guest AND User"',
          getFunc(graphqlSettings)
        );
      });

      describe('should not allow user to read the protected document by scope with condition requiring "(Guest OR User) AND FromCar"', () => {
        beforeEach(async function () {
          this.token = await setupAppAndGetToken(
            this.appLib,
            {
              requireAuthentication: true,
              enablePermissions: true,
            },
            user
          );
        });

        const modelName = 'model8complex_scope';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlNoDataResponse,
        };

        it(
          'GraphQL: should not allow user to read the protected document by scope with condition requiring "(Guest OR User) AND FromCar"',
          getFunc(graphqlSettings)
        );
      });

      describe('should not allow user to read the protected document by impracticable action', () => {
        beforeEach(async function () {
          this.token = await setupAppAndGetToken(
            this.appLib,
            {
              requireAuthentication: true,
              enablePermissions: true,
            },
            user
          );
        });

        const modelName = 'model8impracticable_action';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlNoDataResponse,
        };

        it(
          'GraphQL: should not allow user to read the protected document by impracticable action',
          getFunc(graphqlSettings)
        );
      });

      describe('should allow guest to read the protected document with one available and one unavailable scopes', () => {
        beforeEach(async function () {
          setAppAuthOptions(this.appLib, {
            requireAuthentication: false,
            enablePermissions: true,
          });
          return this.appLib.setup();
        });

        const modelName = 'model8multiple_scopes';
        const graphqlSettings = {
          makeRequest: readDocGraphqlRequest(modelName),
          checkResponse: checkGraphQlSuccessfulResponse,
          getData: getGraphqlData(modelName),
          checkData,
        };

        it(
          'GraphQL: should allow guest to read the protected document with one available and one unavailable scopes',
          getFunc(graphqlSettings)
        );
      });
    });
  });

  describe('POST', () => {
    const postFunc = function (settings) {
      return f;

      async function f() {
        const { makeRequest, checkResponse } = settings;
        const req = makeRequest(apiRequest(this.appLib));
        if (this.token) {
          req.set('Authorization', `JWT ${this.token}`);
        }

        const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
        checkResponse(res);
      }
    };
    const record = {};

    const createDocGraphqlRequest = (modelName) => (r) =>
      r.post('/graphql').send(buildGraphQlCreate(modelName, record));

    describe('should not allow authorized user to create document by guest scope', () => {
      beforeEach(async function () {
        this.token = await setupAppAndGetToken(
          this.appLib,
          {
            requireAuthentication: true,
            enablePermissions: true,
          },
          user
        );
      });

      const modelName = 'model8guests';
      const graphqlSettings = {
        makeRequest: createDocGraphqlRequest(modelName),
        checkResponse: checkGraphQlErrorResponse,
      };

      it('GraphQL: should not allow authorized user to create document by guest scope', postFunc(graphqlSettings));
    });

    describe('should allow guest user to create document by guest scope', () => {
      beforeEach(async function () {
        setAppAuthOptions(this.appLib, {
          requireAuthentication: false,
          enablePermissions: true,
        });
        return this.appLib.setup();
      });

      const modelName = 'model8guests';
      const graphqlSettings = {
        makeRequest: createDocGraphqlRequest(modelName),
        checkResponse: (res) => {
          should(res.statusCode).equal(200);
          should(res.body.errors).be.undefined();
          should(res.body.data[`${modelName}Create`]._id).not.be.undefined();
        },
      };

      it('GraphQL: should allow guest user to create document by guest scope', postFunc(graphqlSettings));
    });

    describe('should allow admin to create document by scope with impracticable condition', () => {
      beforeEach(async function () {
        this.token = await setupAppAndGetToken(
          this.appLib,
          {
            requireAuthentication: true,
            enablePermissions: true,
          },
          admin
        );
      });

      const modelName = 'model8object_scope';
      const graphqlSettings = {
        makeRequest: createDocGraphqlRequest(modelName),
        checkResponse: (res) => {
          should(res.statusCode).equal(200);
          should(res.body.errors).be.undefined();
          should(res.body.data[`${modelName}Create`]._id).not.be.undefined();
        },
      };

      it(
        'GraphQL: should allow admin to create document by scope with impracticable condition',
        postFunc(graphqlSettings)
      );
    });
  });

  describe('PUT', () => {
    const putFunc = function (settings) {
      return f;

      async function f() {
        const { makeRequest, checkResponse } = settings;
        const req = makeRequest(apiRequest(this.appLib));
        if (this.token) {
          req.set('Authorization', `JWT ${this.token}`);
        }

        const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
        checkResponse(res);
      }
    };
    const record = {};
    const docId = MODEL8_SAMPLE._id.toString();
    const updateDocGraphqlRequest = (modelName) => (r) =>
      r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId));

    describe('should not allow authorized user to update document by guest scope', () => {
      beforeEach(async function () {
        this.token = await setupAppAndGetToken(
          this.appLib,
          {
            requireAuthentication: true,
            enablePermissions: true,
          },
          user
        );
      });

      const modelName = 'model8guests';

      const graphqlSettings = {
        makeRequest: updateDocGraphqlRequest(modelName),
        checkResponse: (res) => {
          checkGraphQlErrorResponse(res);
          const { message } = res.body.errors[0];
          should(message).equal('Unable to update requested element');
        },
      };

      it('GraphQL: should not allow authorized user to update document by guest scope', putFunc(graphqlSettings));
    });

    describe('should allow guest user to update document by guest scope', () => {
      beforeEach(async function () {
        setAppAuthOptions(this.appLib, {
          requireAuthentication: false,
          enablePermissions: true,
        });
        return this.appLib.setup();
      });

      const modelName = 'model8guests';
      const graphqlSettings = {
        makeRequest: updateDocGraphqlRequest(modelName),
        checkResponse: checkGraphQlSuccessfulResponse,
      };

      it('GraphQL: should allow guest user to update document by guest scope', putFunc(graphqlSettings));
    });

    describe('should allow admin to update document by scope with impracticable condition', () => {
      beforeEach(async function () {
        this.token = await setupAppAndGetToken(
          this.appLib,
          {
            requireAuthentication: true,
            enablePermissions: true,
          },
          admin
        );
      });

      const modelName = 'model8object_scope';
      const graphqlSettings = {
        makeRequest: updateDocGraphqlRequest(modelName),
        checkResponse: (res) => {
          should(res.statusCode).equal(200);
          should(res.body.errors).be.undefined();
          should(res.body.data[`${modelName}UpdateOne`]._id).not.be.undefined();
        },
      };

      it(
        'GraphQL: should allow admin to update document by scope with impracticable condition',
        putFunc(graphqlSettings)
      );
    });
  });

  describe('DELETE', () => {
    const deleteFunc = function (settings) {
      return f;

      async function f() {
        const { makeRequest, checkResponse } = settings;
        const req = makeRequest(apiRequest(this.appLib));
        if (this.token) {
          req.set('Authorization', `JWT ${this.token}`);
        }

        const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
        checkResponse(res);
      }
    };

    const deleteFuncCheckingSoftDelete = function (settings) {
      return f;

      async function f() {
        const { makeRequest, checkResponse, modelName, docId } = settings;
        const req = makeRequest(apiRequest(this.appLib));
        if (this.token) {
          req.set('Authorization', `JWT ${this.token}`);
        }

        const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
        checkResponse(res);
        const deletedAt = await checkItemSoftDeleted(this.appLib.db, modelName, docId);
        should(deletedAt).not.be.undefined();
      }
    };

    const docId = MODEL8_SAMPLE._id.toString();
    const deleteDocGraphqlRequest = (modelName) => (r) =>
      r.post('/graphql').send(buildGraphQlDeleteOne(modelName, docId));

    describe('should not allow authorized user to delete document by guest scope', () => {
      beforeEach(async function () {
        this.token = await setupAppAndGetToken(
          this.appLib,
          {
            requireAuthentication: true,
            enablePermissions: true,
          },
          user
        );
      });

      const modelName = 'model8guests';

      const graphqlSettings = {
        makeRequest: deleteDocGraphqlRequest(modelName),
        checkResponse: (res) => {
          checkGraphQlErrorResponse(res);
          const { message } = res.body.errors[0];
          should(message).equal('Unable to delete requested element');
        },
      };

      it('GraphQL: should not allow authorized user to delete document by guest scope', deleteFunc(graphqlSettings));
    });

    describe('should allow guest user to delete document by guest scope', () => {
      beforeEach(async function () {
        setAppAuthOptions(this.appLib, {
          requireAuthentication: false,
          enablePermissions: true,
        });
        return this.appLib.setup();
      });

      const modelName = 'model8guests';
      const graphqlSettings = {
        makeRequest: deleteDocGraphqlRequest(modelName),
        checkResponse: checkGraphQlSuccessfulResponse,
        docId,
        modelName,
      };

      it(
        'GraphQL: should allow guest user to delete document by guest scope',
        deleteFuncCheckingSoftDelete(graphqlSettings)
      );
    });

    describe('should allow admin to delete document by scope with impracticable condition', () => {
      beforeEach(async function () {
        this.token = await setupAppAndGetToken(
          this.appLib,
          {
            requireAuthentication: true,
            enablePermissions: true,
          },
          admin
        );
      });

      const modelName = 'model8object_scope';
      const graphqlSettings = {
        makeRequest: deleteDocGraphqlRequest(modelName),
        checkResponse: (res) => {
          should(res.statusCode).equal(200);
          should(res.body.errors).be.undefined();
        },
        docId,
        modelName,
      };

      it(
        'GraphQL: should allow admin to delete document by scope with impracticable condition',
        deleteFuncCheckingSoftDelete(graphqlSettings)
      );
    });
  });
});
