const assert = require('assert');
const _ = require('lodash');
const request = require('supertest');
const { ObjectID } = require('mongodb');
const reqlib = require('app-root-path').require;

const { generateObjectId } = reqlib('/lib/backend-util');

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
        res.different = res.different.concat(
          _.map(deeper.different, subPath => `${key}.${subPath}`)
        );

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
    const isSyntesizedDateField = path.endsWith('updatedAt') || path.endsWith('createdAt');
    const isActionsFields = path === '_actions';
    assert(isSyntesizedDateField || isActionsFields);
    if (isSyntesizedDateField) {
      const synthesizedDate = _.get(data, path);
      assert(isDateString(synthesizedDate));
    }
  });
  assert(objDiff.different.length === 0);
  assert(objDiff.missing_from_first.length === 0);
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
};
const sampleDataToCompare2 = _.cloneDeep(sampleData2);
fixObjectId(sampleDataToCompare2);

// this data will be used for post, it won't be in the database
const sampleData0 = {
  _id: ObjectID('587179f6ef4807703afd0dfd'),
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
};
const sampleDataToCompare0 = _.cloneDeep(sampleData0);
fixObjectId(sampleDataToCompare0);

// auth
const admin = {
  _id: ObjectID('5a82afdaca4cce2a889b9808'),
  // "salt": "a74f0a5de5a9bf9a022b45e8c56eb04d47b1d7825eec67379294f775e33fca69",
  // "password": "3c2d3ea61ed8baffeaf54eb0afc78b1ee87786e7532c98163ca1e23ca53f0a35ff05961bcffe963c0cd9d42105c02e2d1d281773e9e09e57449796181801f86236c898bb4afafdf6d56c67776cfaa7a17e49411043091ff1fd45d7e988261776f9c060a8c26dcc1d3d134123214e578f90ce40a45754346efe7246b32e547312863760ea61bfeccc989ecefac9748a4f2b19649d666a413eaf1ad2c055cc55f7ef235b52ba55569577a6fb60bae006080940a6d7aa322f5698088be2f5a4ea7e82a803b6e50ee36dc0c699d736ebf95ab16151aa7581dec3aa2c201e74f966e3c0f59301dbc22a8d1471b1c343d6210af45b2a5f0e4c2c7c0be13c6775d0e419dd04382a1dcb8b748279290e695d272343a77fd5832cb87b14d18ce63380d8995dbfe71f64a62edff3441fc849a163d1b12dc4bc1233f9f39919b819006394a60a0da1f24336d940ba20117381e7d150d747b52532fd3fad10b50e74a6f10d260d99cda8445fc8b859ee65ec3ad8fb3b8fef93ba2158b2d88dd79271acb362401abd5eff75cd8912e36bf0ee1faaebf5cce67a3058cba1933758e9a1507b48f0865f9052c6a1262741242aa88ef6ea9058b9e303210bec0228dcdbb22794fd73827003fce8b4aa0df8ee1f2d5d318bdbaacfe314d6de069d67f36933a7ce57f1d462dffbefa3baa6fd09aa8fbb6dd2f7199ab1a6f5df723f2b06195d7f6ece6b",
  password:
    'd0c088dc452d916b67cef2a1cd201757dea29d4cda978aaead1739c0f28397fa40845fa1f2e561564efe0f1ee88f574199a6ad7f43ba6f0ce62156ee1f0d57d9947e47dac815b0007429b63ca3cd7f43065f909e3f7755a65650d3083f7b4b221f562d41a78cf0ba449c7994cf54e3a33d679d39d61e8d01cbee125240f9d5d562911455427512f1370f0dcd38d58ba5bf822405281b7ad3383953e064676b7876170faeccea0a9c6865f40b979fd886fda4c0fdf44a99c17a32ffc3b4c7b795ffd8e5d5ee2cca5c17c9964fd274e17307a3e9de7c1b9a4cf106a1a7ed30257e2d71cef0f5df27d8addf51ef3511575e3c32917ea1440f5139cb7c20905c67231d1b8b94c1d2cae74fddb85ca7e27a895503c24a1176ca16d9bbe60c0357575ee591e9de4ca1fff73229d18b06495eaeb53bbc0c58870308ad356001fdb7eb090bc12f8c450a8356a9d7dd54f8b646a5ca11abf990e9646afb119b1bd70ca1c3d1917909bc66e4b6f4ad54d5db78f4d0017e7b442b67ce309cee14cf655bf29b74a8ccede73a126ed999a41659ab8552604f9c566be97e76b63ec046aa7271de8ef205189e141fb8405f8e8c3dfd14e3a8ee61e50380bb784d9142e0163b6bdc88755f04eb5440d288dc2979ca1a1efa15d51ae132c1774c08890b6097001a19247c790d2815533eb20e38fe70e85a6ce070e54fe78430102bce633e1014244a',
  salt: '44178e6f4bac73f1c98666c88c47e51a530357407df7523560deaab49bcec0d1',
  userRecordId: ObjectID('5a82afdaca4cce2a889b9807'),
  email: 'admin@a.a',
  login: 'admin',
  roles: ['SuperAdmin'],
  phiId: ObjectID('5a82afdaca4cce2a889b9900'),
  piiId: ObjectID('5a82afdaca4cce2a889b9001'),
};

// Note that this one is augmented by typeDefaults.json
const expected = {
  type: 'Schema',
  fullName: 'model1s',
  limitReturnedRecords: 1,
  defaultSortBy: {
    _id: -1,
  },
  actions: {
    width: 100,
    responsivePriority: 50,
    fields: {
      update: {
        backgroundColor: '#4CAF50',
        description: 'Update record',
        borderColor: '#388E3C',
        textColor: 'white',
        icon: {
          link: 'pencil',
        },
        action: {
          type: 'action',
          link: 'update',
        },
      },
      delete: {
        backgroundColor: '#F44336',
        borderColor: '#f32c1e',
        textColor: 'white',
        description: 'Delete record',
        icon: {
          link: 'trash-o',
        },
        action: {
          type: 'action',
          link: 'delete',
        },
      },
      clone: {
        backgroundColor: '#4CAF50',
        borderColor: '#388E3C',
        textColor: 'white',
        description: 'Clone record',
        icon: {
          link: 'clone',
        },
        action: {
          type: 'action',
          link: 'clone',
        },
      },
      viewDetails: {
        backgroundColor: '#2196F3',
        borderColor: '#0c7cd5',
        textColor: 'white',
        description: 'View record details',
        icon: {
          link: 'eye',
        },
        action: {
          type: 'action',
          link: 'viewDetails',
        },
      },
      view: {
        showInTable: false,
      },
      create: {
        showInTable: false,
      },
    },
  },
  fields: {
    creator: {
      type: 'ObjectID',
      fullName: 'creator',
      visible: false,
      synthesize: ['creator'],
      width: 120,
      visibilityPriority: 100,
      responsivePriority: 100,
    },
    createdAt: {
      type: 'Date',
      fullName: 'createdAt',
      visible: false,
      synthesize: ['createdAt'],
      width: 85,
      visibilityPriority: 100,
      responsivePriority: 100,
    },
    updatedAt: {
      type: 'Date',
      fullName: 'updatedAt',
      visible: false,
      synthesize: ['updatedAt'],
      width: 85,
      visibilityPriority: 100,
      responsivePriority: 100,
    },
    deletedAt: {
      type: 'Date',
      fullName: 'deletedAt',
      visible: false,
      width: 85,
      visibilityPriority: 100,
      responsivePriority: 100,
    },
    created: {
      type: 'Date',
      visible: false,
      generated: true,
      fullName: 'Updated',
      description: 'Date when the record was last created',
    },
    updated: {
      type: 'Date',
      visible: false,
      generated: true,
      fullName: 'Updated',
      description: 'Date when the record was last updated',
    },
    deleted: {
      type: 'Date',
      visible: false,
      generated: true,
      fullName: 'Deleted',
      description: 'Date when the record was deleted',
    },
  },
};

const loginWithUser = function(appLib, user) {
  return request(appLib.app)
    .post('/login')
    .send({
      login: user.login,
      password: 'Password!1',
    })
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .then(res => {
      res.statusCode.should.equal(200);
      res.body.success.should.equal(true);
      return res.body.data.token;
    });
};

const user = {
  _id: ObjectID('5a82afdaca4cce2a889b9809'),
  // "salt": "a74f0a5de5a9bf9a022b45e8c56eb04d47b1d7825eec67379294f775e33fca69",
  // "password": "3c2d3ea61ed8baffeaf54eb0afc78b1ee87786e7532c98163ca1e23ca53f0a35ff05961bcffe963c0cd9d42105c02e2d1d281773e9e09e57449796181801f86236c898bb4afafdf6d56c67776cfaa7a17e49411043091ff1fd45d7e988261776f9c060a8c26dcc1d3d134123214e578f90ce40a45754346efe7246b32e547312863760ea61bfeccc989ecefac9748a4f2b19649d666a413eaf1ad2c055cc55f7ef235b52ba55569577a6fb60bae006080940a6d7aa322f5698088be2f5a4ea7e82a803b6e50ee36dc0c699d736ebf95ab16151aa7581dec3aa2c201e74f966e3c0f59301dbc22a8d1471b1c343d6210af45b2a5f0e4c2c7c0be13c6775d0e419dd04382a1dcb8b748279290e695d272343a77fd5832cb87b14d18ce63380d8995dbfe71f64a62edff3441fc849a163d1b12dc4bc1233f9f39919b819006394a60a0da1f24336d940ba20117381e7d150d747b52532fd3fad10b50e74a6f10d260d99cda8445fc8b859ee65ec3ad8fb3b8fef93ba2158b2d88dd79271acb362401abd5eff75cd8912e36bf0ee1faaebf5cce67a3058cba1933758e9a1507b48f0865f9052c6a1262741242aa88ef6ea9058b9e303210bec0228dcdbb22794fd73827003fce8b4aa0df8ee1f2d5d318bdbaacfe314d6de069d67f36933a7ce57f1d462dffbefa3baa6fd09aa8fbb6dd2f7199ab1a6f5df723f2b06195d7f6ece6b",
  password:
    'e406bcce2a8f059076da6d929bfd6a6a1864e22be60e09091065cfae7b2a792fd38ff7607bd77f8fd7c9072e88975e8f2e7cbc2fcf5ad2468d76729eba3616f0568a1b80ee8a1e5a6c82f77a7abe8e1dce442646b4334edec15217330dd6bd0646dd1ed1167e7f57f09cd3bd1b052e9460664e80a7e0fe55b6da230e14c0c8f44e12d0e60ec511ab0110b5973e5955d3ca10051b1b6a604e02465f17ff2feaf50ca119032ffa91ed25836a84529de5e156e0785eb59fe1bb39bebd5e8b7f99dce4770819b0284d92f0da78b12c47a77cd91cf92dd18b4f2440a26867bf0edb87849f111169f5d9d3af2925264642f7da16633c65ec7f117ecc62962c1b5b95a52837d23de775d45f130210d3e50f29d57fde3be0dc01c1769b0838580ddc4cabe4bded8a9bf2bf8efe9c438b9171642483775596bb98d14402d789bec4a777fd7506c67e3fcd93c4ed66263e731303a420c2c1b978f76b7fcb4aa5d89c4d7b82d971a19efac9e18a74803cc705d29ef120b771d1a4bf25aeda0efd1d6b23f652879fad87ea4922c7f99f66c3a41b0a826118316ba588d8f35a6669225d7ecf7b7b697fb24dd98a6dbad431232179116b71b30f3147f472b3a31ff5938b73a2c69f5a8376f7909c52928d98f4df2282b373678432056b8fcdd49c663181d833d8e53c12ec174bf7b6004f36a491600209bcca3f2dec7d2a70edb3288a39291b9c',
  salt: '9d51e6c8c533ca69a9e74ef439bf7fb4a4ca68a758f3bf5fc08aa14a340e190b',
  userRecordId: ObjectID('5a82afdaca4cce2a889b9808'),
  email: 'user@u.u',
  login: 'user1',
  roles: [],
  phiId: ObjectID('5a82afdaca4cce2a889b9902'),
  piiId: ObjectID('5a82afdaca4cce2a889b9003'),
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
    expected,
  },
  auth: {
    admin,
    user,
    loginWithUser,
  },
};
