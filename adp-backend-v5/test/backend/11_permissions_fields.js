const _ = require('lodash');
const should = require('should');
const { ObjectID } = require('mongodb');

const {
  auth: { admin, user },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  setupAppAndGetToken,
  checkRestSuccessfulResponse,
  conditionForActualRecord,
  apiRequest,
} = require('../test-util');
const {
  buildGraphQlCreate,
  buildGraphQlUpdateOne,
  buildGraphQlQuery,
  checkGraphQlSuccessfulResponse,
} = require('../graphql-util');

describe('V5 Backend Field Permissions', function () {
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
    ...conditionForActualRecord,
  };
  const modelName = 'model10field_permissions';
  const docId = MODEL10_SAMPLE._id.toString();

  before(async function () {
    this.appLib = prepareEnv();

    const db = await getMongoConnection(this.appLib.options.MONGODB_URI);
    this.db = db;
  });

  after(async function () {
    await this.db.dropDatabase();
    await this.db.close();
  });

  beforeEach(async function () {
    await Promise.all([
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
      this.db.collection(modelName).deleteMany({}),
    ]);
    await Promise.all([
      this.db.collection('users').insertOne(admin),
      this.db.collection('users').insertOne(user),
      this.db.collection(modelName).insertOne(MODEL10_SAMPLE),
    ]);
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  describe('fields permissions', function () {
    describe('read permissions', function () {
      const restSettingsDef = {
        makeRequest: (r) => r.get(`/${modelName}/${docId}`),
        getData: (res) => res.body.data,
        checkResponse: checkRestSuccessfulResponse,
      };
      const model10Fields =
        'rField1, rField2, rField3, wField1, wField2, wField3, rwField1, rwField2, object1 { string1, string2 } , object2 { string1, string2 }, array1 { _id, string1, string2 }, array2 { _id, string1, string2 }';
      const graphqlSettingsDef = {
        makeRequest: (r) =>
          r.post('/graphql').send(buildGraphQlQuery(modelName, `{_id: '${docId}'}`, `items { ${model10Fields} }`)),
        getData: (res) => res.body.data[modelName].items[0],
        checkResponse: checkGraphQlSuccessfulResponse,
      };

      const getTestFunc = function (settings) {
        return f;

        async function f() {
          const { makeRequest, checkData, checkResponse, getData } = settings;
          const req = makeRequest(apiRequest(this.appLib));
          if (this.token) {
            req.set('Authorization', `JWT ${this.token}`);
          }

          const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
          checkResponse(res);
          checkData(getData(res));
        }
      };

      describe('read permissions for user', function () {
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

        const checkData = (data) => {
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
          should(data.array1[0].string2).be.oneOf(null, undefined);
          should(data.array1[1]._id).not.be.empty();
          should(data.array1[1].string1).be.equal('string21');
          should(data.array1[1].string2).be.oneOf(null, undefined);

          should(data.array2[0]._id).not.be.empty();
          should(data.array2[0].string1).be.equal('string11');
          should(data.array2[0].string2).be.oneOf(null, undefined);
          should(data.array2[1]._id).not.be.empty();
          should(data.array2[1].string1).be.equal('string21');
          should(data.array2[1].string2).be.oneOf(null, undefined);
        };
        const restSettings = _.merge({}, restSettingsDef, { checkData });
        const graphqlSettings = _.merge({}, graphqlSettingsDef, { checkData });

        it('REST: check different fields on read permission as user', getTestFunc(restSettings));
        it('GraphQl: check different fields on read permission as user', getTestFunc(graphqlSettings));
      });

      describe('read permissions for admin', function () {
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

        const checkData = (data) => {
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
        };
        const restSettings = _.merge({}, restSettingsDef, { checkData });
        const graphqlSettings = _.merge({}, graphqlSettingsDef, { checkData });

        it('REST: check different fields on read permission as admin', getTestFunc(restSettings));
        it('GraphQl: check different fields on read permission as admin', getTestFunc(graphqlSettings));
      });

      describe('read permissions for guest', function () {
        beforeEach(function () {
          const { appLib } = this;
          setAppAuthOptions(this.appLib, {
            requireAuthentication: false,
            enablePermissions: true,
          });
          return appLib.setup();
        });

        const checkData = (data) => {
          data.rField1.should.equal('rField1');
          should.not.exist(data.rField2);
          should.not.exist(data.rField3);
          should.not.exist(data.rwField1);
          should.not.exist(data.rwField2);
          should.not.exist(data.object1);
          should.not.exist(data.object2);
        };
        const restSettings = _.merge({}, restSettingsDef, { checkData });
        const graphqlSettings = _.merge({}, graphqlSettingsDef, { checkData });
        it('REST: check different fields on read permission as guest', getTestFunc(restSettings));
        it('GraphQl: check different fields on read permission as guest', getTestFunc(graphqlSettings));
      });
    });

    describe('write permissions', function () {
      describe('create document', function () {
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

        const record = _.omit(MODEL10_SAMPLE, '_id', 'deletedAt');
        const checkDbData = (dbData) => {
          dbData.wField1.should.equal('wField1');
          dbData.wField2.should.equal('wField2');
          should.not.exist(dbData.wField3);
          dbData.rwField1.should.equal('rwField1');
          should.not.exist(dbData.rwField2);
          should(dbData.object1).be.deepEqual({ string1: 'string1' });
          should.not.exist(dbData.object2);
          // TODO: rewrite with something like jest 'objectContaining' or use jest for tests
          should(dbData.array1[0].string2).be.equal('string12');
          should(dbData.array1[0]._id).not.be.empty();
          should(dbData.array1[1].string2).be.equal('string22');
          should(dbData.array1[1]._id).not.be.empty();
          should(dbData.array2).be.deepEqual([]);
        };
        const restSettings = {
          makeRequest: (r) => r.post(`/${modelName}`).send({ data: record }),
          getCreatedDocId: (res) => res.body.id,
          checkResponse: checkRestSuccessfulResponse,
          checkDbData,
        };
        const graphqlSettings = {
          makeRequest: (r) => r.post('/graphql').send(buildGraphQlCreate(modelName, record)),
          getCreatedDocId: (res) => res.body.data[`${modelName}Create`]._id,
          checkResponse: checkGraphQlSuccessfulResponse,
          checkDbData,
        };

        const getTestFunc = function (settings) {
          return f;

          async function f() {
            const { makeRequest, checkDbData: checkData, checkResponse, getCreatedDocId } = settings;
            const req = makeRequest(apiRequest(this.appLib));
            if (this.token) {
              req.set('Authorization', `JWT ${this.token}`);
            }

            const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
            checkResponse(res);
            const dbData = await this.db.collection(modelName).findOne({ _id: ObjectID(getCreatedDocId(res)) });
            checkData(dbData);
          }
        };

        it('REST: create document', getTestFunc(restSettings));
        it('GraphQL: create document', getTestFunc(graphqlSettings));
      });

      describe('update document', function () {
        const getTestFunc = function (settings) {
          return f;

          async function f() {
            const { makeRequest, checkDbData, checkResponse } = settings;
            const req = makeRequest(apiRequest(this.appLib));
            if (this.token) {
              req.set('Authorization', `JWT ${this.token}`);
            }

            const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
            checkResponse(res);
            const dbData = await this.db.collection(modelName).findOne({ _id: ObjectID(docId) });
            checkDbData(dbData);
          }
        };

        describe('as user', function () {
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

          describe('update document (fields without arrays)', function () {
            const record = {
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
            };
            const checkDbData = (dbData) => {
              should(dbData.wField1).be.equal('wField1Updated');
              should(dbData.wField2).be.equal('wField2Updated');
              should(dbData.wField3).be.equal('wField3');
              should(dbData.rwField1).be.equal('rwField1Updated');
              should(dbData.rwField2).be.equal('rwField2');
              should(dbData.object1).be.deepEqual({
                string1: 'string1Updated',
                string2: 'string2',
              });
              should(dbData.object2).be.deepEqual({
                string1: 'string1',
                string2: 'string2',
              });
            };
            const restSettings = {
              makeRequest: (r) => r.put(`/${modelName}/${docId}`).send({ data: record }),
              checkResponse: checkRestSuccessfulResponse,
              checkDbData,
            };
            const graphqlSettings = {
              makeRequest: (r) => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
              checkResponse: checkGraphQlSuccessfulResponse,
              checkDbData,
            };

            it('REST: update document (fields without arrays)', getTestFunc(restSettings));
            it('GraphQL: update document (fields without arrays)', getTestFunc(graphqlSettings));
          });
          // frontend should always send _id to merge items in array properly
          describe('update document (array permissions without merging by _id)', function () {
            const record = {
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
            };
            const checkDbData = (dbData) => {
              should(dbData.array1[0]._id).not.be.empty();
              should(dbData.array1[0].string1).be.undefined();
              should(dbData.array1[0].string2).be.equal('string12Updated');
              should(dbData.array1[1]._id).not.be.empty();
              should(dbData.array1[1].string1).be.undefined();
              should(dbData.array1[1].string2).be.equal('string22Updated');

              // should not write whole user array, keeps old value
              should(dbData.array2[0]._id).not.be.empty();
              should(dbData.array2[0].string1).be.equal('string11');
              should(dbData.array2[0].string2).be.equal('string12');
              should(dbData.array2[1]._id).not.be.empty();
              should(dbData.array2[1].string1).be.equal('string21');
              should(dbData.array2[1].string2).be.equal('string22');
            };
            const restSettings = {
              makeRequest: (r) => r.put(`/${modelName}/${docId}`).send({ data: record }),
              checkResponse: checkRestSuccessfulResponse,
              checkDbData,
            };
            const graphqlSettings = {
              makeRequest: (r) => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
              checkResponse: checkGraphQlSuccessfulResponse,
              checkDbData,
            };

            it('REST: update document (array permissions without merging by _id)', getTestFunc(restSettings));
            it('GraphQL: update document (array permissions without merging by _id)', getTestFunc(graphqlSettings));
          });

          describe('update document (array permissions with merging by _id)', function () {
            const record = {
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
            };

            const checkDbData = (dbData) => {
              // should not write second elem at all
              should(dbData.array1[0]._id).not.be.empty();
              should(dbData.array1[0].string1).be.undefined();
              should(dbData.array1[0].string2).be.equal('newString12');
              should(dbData.array1[1]._id).not.be.empty();
              should(dbData.array1[1].string1).be.undefined();
              should(dbData.array1[1].string2).be.equal('newString22');
              should(dbData.array1[2]._id).not.be.empty();
              should(dbData.array1[2].string1).be.equal('string21'); // merged by _id from old item
              should(dbData.array1[2].string2).be.equal('string22Updated');
            };
            const restSettings = {
              makeRequest: (r) => r.put(`/${modelName}/${docId}`).send({ data: record }),
              checkResponse: checkRestSuccessfulResponse,
              checkDbData,
            };
            const graphqlSettings = {
              makeRequest: (r) => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
              checkResponse: checkGraphQlSuccessfulResponse,
              checkDbData,
            };

            it('REST: update document (array permissions with merging by _id)', getTestFunc(restSettings));
            it('GraphQL: update document (array permissions with merging by _id)', getTestFunc(graphqlSettings));
          });

          describe('update document with empty doc as user (should leave all the fields which cannot be written)', function () {
            const record = {};
            const checkDbData = (dbData) => {
              // should return only generated fields and empty arrays
              should(dbData._id).not.be.undefined();
              should(dbData.rField1).be.undefined();
              should(dbData.rField2).be.equal('rField2');
              should(dbData.rField3).be.equal('rField3');
              should(dbData.wField1).be.undefined();
              should(dbData.wField2).be.undefined();
              should(dbData.wField3).be.equal('wField3');
              should(dbData.rwField1).be.undefined();
              should(dbData.rwField2).be.equal('rwField2');
              should(dbData.object1).be.deepEqual({ string2: 'string2' });
              should(dbData.object2).be.deepEqual({ string1: 'string1', string2: 'string2' });
              should(dbData.array1).be.empty();

              should(dbData.array2[0]._id).not.be.undefined();
              should(dbData.array2[0].string1).be.equal('string11');
              should(dbData.array2[0].string2).be.equal('string12');
              should(dbData.array2[1]._id).not.be.undefined();
              should(dbData.array2[1].string1).be.equal('string21');
              should(dbData.array2[1].string2).be.equal('string22');
            };
            const restSettings = {
              makeRequest: (r) => r.put(`/${modelName}/${docId}`).send({ data: record }),
              checkResponse: checkRestSuccessfulResponse,
              checkDbData,
            };
            const graphqlSettings = {
              makeRequest: (r) => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
              checkResponse: checkGraphQlSuccessfulResponse,
              checkDbData,
            };

            it('REST: update document (array permissions with merging by _id)', getTestFunc(restSettings));
            it('GraphQL: update document (array permissions with merging by _id)', getTestFunc(graphqlSettings));
          });
        });

        describe('as admin', function () {
          describe('update document with empty doc as admin (should merge as empty doc)', function () {
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

            const record = {};
            const checkDbData = (dbData) => {
              // should return only generated fields and empty arrays
              should(_.keys(dbData).length).equal(7);
              should(dbData.array1).be.empty();
              should(dbData.array2).be.empty();
              should(dbData._id).not.be.undefined();
              should(dbData.creator).not.be.undefined();
              should(dbData.updatedAt).not.be.undefined();
              should(dbData.createdAt).not.be.undefined();
              should(+dbData.deletedAt).be.equal(+new Date(0));
            };
            const restSettings = {
              makeRequest: (r) => r.put(`/${modelName}/${docId}`).send({ data: record }),
              checkResponse: checkRestSuccessfulResponse,
              checkDbData,
            };
            const graphqlSettings = {
              makeRequest: (r) => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
              checkResponse: checkGraphQlSuccessfulResponse,
              checkDbData,
            };

            it('REST: update document (fields without arrays)', getTestFunc(restSettings));
            it('GraphQL: update document (fields without arrays)', getTestFunc(graphqlSettings));
          });
        });
      });
    });
  });
});
