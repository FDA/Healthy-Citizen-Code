const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');
const { conditionForActualRecord } =  require('../util/mongo');

const { mongoUrl, medWatchCollectionName, notificationsCollectionName, profilesCollectionName } = args;

if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

function createIndexes(indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(notificationsCollectionName).createIndex({ [fieldName]: 1 })
  );
}

async function addNotifications(dbCon) {
  const profileCursor = await dbCon.collection(profilesCollectionName).find();
  while (await profileCursor.hasNext()) {
    const profile = await profileCursor.next();
    await addNotificationsToProfile(profile, dbCon);
  }
}

async function updateNotificationInfoForProfile(dbCon, profileId) {
  const profileStr = profileId.toString();
  const [numNotifications, numNewNotifications] = await Promise.all([
    dbCon.collection(notificationsCollectionName).count({ profileId: profileStr }),
    dbCon.collection(notificationsCollectionName).count({ profileId: profileStr, new: true }),
  ]);
  await setUpdateAtIfRecordChanged(
    dbCon.collection(profilesCollectionName), 'updateOne',
    { _id: profileId },
    { $set: { numNewNotifications, numNotifications } }
  );
  console.log(
    `Updated numNotifications:${numNotifications}, numNewNotifications:${numNewNotifications} for profile id '${profileStr}'`
  );
}

async function addNotificationsToProfile(profile, dbCon) {
  const { udid, _id: profileId } = profile;
  // TODO: should notifications be retrieved only from 'RSS' or from 'Alert Page' as well? (add filter on 'docSource')
  const profileStr = profileId.toString();
  const profileNotifications = await dbCon
    .collection(notificationsCollectionName)
    .find({ profileId: profileStr }, { projection: { notificationId: 1 } })
    .toArray();
  const profileNotificationIds = profileNotifications.map(n => n.notificationId);

  const newAlertsForProfile = await dbCon
    .collection(medWatchCollectionName)
    .find({ _id: { $nin: profileNotificationIds } })
    .toArray();

  if (!newAlertsForProfile.length) {
    console.log(`No new notifications for profile with id '${profileStr}'`);
    return updateNotificationInfoForProfile(dbCon, profileId);
  }

  const newNotificationsForProfile = newAlertsForProfile.map(alert => {
    const body =
      `<p><b>ISSUE</b>: ${alert.issue}</p>` +
      `<p><b>BACKGROUND</b>: ${alert.background}</p>` +
      `<p><b>RECOMMENDATION</b>: ${alert.recommendation}</p>`;
    return {
      ...conditionForActualRecord,
      from: 'MedWatch',
      subject: alert.productName,
      body,
      tags: ['MedWatch'],
      udid,
      profileId: profileStr,
      notificationId: alert._id,
      createdAt: new Date(),
      updatedAt: new Date(),
      new: true,
    };
  });

  await dbCon.collection(notificationsCollectionName).insertMany(newNotificationsForProfile);
  console.log(`Added ${newNotificationsForProfile.length} notifications to profile with id '${profileStr}'`);
  await updateNotificationInfoForProfile(dbCon, profileId);
}

(async () => {
  let dbCon;
  try {
    dbCon = await mongoConnect(mongoUrl);
    const indexFieldNames = ['profileId'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);

    await addNotifications(dbCon);
    console.log(`Done adding notifications`);
    process.exit(0);
  } catch (e) {
    console.log(`Unable to get connection by url '${mongoUrl}'`, e.stack);
    process.exit(1);
  }
})();
