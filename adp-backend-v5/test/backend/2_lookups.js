const request = require('supertest');
const should = require('should');
const { ObjectID } = require('mongodb');

const reqlib = require('app-root-path').require;

const {
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  auth: { admin },
  setupAppAndGetToken,
  conditionForActualRecord,
} = reqlib('test/test-util');
const { buildGraphQlCreate, buildGraphQlUpdateOne, buildGraphQlLookupQuery, checkGraphQlInvalidRequest } = reqlib(
  'test/graphql-util.js'
);
const { getLookupTypeName } = require('../../lib/graphql/type/lookup');

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
  ].map(d => ({ ...d, ...conditionForActualRecord }));

  const sampleDataModel3 = {
    _id: new ObjectID('487179f6ef4807703afd0df0'),
    model4Id: {
      table: 'model4s',
      label: sampleDataModel4[0].name,
      _id: sampleDataModel4[0]._id,
    },
    ...conditionForActualRecord,
  };

  before(async function() {
    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    const db = await getMongoConnection();
    this.db = db;
  });

  after(async function() {
    await this.db.dropDatabase();
    await this.db.close();
  });

  beforeEach(async function() {
    await Promise.all([
      this.db.collection('model3s').deleteMany({}),
      this.db.collection('model4s').deleteMany({}),
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ]);

    await Promise.all([
      this.db.collection('model3s').insertOne(sampleDataModel3),
      this.db.collection('model4s').insertMany(sampleDataModel4),
      this.db.collection('users').insertOne(admin),
    ]);
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });
  const getTestFunc = function(settings) {
    return f;

    async function f() {
      const { makeRequest, checkResponse, checkData } = settings;
      const req = makeRequest(request(this.appLib.app));
      if (this.token) {
        req.set('Authorization', `JWT ${this.token}`);
      }
      const res = await req.set('Accept', 'application/json').expect('Content-Type', /json/);
      const data = await checkResponse.call(this, res);
      if (checkData) {
        await checkData.call(this, data);
      }
    }
  };

  describe('lookups in /routes', () => {
    it('GET /routes contains endpoint', async function() {
      await this.appLib.setup();
      const res = await request(this.appLib.app)
        .get('/routes')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
      res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
      res.body.success.should.equal(true, res.body.message);
      res.body.data.brief.should.containEql('GET /lookups/model4Id/model4s AUTH');
    });
  });

  describe('lookups basics, no auth', () => {
    beforeEach(function() {
      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
      });
      return this.appLib.setup();
    });

    describe('should write valid lookups with fixing lookup label', () => {
      const modelName = 'model3s';
      describe('on POST', () => {
        const record = {
          model4Id: {
            table: 'model4s',
            label: 'whatever',
            _id: sampleDataModel4[0]._id.toString(),
          },
          model4IdSortBy: {
            table: 'model4s',
            label: 'whatever',
            _id: sampleDataModel4[0]._id.toString(),
          },
        };
        const checkData = async function(id) {
          const res2 = await request(this.appLib.app)
            .get(`/${modelName}/${id}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          const { success: success2, data } = res2.body;
          should(success2).be.equal(true);
          should(data.model4Id).be.deepEqual({
            table: 'model4s',
            label: 'name1-description1',
            _id: sampleDataModel4[0]._id.toString(),
          });
          should(data.model4IdSortBy).be.deepEqual({
            table: 'model4s',
            label: 'name1',
            _id: sampleDataModel4[0]._id.toString(),
          });
        };
        const restSettings = {
          makeRequest: r => r.post(`/${modelName}`).send({ data: record }),
          async checkResponse(res) {
            const { success, id } = res.body;
            should(success).be.equal(true);
            return id;
          },
          checkData,
        };
        const graphqlSettings = {
          makeRequest: r => r.post('/graphql').send(buildGraphQlCreate(modelName, record)),
          async checkResponse(res) {
            res.statusCode.should.equal(200);
            const { _id } = res.body.data[`${modelName}Create`];
            return _id;
          },
          checkData,
        };
        it(`REST: should insert valid lookups`, getTestFunc(restSettings));
        it(`GraphQL: should insert valid lookups`, getTestFunc(graphqlSettings));
      });

      describe('on PUT', () => {
        const record = {
          model4Id: {
            table: 'model4s',
            label: 'whatever',
            _id: sampleDataModel4[0]._id.toString(),
          },
          model4IdSortBy: {
            table: 'model4s',
            label: 'whatever',
            _id: sampleDataModel4[0]._id.toString(),
          },
        };
        const docId = sampleDataModel3._id.toString();
        const checkData = async function(id) {
          const res2 = await request(this.appLib.app)
            .get(`/${modelName}/${id}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
          const { success, data } = res2.body;
          should(success).be.equal(true);
          should(data.model4Id).be.deepEqual({
            table: 'model4s',
            label: 'name1-description1',
            _id: sampleDataModel4[0]._id.toString(),
          });
          should(data.model4IdSortBy).be.deepEqual({
            table: 'model4s',
            label: 'name1',
            _id: sampleDataModel4[0]._id.toString(),
          });
        };
        const restSettings = {
          makeRequest: r => r.put(`/${modelName}/${docId}`).send({ data: record }),
          async checkResponse(res) {
            const { success, id } = res.body;
            should(success).be.equal(true);
            return id;
          },
          checkData,
        };
        const graphqlSettings = {
          makeRequest: r => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
          async checkResponse(res) {
            res.statusCode.should.equal(200);
            const { _id } = res.body.data[`${modelName}UpdateOne`];
            return _id;
          },
          checkData,
        };
        it(`REST: should update valid lookups`, getTestFunc(restSettings));
        it(`GraphQL: should update valid lookups`, getTestFunc(graphqlSettings));
      });
    });

    describe('should not write lookups referenced to non-existing records', () => {
      const modelName = 'model3s';
      describe('on POST', () => {
        const record = {
          model4Id: {
            table: 'model4s',
            label: 'invalid label', // backend does not consider label at all, so its valid
            _id: sampleDataModel4[0]._id.toString(),
          },
          model4IdSortBy: {
            table: 'nonexistingCollection',
            label: 'some label',
            _id: new ObjectID(),
          },
        };
        const restSettings = {
          makeRequest: r => r.post(`/${modelName}`).send({ data: record }),
          checkResponse: res => {
            const { success, message } = res.body;
            should(success).be.equal(false);

            const [cause, fields] = message.split(':');
            should(cause).be.equal('Found invalid lookups sent in fields');

            const fieldNames = fields.trim().split(', ');
            should(fieldNames).containDeep(['model4IdSortBy']);
          },
        };
        const graphqlSettings = {
          makeRequest: r => r.post('/graphql').send(buildGraphQlCreate(modelName, record)),
          checkResponse: checkGraphQlInvalidRequest,
        };
        it(
          `REST: should not insert lookups referenced to non-existing records, label fields do not matter, on POST`,
          getTestFunc(restSettings)
        );
        it(
          `GraphQL: should not insert lookups referenced to non-existing records, label fields do not matter, on POST`,
          getTestFunc(graphqlSettings)
        );
      });

      describe('on PUT', () => {
        const record = {
          model4Id: {
            table: 'model4s',
            label: 'invalid label',
            _id: sampleDataModel4[0]._id.toString(),
          },
          model4IdSortBy: {
            table: 'nonexistingCollection',
            label: 'some label',
            _id: new ObjectID(),
          },
        };
        const docId = sampleDataModel3._id.toString();
        const restSettings = {
          makeRequest: r => r.put(`/${modelName}/${docId}`).send({ data: record }),
          checkResponse: res => {
            const { success, message } = res.body;
            should(success).be.equal(false);

            const [cause, fields] = message.split(':');
            should(cause).be.equal('Found invalid lookups sent in fields');

            const fieldNames = fields.trim().split(', ');
            should(fieldNames).containDeep(['model4IdSortBy']);
          },
        };
        const graphqlSettings = {
          makeRequest: r => r.post('/graphql').send(buildGraphQlUpdateOne(modelName, record, docId)),
          checkResponse: checkGraphQlInvalidRequest,
        };
        it(
          `REST: should not insert lookups referenced to non-existing records, label fields do not matter, on PUT`,
          getTestFunc(restSettings)
        );
        it(
          `GraphQL: should not insert lookups referenced to non-existing records, label fields do not matter, on PUT`,
          getTestFunc(graphqlSettings)
        );
      });
    });

    describe('returns correct results', () => {
      describe('for search for lookup with filtering condition', () => {
        const lookupId = 'model3LookupWithFiltering';
        const lookupTableName = `model4s`;

        const restSettings = (checkData, form) => ({
          makeRequest: r => r.post(`/lookups/${lookupId}/${lookupTableName}`).send(form),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            res.body.success.should.equal(true);
            const { data } = res.body;
            checkData(data);
          },
        });
        const graphqlSettings = (checkData, form) => ({
          makeRequest: r =>
            r.post('/graphql').send(
              buildGraphQlLookupQuery({
                lookupId,
                tableName: lookupTableName,
                form,
                selectFields: 'items { _id label table }',
              })
            ),
          checkResponse: res => {
            res.statusCode.should.equal(200, res.body.errors);
            const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
            checkData(data);
          },
        });

        describe('fulfilled form', () => {
          const form = { filteringField: sampleDataModel4[1].name };
          const checkData = results => {
            results.length.should.equal(1);
            const { label } = results[0];
            label.should.equal(form.filteringField);
          };

          it(
            `REST: returns correct results for search for lookup with filtering condition, fulfilled form`,
            getTestFunc(restSettings(checkData, form))
          );
          it(
            `GraphQL: returns correct results for search for lookup with filtering condition, fulfilled form`,
            getTestFunc(graphqlSettings(checkData, form))
          );
        });

        describe('undefined form', () => {
          const form = undefined;
          const checkData = results => {
            results.length.should.equal(3);
          };

          it(
            `REST: returns correct results for search for lookup with filtering condition, undefined form`,
            getTestFunc(restSettings(checkData, form))
          );
          it(
            `GraphQL: returns correct results for search for lookup, undefined form`,
            getTestFunc(graphqlSettings(checkData, form))
          );
        });

        describe('empty object form', () => {
          const form = {};
          const checkData = results => {
            results.length.should.equal(3);
          };

          it(
            `REST: returns correct results for search for lookup with filtering condition, empty object form`,
            getTestFunc(restSettings(checkData, form))
          );
          it(
            `GraphQL: returns correct results for search for lookup with filtering condition, empty object form`,
            getTestFunc(graphqlSettings(checkData, form))
          );
        });
      });

      describe('for search for lookup with data attribute', () => {
        const lookupId = 'model4IdData';
        const lookupTableName = `model4s`;
        const q = `abc`;

        const checkData = data => {
          data.length.should.equal(2);
          should(data).be.containDeep([
            {
              _id: '587179f6ef4807703afd0df4',
              label: 'name5_abc',
              table: 'model4s',
              data: {
                info: 'name5_abc-description5',
                desc: 'DESCRIPTION5',
              },
            },
            {
              _id: '587179f6ef4807703afd0df3',
              label: 'name4',
              table: 'model4s',
              data: {
                info: 'name4-description4_abc',
                desc: 'DESCRIPTION4_ABC',
              },
            },
          ]);
        };

        const restSettings = {
          makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}`),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            res.body.success.should.equal(true);
            const { data } = res.body;
            checkData(data);
          },
        };
        const graphqlSettings = {
          makeRequest: r =>
            r.post('/graphql').send(
              buildGraphQlLookupQuery({
                lookupId,
                tableName: lookupTableName,
                q,
                selectFields: 'items { _id label table data { info desc } }',
              })
            ),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
            checkData(data);
          },
        };
        it(`REST: returns correct results for search for lookup with data attribute`, getTestFunc(restSettings));
        it(`GraphQL: returns correct results for search for lookup with data attribute`, getTestFunc(graphqlSettings));
      });

      describe(`for specific search with 'q'`, () => {
        const lookupId = 'model4Id';
        const lookupTableName = `model4s`;
        const q = `abc`;

        const checkData = data => {
          data.length.should.equal(2);
          should(data).be.containDeep([
            {
              _id: '587179f6ef4807703afd0df4',
              label: 'name5_abc-description5',
              table: 'model4s',
            },
            {
              _id: '587179f6ef4807703afd0df3',
              label: 'name4-description4_abc',
              table: 'model4s',
            },
          ]);
        };

        const restSettings = {
          makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}`),
          checkResponse: res => {
            res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
            res.body.success.should.equal(true, res.body.message);
            const { data } = res.body;
            checkData(data);
          },
        };
        const graphqlSettings = {
          makeRequest: r =>
            r.post('/graphql').send(
              buildGraphQlLookupQuery({
                lookupId,
                tableName: lookupTableName,
                q,
                selectFields: 'items { _id label table }',
              })
            ),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
            checkData(data);
          },
        };
        it(`REST: returns correct results for search for specific search`, getTestFunc(restSettings));
        it(`GraphQL: returns correct results for search for specific search`, getTestFunc(graphqlSettings));
      });

      describe(`for specific search when both 'dxQuery' and 'q' specified 'q' is skipped`, () => {
        const lookupId = 'model4Id';
        const lookupTableName = `model4s`;

        const name4DocId = sampleDataModel4[3]._id.toString();
        const q = 'name1';
        const dxQuery = `[ [ '_id', '=', '${name4DocId}' ], 'or', [ 'description', 'contains', 'def' ] ]`;

        const checkData = data => {
          data.length.should.equal(2);
          should(data).be.containDeep([
            {
              _id: '587179f6ef4807703afd0df3',
              label: 'name4-description4_abc',
              table: 'model4s',
            },
            {
              _id: '587179f6ef4807703afd0df2',
              label: 'name3-description3_def',
              table: 'model4s',
            },
          ]);
        };

        const graphqlSettings = {
          makeRequest: r =>
            r.post('/graphql').send(
              buildGraphQlLookupQuery({
                lookupId,
                tableName: lookupTableName,
                q,
                dxQuery,
                selectFields: 'items { _id label table }',
              })
            ),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
            checkData(data);
          },
        };
        it(
          `GraphQL: returns correct results for search for specific search with 'dxQuery'`,
          getTestFunc(graphqlSettings)
        );
      });

      describe('with pagination, page 1', () => {
        const lookupId = 'model4Id';
        const lookupTableName = `model4s`;
        const q = `name`;
        const page = `1`;

        const checkData = data => {
          data.length.should.equal(3);
          data[0].label.should.equal('name5_abc-description5');
          data[1].label.should.equal('name4-description4_abc');
          data[2].label.should.equal('name3-description3_def');
        };

        const restSettings = {
          makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}&page=${page}`),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            res.body.success.should.equal(true);
            const { data } = res.body;
            checkData(data);
          },
        };
        const graphqlSettings = {
          makeRequest: r =>
            r.post('/graphql').send(
              buildGraphQlLookupQuery({
                lookupId,
                tableName: lookupTableName,
                q,
                selectFields: 'items { _id label table }',
                page,
              })
            ),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
            checkData(data);
          },
        };
        it(`REST: returns correct results with pagination, page 1`, getTestFunc(restSettings));
        it(`GraphQL: returns correct results with pagination, page 1`, getTestFunc(graphqlSettings));
      });

      describe('with pagination, page 2', () => {
        const lookupId = 'model4Id';
        const lookupTableName = `model4s`;
        const q = `name`;
        const page = `2`;

        const checkData = data => {
          data.length.should.equal(2);
          data[0].label.should.equal('name2-description2');
          data[1].label.should.equal('name1-description1');
        };

        const restSettings = {
          makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}&page=${page}`),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            res.body.success.should.equal(true);
            const { data } = res.body;
            checkData(data);
          },
        };
        const graphqlSettings = {
          makeRequest: r =>
            r.post('/graphql').send(
              buildGraphQlLookupQuery({
                lookupId,
                tableName: lookupTableName,
                q,
                selectFields: 'items { _id label table }',
                page,
              })
            ),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
            checkData(data);
          },
        };
        it(`REST: returns correct results with pagination, page 2`, getTestFunc(restSettings));
        it(`GraphQL: returns correct results with pagination, page 2`, getTestFunc(graphqlSettings));
      });

      describe('with pagination and sortBy field, page 1', () => {
        const lookupId = 'model4IdSortBy';
        const lookupTableName = `model4s`;
        const q = `name`;
        const page = `1`;

        const checkData = data => {
          data.length.should.equal(3);
          data[0].label.should.equal('name5_abc');
          data[1].label.should.equal('name4');
          data[2].label.should.equal('name3');
        };

        const restSettings = {
          makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}&page=${page}`),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            res.body.success.should.equal(true);
            const { data } = res.body;
            checkData(data);
          },
        };
        const graphqlSettings = {
          makeRequest: r =>
            r.post('/graphql').send(
              buildGraphQlLookupQuery({
                lookupId,
                tableName: lookupTableName,
                q,
                selectFields: 'items { _id label table }',
                page,
              })
            ),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
            checkData(data);
          },
        };
        it(`REST: returns correct results with pagination and sortBy field, page 1`, getTestFunc(restSettings));
        it(`GraphQL: returns correct results with pagination and sortBy field, page 1`, getTestFunc(graphqlSettings));
      });

      describe('with pagination and sortBy field, page 2', () => {
        const lookupId = 'model4IdSortBy';
        const lookupTableName = `model4s`;
        const q = `name`;
        const page = `2`;

        const checkData = data => {
          data.length.should.equal(2);
          data[0].label.should.equal('name2');
          data[1].label.should.equal('name1');
        };

        const restSettings = {
          makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}&page=${page}`),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            res.body.success.should.equal(true);
            const { data } = res.body;
            checkData(data);
          },
        };
        const graphqlSettings = {
          makeRequest: r =>
            r.post('/graphql').send(
              buildGraphQlLookupQuery({
                lookupId,
                tableName: lookupTableName,
                q,
                selectFields: 'items { _id label table }',
                page,
              })
            ),
          checkResponse: res => {
            res.statusCode.should.equal(200);
            const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
            checkData(data);
          },
        };
        it(`REST: returns correct results with pagination and sortBy field, page 2`, getTestFunc(restSettings));
        it(`GraphQL: returns correct results with pagination and sortBy field, page 2`, getTestFunc(graphqlSettings));
      });
    });
  });

  describe('returns correct results for lookups with scopes and enabled permissions', () => {
    describe('should return 401 by not authenticated request', () => {
      beforeEach(function() {
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enableAuthentication: true,
          enablePermissions: true,
        });
        return this.appLib.setup();
      });

      const lookupId = 'Model3scopesModel4id';
      const lookupTableName = `model4s`;
      const q = `abc`;

      const restSettings = {
        makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}`),
        checkResponse: res => {
          res.statusCode.should.equal(401);
          res.body.success.should.equal(false);
        },
      };
      const graphqlSettings = {
        makeRequest: r =>
          r.post('/graphql').send(
            buildGraphQlLookupQuery({
              lookupId,
              tableName: lookupTableName,
              q,
              selectFields: 'items { _id label table }',
            })
          ),
        checkResponse: res => {
          res.statusCode.should.equal(401);
          res.body.success.should.equal(false);
        },
      };
      it(`REST: should return 401 by not authenticated request`, getTestFunc(restSettings));
      it(`GraphQL: should return 401 by not authenticated request`, getTestFunc(graphqlSettings));
    });

    describe('should not return lookups to guest', () => {
      beforeEach(function() {
        setAppAuthOptions(this.appLib, {
          requireAuthentication: false,
          enableAuthentication: true,
          enablePermissions: true,
        });
        return this.appLib.setup();
      });

      const lookupId = 'Model3scopesModel4id';
      const lookupTableName = `model4s`;
      const q = `abc`;

      const checkData = data => data.length.should.equal(0);

      const restSettings = {
        makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}`),
        checkResponse: res => {
          res.statusCode.should.equal(200);
          res.body.success.should.equal(true);
          const { data } = res.body;
          checkData(data);
        },
      };
      const graphqlSettings = {
        makeRequest: r =>
          r.post('/graphql').send(
            buildGraphQlLookupQuery({
              lookupId,
              tableName: lookupTableName,
              q,
              selectFields: 'items { _id label table }',
            })
          ),
        checkResponse: res => {
          res.statusCode.should.equal(200);
          const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
          checkData(data);
        },
      };
      it(`REST: should not return lookups to guest`, getTestFunc(restSettings));
      it(`GraphQL: should not return lookups to guest`, getTestFunc(graphqlSettings));
    });

    describe('should return lookups to admin', () => {
      beforeEach(async function() {
        this.token = await setupAppAndGetToken(
          this.appLib,
          {
            enableAuthentication: true,
            enablePermissions: true,
          },
          admin
        );
      });

      const lookupId = 'Model3scopesModel4id';
      const lookupTableName = `model4s`;
      const q = `abc`;

      const checkData = data => {
        data.length.should.equal(2);
        data[0].label.should.equal('name5_abc');
        data[1].label.should.equal('name4');
      };

      const restSettings = {
        makeRequest: r => r.get(`/lookups/${lookupId}/${lookupTableName}?q=${q}`),
        checkResponse: res => {
          res.statusCode.should.equal(200);
          res.body.success.should.equal(true);
          const { data } = res.body;
          checkData(data);
        },
      };
      // const graphqlSettings = {
      //   makeRequest: r =>
      //     r.post('/graphql').send(
      //       buildGraphQlLookupQuery({
      //         lookupId,
      //         tableName: lookupTableName,
      //         q,
      //         selectFields: 'items { _id label table }',
      //       })
      //     ),
      //   checkResponse: res => {
      //     res.statusCode.should.equal(200);
      //     const data = res.body.data[getLookupTypeName(lookupId, lookupTableName)].items;
      //     checkData(data);
      //   },
      // };
      it(`REST: should return lookups to admin`, getTestFunc(restSettings));

      // TODO: resolve why its passed as a single test and fails in "npm test" (issue with superAdminScope not set before creating of graphql queries)
      // it(`GraphQL: should return lookups to admin`, getTestFunc(graphqlSettings));
    });
  });
});
