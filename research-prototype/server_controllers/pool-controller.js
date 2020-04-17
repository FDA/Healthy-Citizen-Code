// TODO: depreciate this file and folder in favor of custom controllers
/**
 * Implements endpoints of research app methods
 * @returns {{}}
 */

const log = require('log4js').getLogger('research-app-model/pool-controller');

module.exports = function (globalMongoose) {
  const mongoose = globalMongoose;

  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('post', `/add-participants-to-pool`, [appLib.isAuthenticated, m.addParticipantsToPool]);
  };

  m.addParticipantsToPool = async (req, res) => {
    const { name: poolName, participantsFilter } = req.body;
    const { dba, filterParser, appModel } = m.appLib;
    const creator = {
      _id: req.user._id,
      table: 'users',
      label: req.user.login,
    };

    let pool;
    try {
      const poolModel = mongoose.model('pools');
      pool = await poolModel
        .findOne({
          poolName,
          ...dba.getConditionForActualRecord(),
        })
        .lean();
      if (!pool) {
        // TODO: add checking user permissions?
        pool = await poolModel.create({ poolName, creator });
      }
    } catch (e) {
      log.error(`Unable to create a pool`, e.stack);
      return res.json({ success: false, message: `Unable to create a pool` });
    }

    const mongoConditions = filterParser.parse(participantsFilter, appModel.models.participants);
    const participantsToAddPromise = mongoose.model('participants').find(mongoConditions, { _id: 0, guid: 1 }).lean();
    const existingParticipantsPromise = mongoose
      .model('poolParticipants')
      .find({ 'poolId._id': pool._id, ...dba.getConditionForActualRecord() }, { _id: 0, guid: 1 })
      .lean();
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
        table: 'pools',
      },
      guid: pGuid,
      statusCode: 1,
      statusDate: nowDate,
      activeDate: nowDate,
      creator,
    }));

    try {
      await mongoose.model('poolParticipants').create(poolParticipants);
    } catch (e) {
      log.error(`Unable to create poolParticipants`, e.stack);
      return res.json({
        success: false,
        message: `Unable to create poolParticipants`,
      });
    }

    res.json({ success: true, data: { pool, createdParticipantGuids: participantsToCreateGuids } });
  };

  return m;
};
