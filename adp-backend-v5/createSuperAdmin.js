const minimist = require('minimist');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const { ObjectId, MongoClient } = require('mongodb');
const Promise = require('bluebird');

const connect = Promise.promisify(MongoClient.connect);

async function mongoConnect(url) {
  return (await connect(url, { useNewUrlParser: true, useUnifiedTopology: true })).db();
}

async function hashPassword(password, bcryptRounds = 10) {
  const salt = await bcrypt.genSalt(bcryptRounds);
  return bcrypt.hash(password, salt);
}

async function getSuperAdminRoleLookup(db) {
  const name = 'SuperAdmin';
  const rolesCollection = 'roles';
  const role = await db.collection(rolesCollection).findOne({ name }, { _id: 1 });
  if (!role) {
    throw new Error(`Unable to find super admin role with name '${name}'`);
  }
  return {
    _id: role._id,
    label: name,
    table: rolesCollection,
  };
}

async function getSuperAdminUser({ db, login, password, email }) {
  const now = new Date();
  const adminId = new ObjectId();
  const [roleLookup, hashedPassword] = await Promise.all([getSuperAdminRoleLookup(db), hashPassword(password)]);

  return {
    _id: adminId,
    deletedAt: new Date(0),
    login,
    email,
    password: hashedPassword,
    creator: {
      _id: adminId,
      table: 'users',
      label: login,
    },
    createdAt: now,
    updatedAt: now,
    roles: [roleLookup],
  };
}

function insertOrUpdateUser(db, user) {
  const insertFields = ['_id', 'createdAt', 'creator'];
  const set = _.omit(user, insertFields);
  const insert = _.pick(user, insertFields);
  return db.collection('users').updateOne({ login: user.login }, { $set: set, $setOnInsert: insert }, { upsert: true });
}

(async () => {
  try {
    const argv = minimist(process.argv.slice(2));
    const { mongoUrl, login, password, email } = argv;
    if (!mongoUrl || !login || !password || !email) {
      return console.error(`All params 'mongoUrl', 'login', 'password', 'email' should be specified.`);
    }
    const db = await mongoConnect(mongoUrl);
    const superAdmin = await getSuperAdminUser({ db, login, password, email });
    const commandResult = await insertOrUpdateUser(db, superAdmin);
    const { nModified, ok } = commandResult.result;
    const operation = nModified === 0 ? 'inserted' : 'updated';
    if (ok === 1) {
      console.info(`Successfully ${operation} SuperAdmin with login '${superAdmin.login}'`);
      return process.exit(0);
    }

    console.error(`Unable to execute operation for SuperAdmin`);
    process.exit(-1);
  } catch (e) {
    console.error(e.stack);
    process.exit(-1);
  }
})();
