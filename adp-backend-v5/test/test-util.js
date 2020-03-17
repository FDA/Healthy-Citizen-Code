const assert = require('assert');
const uuid = require('uuid');
const _ = require('lodash');
const request = require('supertest');
const { ObjectID, MongoClient } = require('mongodb');
const reqlib = require('app-root-path').require;
const { prepareEnv: prepareAppEnv, getSchemaNestedPaths } = require('../lib/util/env');

const { generateObjectId, stringifyObjectId } = reqlib('/lib/util/util');

const isDateString = str => !Number.isNaN(Date.parse(str));

const diffObjects = (a, b) => {
  const result = {
    different: [],
    missing_from_first: [],
    missing_from_second: [],
  };

  _.reduce(
    a,
    (res, value, key) => {
      if (_.has(b, key)) {
        if (_.isEqual(value, b[key])) {
          return res;
        }
        if (typeof a[key] !== 'object' || typeof b[key] !== 'object') {
          // dead end.
          res.different.push(key);
          return res;
        }
        const deeper = diffObjects(a[key], b[key]);
        res.different = res.different.concat(_.map(deeper.different, subPath => `${key}.${subPath}`));

        res.missing_from_second = res.missing_from_second.concat(
          _.map(deeper.missing_from_second, subPath => `${key}.${subPath}`)
        );

        res.missing_from_first = res.missing_from_first.concat(
          _.map(deeper.missing_from_first, subPath => `${key}.${subPath}`)
        );
        return res;
      }
      res.missing_from_second.push(key);
      return res;
    },
    result
  );

  _.reduce(
    b,
    (res, value, key) => {
      if (_.has(a, key)) {
        return res;
      }
      res.missing_from_first.push(key);
      return res;
    },
    result
  );

  return result;
};

const checkForEqualityConsideringInjectedFields = (data, sample) => {
  const objDiff = diffObjects(data, sample);
  objDiff.missing_from_second.forEach(path => {
    // check synthesized updatedAt and createdAt fields for every nested
    const syntesizedDateFields = ['createdAt', 'updatedAt', 'deletedAt'];
    const isSyntesizedDateField = syntesizedDateFields.find(f => path.endsWith(f));
    const isActionsFields = path === '_actions';
    assert(isSyntesizedDateField || isActionsFields, path);
    if (isSyntesizedDateField) {
      const synthesizedDate = _.get(data, path);
      assert(isDateString(synthesizedDate), synthesizedDate);
    }
  });
  if (objDiff.different.includes('deletedAt') && +new Date(data.deletedAt) === +new Date(sample.deletedAt)) {
    _.pull(objDiff.different, 'deletedAt');
  }
  assert(objDiff.different.length === 0, JSON.stringify(objDiff, null, 2));
  assert(objDiff.missing_from_first.length === 0, `missing_from_first: ${JSON.stringify(objDiff.missing_from_first)}`);
};

const prepareEnv = (path = './test/backend/.env.test') => {
  require('dotenv').load({ path });
  prepareAppEnv();

  // generate random database for every test
  const slashIndex = process.env.MONGODB_URI.lastIndexOf('/');
  process.env.MONGODB_URI = `${process.env.MONGODB_URI.substring(0, slashIndex + 1)}~${uuid.v4()}`;
  console.log(process.env.MONGODB_URI);
};

/**
 * Converts all ObjectIDs in the object into strings and does that recursively
 * @param obj
 */
const fixObjectId = obj => {
  _.each(obj, (val, key) => {
    if (key === '_id') {
      obj[key] += '';
    } else if (typeof val === 'object') {
      fixObjectId(val);
    }
  });
};

const deleteObjectId = obj => {
  _.each(obj, (val, key) => {
    if (key === '_id') {
      delete obj[key];
    } else if (typeof val === 'object') {
      deleteObjectId(val);
    }
  });
};

// TODO: move getConditionForActualRecord from '../../lib/database-abstraction' and use it here;
const conditionForActualRecord = { deletedAt: new Date(0) };

const sampleData1 = {
  _id: ObjectID('587179f6ef4807703afd0dfe'),
  encounters: [
    {
      _id: generateObjectId('s1e1'),
      diagnoses: [
        {
          _id: generateObjectId('s1e1d1'),
          data: 's1data_e1d1',
        },
      ],
      vitalSigns: [
        {
          _id: generateObjectId('s1e1v1'),
          data: 's1data_e1v1',
        },
      ],
    },
    {
      _id: generateObjectId('s1e2'),
      diagnoses: [
        {
          _id: generateObjectId('s1e2d1'),
          data: 's1data_e2d1',
        },
      ],
      vitalSigns: [
        {
          _id: generateObjectId('s1e2v1'),
          data: 's1data_e2v1',
        },
        {
          _id: generateObjectId('s1e2v2'),
          data: 's1data_e2v2',
        },
      ],
    },
  ],
  ...conditionForActualRecord,
};
const sampleDataToCompare1 = _.cloneDeep(sampleData1);
fixObjectId(sampleDataToCompare1);

const sampleData2 = {
  // note the reversed sorting order because the model has default sorting
  _id: ObjectID('587179f6ef4807703afd0dff'),
  encounters: [
    {
      _id: generateObjectId('s2e3'),
      vitalSigns: [],
      diagnoses: [],
    },
    {
      _id: generateObjectId('s2e2'),
      diagnoses: [
        {
          _id: generateObjectId('s2e2d1'),
          data: 's2data_e2d1',
        },
      ],
      vitalSigns: [
        {
          _id: generateObjectId('s2e2v1'),
          data: 's2data_e2v1',
        },
        {
          _id: generateObjectId('s2e2v2'),
          data: 's2data_e2v2',
        },
      ],
    },
    {
      _id: generateObjectId('s2e1'),
      diagnoses: [
        {
          _id: generateObjectId('s2e1d1'),
          data: 's2data_e1d1',
        },
      ],
      vitalSigns: [
        {
          _id: generateObjectId('s2e1v1'),
          data: 's2data_e1v1',
        },
      ],
    },
  ],
  ...conditionForActualRecord,
};
const sampleDataToCompare2 = _.cloneDeep(sampleData2);
fixObjectId(sampleDataToCompare2);

// this data will be used for post, it won't be in the database
const sampleData0 = {
  _id: ObjectID('587179f6ef4807703afd0dfd'),
  string: 'string',
  encounters: [
    {
      _id: generateObjectId('s0e1'),
      diagnoses: [
        {
          _id: generateObjectId('s0e1d1'),
          data: 's0data_e1d1',
        },
      ],
      vitalSigns: [
        {
          _id: generateObjectId('s0e1v1'),
          data: 's0data_e1v1',
          array: ['a', 'b'],
        },
      ],
    },
    {
      _id: generateObjectId('s0e2'),
      diagnoses: [
        {
          _id: generateObjectId('s0e2d1'),
          data: 's0data_e2d1',
        },
      ],
      vitalSigns: [
        {
          _id: generateObjectId('s0e2v1'),
          data: 's0data_e2v1',
          array: ['B', 'C'],
        },
        {
          _id: generateObjectId('s0e2v2'),
          data: 's0data_e2v2',
          array: ['1', '2', '3'],
        },
      ],
    },
  ],
  ...conditionForActualRecord,
};
const sampleDataToCompare0 = _.cloneDeep(sampleData0);
fixObjectId(sampleDataToCompare0);

const loginWithUser = async function(appLib, user) {
  const res = await request(appLib.app)
    .post('/login')
    .send({
      login: user.login,
      password: 'Password!1',
    })
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/);
  res.statusCode.should.equal(200);
  res.body.success.should.equal(true);
  return res.body.data.token;
};

const getMongoConnection = async (url = process.env.MONGODB_URI) => {
  const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = client.db(client.s.options.dbName);
  db.close = client.close.bind(client);
  return db;
};

const setAppAuthOptions = (appLib, authOptions) => {
  const overrideAppAuth = {
    interface: {
      app: {
        auth: authOptions,
      },
    },
  };
  appLib.setOptions({
    appModelSources: [...getSchemaNestedPaths('model'), overrideAppAuth],
  });
};

const checkItemSoftDeleted = async (db, modelName, _id) => {
  try {
    const doc = await db.collection(modelName).findOne({ _id: ObjectID(_id) });
    return _.get(doc, 'deletedAt');
  } catch (e) {
    return null;
  }
};

const checkRestSuccessfulResponse = res => {
  res.statusCode.should.equal(200);
  res.body.success.should.equal(true);
};

const checkRestErrorResponse = res => {
  res.statusCode.should.equal(400);
  res.body.success.should.equal(false);
};

const setupAppAndGetToken = async (appLib, authOptions, user) => {
  setAppAuthOptions(appLib, authOptions);
  await appLib.setup();
  const token = await loginWithUser(appLib, user);
  return token;
};

const sortByIdDesc = arr => {
  return [...arr].sort((a, b) => (a._id.toString() <= b._id.toString() ? 1 : -1));
};

module.exports = {
  // reReadModelsAndMongoose,
  isDateString,
  diffObjects,
  checkForEqualityConsideringInjectedFields,
  fixObjectId,
  deleteObjectId,
  samples: {
    sampleData1,
    sampleDataToCompare1,
    sampleData2,
    sampleDataToCompare2,
    sampleData0,
    sampleDataToCompare0,
  },
  auth: {
    admin: {
      _id: ObjectID('5a82afdaca4cce2a889b9808'),
      // "salt": "a74f0a5de5a9bf9a022b45e8c56eb04d47b1d7825eec67379294f775e33fca69",
      // "password": "3c2d3ea61ed8baffeaf54eb0afc78b1ee87786e7532c98163ca1e23ca53f0a35ff05961bcffe963c0cd9d42105c02e2d1d281773e9e09e57449796181801f86236c898bb4afafdf6d56c67776cfaa7a17e49411043091ff1fd45d7e988261776f9c060a8c26dcc1d3d134123214e578f90ce40a45754346efe7246b32e547312863760ea61bfeccc989ecefac9748a4f2b19649d666a413eaf1ad2c055cc55f7ef235b52ba55569577a6fb60bae006080940a6d7aa322f5698088be2f5a4ea7e82a803b6e50ee36dc0c699d736ebf95ab16151aa7581dec3aa2c201e74f966e3c0f59301dbc22a8d1471b1c343d6210af45b2a5f0e4c2c7c0be13c6775d0e419dd04382a1dcb8b748279290e695d272343a77fd5832cb87b14d18ce63380d8995dbfe71f64a62edff3441fc849a163d1b12dc4bc1233f9f39919b819006394a60a0da1f24336d940ba20117381e7d150d747b52532fd3fad10b50e74a6f10d260d99cda8445fc8b859ee65ec3ad8fb3b8fef93ba2158b2d88dd79271acb362401abd5eff75cd8912e36bf0ee1faaebf5cce67a3058cba1933758e9a1507b48f0865f9052c6a1262741242aa88ef6ea9058b9e303210bec0228dcdbb22794fd73827003fce8b4aa0df8ee1f2d5d318bdbaacfe314d6de069d67f36933a7ce57f1d462dffbefa3baa6fd09aa8fbb6dd2f7199ab1a6f5df723f2b06195d7f6ece6b",
      password: '$2a$10$XTALVc7ZtkwrBwc3iPjDtepfgdd/sW5WnwISfl1MVplxdnsDwy88a',
      userRecordId: ObjectID('5a82afdaca4cce2a889b9807'),
      email: 'admin@a.a',
      login: 'admin',
      roles: ['SuperAdmin'],
      ...conditionForActualRecord,
    },
    user: {
      _id: ObjectID('5a82afdaca4cce2a889b9809'),
      // "salt": "a74f0a5de5a9bf9a022b45e8c56eb04d47b1d7825eec67379294f775e33fca69",
      // "password": "3c2d3ea61ed8baffeaf54eb0afc78b1ee87786e7532c98163ca1e23ca53f0a35ff05961bcffe963c0cd9d42105c02e2d1d281773e9e09e57449796181801f86236c898bb4afafdf6d56c67776cfaa7a17e49411043091ff1fd45d7e988261776f9c060a8c26dcc1d3d134123214e578f90ce40a45754346efe7246b32e547312863760ea61bfeccc989ecefac9748a4f2b19649d666a413eaf1ad2c055cc55f7ef235b52ba55569577a6fb60bae006080940a6d7aa322f5698088be2f5a4ea7e82a803b6e50ee36dc0c699d736ebf95ab16151aa7581dec3aa2c201e74f966e3c0f59301dbc22a8d1471b1c343d6210af45b2a5f0e4c2c7c0be13c6775d0e419dd04382a1dcb8b748279290e695d272343a77fd5832cb87b14d18ce63380d8995dbfe71f64a62edff3441fc849a163d1b12dc4bc1233f9f39919b819006394a60a0da1f24336d940ba20117381e7d150d747b52532fd3fad10b50e74a6f10d260d99cda8445fc8b859ee65ec3ad8fb3b8fef93ba2158b2d88dd79271acb362401abd5eff75cd8912e36bf0ee1faaebf5cce67a3058cba1933758e9a1507b48f0865f9052c6a1262741242aa88ef6ea9058b9e303210bec0228dcdbb22794fd73827003fce8b4aa0df8ee1f2d5d318bdbaacfe314d6de069d67f36933a7ce57f1d462dffbefa3baa6fd09aa8fbb6dd2f7199ab1a6f5df723f2b06195d7f6ece6b",
      password: '$2a$10$CWiUS6mo75p6a.0kTRJ5s.FlcqmtsdA4btmff9o3sNNFNHCDYj0Cq',
      userRecordId: ObjectID('5a82afdaca4cce2a889b9808'),
      email: 'user@u.u',
      login: 'user1',
      roles: [],
      phiId: ObjectID('5a82afdaca4cce2a889b9902'),
      piiId: ObjectID('5a82afdaca4cce2a889b9003'),
      ...conditionForActualRecord,
    },
    loginWithUser,
  },
  getMongoConnection,
  setAppAuthOptions,
  stringifyObjectId,
  prepareEnv,
  checkItemSoftDeleted,
  checkRestSuccessfulResponse,
  checkRestErrorResponse,
  setupAppAndGetToken,
  conditionForActualRecord,
  sortByIdDesc,
};
