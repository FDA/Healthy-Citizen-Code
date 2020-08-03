require('should');

const {
  auth: { admin, user, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  apiRequest,
} = require('../test-util');

const modelName = 'model9_dynamic_list_permissions';

describe('V5 Backend Dynamic List Permissions', function () {
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
      this.db.collection('users').deleteMany({}),
      this.db.createCollection(modelName),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ]);
    await Promise.all([this.db.collection('users').insertOne(admin), this.db.collection('users').insertOne(user)]);
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  describe('lists permissions', function () {
    describe('check security for writing operations', function () {
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
        const res = await apiRequest(appLib.app)
          .post(`/${modelName}`)
          .send({ data: model9Sample })
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/);
        res.statusCode.should.equal(200, JSON.stringify(res, null, 2));
        res.body.success.should.equal(true);
        res.body.id.should.not.be.empty();
      });

      it('should not allow admin to create item with invalid list values', async function () {
        const model9Sample = {
          dynamicList: 'invalidVal',
          arrayDynamicList: ['val1', 'invalidVal'],
        };
        const { appLib } = this;
        setAppAuthOptions(this.appLib, {
          requireAuthentication: true,
          enablePermissions: true,
        });
        await this.appLib.setup();
        await this.appLib.start();
        const token = await loginWithUser(appLib, admin);
        const res = await apiRequest(appLib.app)
          .post(`/${modelName}`)
          .send({ data: model9Sample })
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/);
        res.statusCode.should.equal(400, JSON.stringify(res, null, 2));
        res.body.success.should.equal(false);
        const errMessageDynamicList = `Value 'invalidVal' is not allowed for list field 'model9_dynamic_list_permissions.dynamicList'.`;
        const errMessageArrayDynamicList = `Value 'invalidVal' is not allowed for list field 'model9_dynamic_list_permissions.arrayDynamicList'.`;
        const { message } = res.body;
        message.should.startWith('Incorrect request: ');
        message.should.containEql(errMessageDynamicList);
        message.should.containEql(errMessageArrayDynamicList);
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

        const res = await apiRequest(appLib.app)
          .post(`/${modelName}`)
          .send({ data: model9Sample })
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/);
        res.statusCode.should.equal(200, JSON.stringify(res, null, 2));
        res.body.success.should.equal(true);
        const savedId = res.body.id;
        savedId.should.not.be.empty();

        const res2 = await apiRequest(appLib.app)
          .put(`/${modelName}/${savedId}`)
          .send({ data: model9Sample })
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/);
        res2.statusCode.should.equal(200, JSON.stringify(res, null, 2));
        res2.body.success.should.equal(true);
      });

      it('should not allow user to create item with list values not available for that user', async function () {
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
        const res = await apiRequest(appLib.app)
          .post(`/${modelName}`)
          .send({ data: model9Sample })
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/);
        res.statusCode.should.equal(400, JSON.stringify(res, null, 2));
        res.body.success.should.equal(false);

        const errMessageDynamicList = `Value 'val3' is not allowed for list field 'model9_dynamic_list_permissions.dynamicList'.`;
        const errMessageArrayDynamicList = [
          `Value 'val3' is not allowed for list field 'model9_dynamic_list_permissions.arrayDynamicList'.`,
          `Value 'val4' is not allowed for list field 'model9_dynamic_list_permissions.arrayDynamicList'.`,
        ];
        const { message } = res.body;
        message.should.startWith('Incorrect request: ');
        message.should.containEql(errMessageDynamicList);
        errMessageArrayDynamicList.forEach((m) => message.should.containEql(m));
      });
    });
  });
});
