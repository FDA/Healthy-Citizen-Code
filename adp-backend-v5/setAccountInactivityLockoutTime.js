require('dotenv').load({ path: '.env' });
const minimist = require('minimist');
const ms = require('ms');
const Promise = require('bluebird');
const { MongoClient } = require('mongodb');

const connect = Promise.promisify(MongoClient.connect);

async function mongoConnect(url) {
  return (await connect(url, { useNewUrlParser: true, useUnifiedTopology: true })).db();
}

async function setInactivityLockoutTimeForUsers(db, accountInactivityLockoutTime) {
  const now = new Date();
  const lastLoginAtThreshold = new Date(now.getTime() - accountInactivityLockoutTime);

  // not necessary to include 'lastLoginAt: { $ne: null }' since comparisons with null returns false
  const filter = { accountInactivityLockedAt: null, lastLoginAt: { $lt: lastLoginAtThreshold } };
  const result = await db.collection('users').updateMany(filter, { $set: { accountInactivityLockedAt: now } });
  const count = result.modifiedCount;
  if (count === 0) {
    return console.log(`No users found with ${accountInactivityLockoutTime}ms period of inactivity`);
  }
  console.log(`Set accountInactivityLockedAt '${now.toISOString()}' for ${count} users`);
}

(async () => {
  try {
    const argv = minimist(process.argv.slice(2));
    if (!argv.mongoUrl) {
      return console.error(`Param 'mongoUrl' must be specified.`);
    }

    const accountInactivityLockoutTime = ms(
      argv.accountInactivityLockoutTime || process.env.ACCOUNT_INACTIVITY_LOCKOUT_TIME || '90d'
    );
    if (!accountInactivityLockoutTime) {
      return console.error(
        `Invalid 'accountInactivityLockoutTime' arg or 'ACCOUNT_INACTIVITY_LOCKOUT_TIME' env param. Must be a valid string passed to 'https://www.npmjs.com/package/ms'`
      );
    }

    const db = await mongoConnect(argv.mongoUrl);
    await setInactivityLockoutTimeForUsers(db, accountInactivityLockoutTime);
    process.exit(0);
  } catch (e) {
    console.error(e.stack);
    process.exit(-1);
  }
})();
