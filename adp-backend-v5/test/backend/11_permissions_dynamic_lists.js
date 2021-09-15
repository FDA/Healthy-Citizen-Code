const should = require('should');
const _ = require('lodash');

const {
  auth: { admin, user, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  apiRequest,
} = require('../test-util');
const { buildGraphQlUpdateOne, buildGraphQlCreate } = require('../graphql-util');

const modelName = 'model9_dynamic_list_permissions';

describe('V5 Backend Dynamic List Permissions', () => {
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
    ]);
    await Promise.all([this.db.collection('users').insertOne(admin), this.db.collection('users').insertOne(user)]);
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  describe('lists permissions', () => {
    describe('check security for writing operations', () => {
      it('should allow admin to create item with any valid list values', async function () {
        const model9Sample = {
          dynamicList: 'val1',
          arrayDynamicList: ['val1', 'val2', 'val3', 'val4'],
        };

        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        await this.appLib.setup();
        await this.appLib.start();
        const token = await loginWithUser(appLib, admin);
        const res = await apiRequest(appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(model9Sample, '_id')))
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/)
          .expect(200);
        const item = res.body.data[`${modelName}Create`];
        should(item._id).not.be.empty();
      });

      it('should not allow admin to create item with invalid single list value', async function () {
        const model9Sample = {
          dynamicList: 'invalidVal',
        };
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        await this.appLib.setup();
        await this.appLib.start();
        const token = await loginWithUser(appLib, admin);
        const res = await apiRequest(appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(model9Sample, '_id')))
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/)
          .expect(200);

        res.body.errors.should.not.be.empty();
        const { message } = res.body.errors[0];
        message.should.startWith('Incorrect request: ');
        const errMessageDynamicList = `Value 'invalidVal' is not allowed for list field 'dynamicList'.`;
        message.should.containEql(errMessageDynamicList);
      });

      it('should allow admin to create item with array list containing invalid value (this value must be erased)', async function () {
        const model9Sample = { arrayDynamicList: ['val1', 'invalidVal'] };
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        await this.appLib.setup();
        await this.appLib.start();
        const token = await loginWithUser(appLib, admin);
        const res = await apiRequest(appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(model9Sample, '_id'), 'arrayDynamicList'))
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/)
          .expect(200);

        should(res.body.errors).be.undefined();
        const item = res.body.data[`${modelName}Create`];
        should(item).not.be.undefined();
        should(item.arrayDynamicList).be.deepEqual(['val1']);
      });

      it('should allow user to create and update item with list values available for that user', async function () {
        const model9Sample = {
          dynamicList: 'val1',
          arrayDynamicList: ['val1', 'val2'],
        };

        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        await this.appLib.setup();
        await this.appLib.start();
        const token = await loginWithUser(appLib, user);

        const res = await apiRequest(appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(model9Sample, '_id')))
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/)
          .expect(200);
        should(res.body.errors).be.undefined();
        const item = res.body.data[`${modelName}Create`];
        const savedId = item._id;
        should(savedId).not.be.empty();

        await apiRequest(appLib)
          .post('/graphql')
          .send(buildGraphQlUpdateOne(modelName, _.omit(model9Sample, '_id'), savedId))
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/)
          .expect(200);
        should(res.body.errors).be.undefined();
      });

      it('should not allow user to create item with single list value not available for that user', async function () {
        const model9Sample = {
          dynamicList: 'val3',
          arrayDynamicList: ['val3', 'val4'],
        };
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });

        await this.appLib.setup();
        await this.appLib.start();
        const token = await loginWithUser(appLib, user);
        const res = await apiRequest(appLib)
          .post('/graphql')
          .send(buildGraphQlCreate(modelName, _.omit(model9Sample, '_id')))
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/)
          .expect(200);

        res.body.errors.should.not.be.empty();
        const { message } = res.body.errors[0];
        should(message).startWith('Incorrect request: ');
        const errMessageDynamicList = `Value 'val3' is not allowed for list field 'dynamicList'.`;
        should(message).containEql(errMessageDynamicList);
        // Both ['val3', 'val4'] values for 'arrayDynamicList' are invalid but erased
      });
    });
  });
});
