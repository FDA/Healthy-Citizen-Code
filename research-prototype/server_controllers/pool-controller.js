// TODO: depreciate this file and folder in favor of custom controllers
/**
 * Implements endpoints of research app methods
 * @returns {{}}
 */

const log = require('log4js').getLogger('research-app-model/pool-controller');
const Promise = require('bluebird');

module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('post', `/add-participants-to-pool`, [appLib.isAuthenticated, m.addParticipantsToPool]);
  };

  m.addParticipantsToPool = async (req, res) => {
    const poolsCollectionName = 'pools';
    const pollParticipantsCollectionName = 'poolParticipants';

    const { name: poolName, participantsFilter } = req.body;
    const { dba, filterParser, appModel } = m.appLib;
    const creator = {
      _id: req.user._id,
      table: 'users',
      label: req.user.login,
    };

    let pool;
    try {
      const poolCollection = m.appLib.db.collection(poolsCollectionName);
      pool = await poolCollection
        .findOne({
          poolName,
          ...dba.getConditionForActualRecord(poolsCollectionName),
        });
      if (!pool) {
        // TODO: add checking user permissions?
        pool = await poolCollection.insertOne({ poolName, creator });
      }
    } catch (e) {
      log.error(`Unable to create a pool`, e.stack);
      return res.json({ success: false, message: `Unable to create a pool` });
    }

    const { conditions } = filterParser.parse(participantsFilter, appModel.models.participants);
    const participantsToAddPromise = m.appLib.db.collection('participants').find(conditions, { _id: 0, guid: 1 }).toArray();
    const existingParticipantsPromise = m.appLib.db.collection(pollParticipantsCollectionName)
      .find({ 'poolId._id': pool._id, ...dba.getConditionForActualRecord(pollParticipantsCollectionName) }, { _id: 0, guid: 1 })
      .toArray();
    const [participantsToAdd, existingParticipants] = await Promise.all([
      participantsToAddPromise,
      existingParticipantsPromise,
    ]);

    const participantsToAddGuids = participantsToAdd.map((p) => p.guid);
    const existingParticipantsGuidsSet = new Set(existingParticipants.map((p) => p.guid));
    const participantsToCreateGuids = participantsToAddGuids.filter((guid) => !existingParticipantsGuidsSet.has(guid));

    const nowDate = new Date();
    const poolParticipants = participantsToCreateGuids.map((pGuid) => ({
      poolId: {
        _id: pool._id,
        label: poolName,
        table: poolsCollectionName,
      },
      guid: pGuid,
      statusCode: 1,
      statusDate: nowDate,
      activeDate: nowDate,
      creator,
    }));

    try {
      await m.appLib.db.collection(pollParticipantsCollectionName).insertMany(poolParticipants);
    } catch (e) {
      log.error(`Unable to create ${pollParticipantsCollectionName}`, e.stack);
      return res.json({
        success: false,
        message: `Unable to create ${pollParticipantsCollectionName}`,
      });
    }

    res.json({ success: true, data: { pool, createdParticipantGuids: participantsToCreateGuids } });
  };

  return m;
};
