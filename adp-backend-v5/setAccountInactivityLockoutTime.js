const Promise = require('bluebird');
const { MongoClient } = require('mongodb');
const { getConfigFromEnv } = require('./config/util');

const connect = Promise.promisify(MongoClient.connect);

async function mongoConnect(url) {
  return (await connect(url, { useNewUrlParser: true, useUnifiedTopology: true })).db();
}

async function setInactivityLockoutTimeForUsers(db, accountInactivityLockoutTime) {
  const now = new Date();
  const lastLoginAtThreshold = new Date(now.getTime() - accountInactivityLockoutTime);

  const filter = {
    $and: [
      { accountInactivityLockedAt: null },
      {
        $or: [
          { lastLoginAt: { $lt: lastLoginAtThreshold } },
          { lastLoginAt: null, createdAt: { $lt: lastLoginAtThreshold } },
        ],
      },
    ],
  };
  const result = await db.collection('users').updateMany(filter, { $set: { accountInactivityLockedAt: now } });
  const count = result.modifiedCount;
  if (count === 0) {
    return console.log(`No users found with ${accountInactivityLockoutTime}ms period of inactivity`);
  }
  console.log(`Set accountInactivityLockedAt '${now.toISOString()}' for ${count} user${count === 1 ? '' : 's'}`);
}

(async () => {
  try {
    require('dotenv').load({ path: '.env' });
    const { config } = getConfigFromEnv();
    const { MONGODB_URI, ACCOUNT_INACTIVITY_LOCKOUT_TIME } = config;

    if (!MONGODB_URI) {
      console.error(`Invalid 'MONGODB_URI' env arg, it must be specified.`);
      return process.exit(-1);
    }
    if (!ACCOUNT_INACTIVITY_LOCKOUT_TIME) {
      console.error(
        `Invalid 'ACCOUNT_INACTIVITY_LOCKOUT_TIME' env arg, it must be a valid string for 'https://www.npmjs.com/package/ms'`
      );
      return process.exit(-1);
    }

    const db = await mongoConnect(MONGODB_URI);
    await setInactivityLockoutTimeForUsers(db, ACCOUNT_INACTIVITY_LOCKOUT_TIME);
    process.exit(0);
  } catch (e) {
    console.error(e.stack);
    process.exit(-1);
  }
})();
