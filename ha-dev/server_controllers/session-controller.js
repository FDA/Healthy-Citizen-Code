require('dotenv').load({ path: require('path').resolve(__dirname, '../.env') });
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const { ObjectID } = require('mongodb');

const DRUGS_MASTER_COL_NAME = 'drugsMaster';
const RECALLS_OPENFDA_COL_NAME = 'recallsOpenfdaDrugs';
const HC_ALGHORITHMS = ['openfda', 'conceptant'];
const DEFAULT_HC_ALGORITHM = process.env.DEFAULT_HC_ALGORITHM || 'openfda';

const links = {
  openfda: {
    recalls: 'recallsOpenfda',
    adverseEvents: 'aesOpenfda',
    spl: 'drugsOpenfda',
  },
  conceptant: {
    recalls: 'recallsConceptant',
    adverseEvents: 'aesConceptant',
    spl: 'spl',
  },
};

const udidsCollectionName = 'udids';
const profilesCollectionName = 'profiles';

module.exports = () => {
  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    m.log = appLib.getLogger('session-controller');
    appLib.addRoute('get', `/register-udid/:udid`, [appLib.isAuthenticated, m.registerUdid]);
    appLib.addRoute('get', `/start-session/:udid/session.png`, [
      appLib.isAuthenticated,
      m.startSession,
    ]);
    appLib.addRoute('get', `/load-session/:profile/profile.png`, [
      appLib.isAuthenticated,
      m.loadSession,
    ]);
    appLib.addRoute('get', `/profiles`, [m.appLib.isAuthenticated, m.getStuff]);
    appLib.addRoute('get', `/devices`, [m.appLib.isAuthenticated, m.getStuff]);
    appLib.addRoute('get', `/drugsMaster`, [m.appLib.isAuthenticated, m.getStuff]);
    appLib.addRoute('get', `/drugNdcs/:profileId`, [m.appLib.isAuthenticated, m.getDrugNdcs]);
    appLib.addRoute('get', `/drugNdc/:drugId`, [m.appLib.isAuthenticated, m.getDrugNdcByDrugId]);
    appLib.addRoute('get', `/icdcodes`, [m.appLib.isAuthenticated, m.getStuff]);
    appLib.addRoute('get', `/notifications`, [m.appLib.isAuthenticated, m.getStuff]);
    appLib.addRoute('post', `/notifications/:id`, [m.appLib.isAuthenticated, m.postNotification]);
    appLib.addRoute('put', `/notifications/:id`, [m.appLib.isAuthenticated, m.putNotification]);
    // appLib.addRoute('del', `/notification`, [m.appLib.isAuthenticated, m.deleteNotification]);
    appLib.addRoute('get', `/recalculate-notifications-counts/:profileId`, [
      m.appLib.isAuthenticated,
      m.updateProfileNotificationInfo,
    ]);
    appLib.addRoute('get', `/recalls-for-drug/:drugId`, [
      m.appLib.isAuthenticated,
      m.recallsForDrug,
    ]);
    appLib.addRoute('get', `/adverse-events-for-drug/:drugId`, [
      m.appLib.isAuthenticated,
      m.adverseEventsForDrug,
    ]);
    appLib.addRoute('get', `/adverse-events-for-rxcui`, [
      m.appLib.isAuthenticated,
      m.adverseEventsForRxcui,
    ]);
    appLib.addRoute('get', `/spl-for-drug/:drugId`, [m.appLib.isAuthenticated, m.splForDrug]);
  };

  // This endpoint need to be protected by a firewall allowing only registered PAGs to register UDIDs
  m.registerUdid = async (req, res, next) => {
    const udid = _.get(req, 'params.udid');

    try {
      const r = await m.appLib.db.collection(udidsCollectionName).findOne({ udid });
      if (r) {
        throw 'This UDID is already registered';
      }
      await m.appLib.dba.createItem(udidsCollectionName, { action: 'create' }, { udid });
      res.json({ success: true, message: `UDID '${udid}' has been registered` });
    } catch (e) {
      m.log.error(`Error while registering a UDID: '${e}'`);
      res.json({ success: false, message: `An error occurred` });
    }
  };

  m.getStuff = async (req, res, next) => {
    const udid = _.get(
      req.headers.referer.match(/[?&]udid=([a-zA-Z0-9]{11,})/),
      '1',
      req.session.udid
    ); // do not allow udids shorter than 12 characters for security reasons
    const profileId = _.get(req.headers.referer.match(/[?&]profile=([a-zA-Z0-9]{11,})/), '1');
    // TODO: discuss with the privacy office if we're allowed to store both the udid and the source IP

    try {
      const r = await m.appLib.db.collection(udidsCollectionName).findOne({ udid });

      if (!r) {
        throw new Error(`UDID is not registered: ${udid}`);
      }

      req.session.udid = udid;
      const profile = await m.appLib.db
        .collection(profilesCollectionName)
        .findOne({ _id: ObjectID(profileId) });
      if (profile) {
        const sesProfile = req.session.profile;
        sesProfile.id = profileId;
        sesProfile.devices = _.get(profile, 'devices', []).map((d) => ObjectID(d.device._id));
        sesProfile.drugs = _.get(profile, 'drugs', []).map((d) => ObjectID(d.drug._id));
        sesProfile.icdcodes = _.get(profile, 'diagnoses', []).map((d) =>
          ObjectID(d.diagnosis[d.diagnosis.length - 1]._id)
        );
      } else {
        req.session.profile = {};
      }

      m.appLib.controllers.main.getItems(req, res, next);
    } catch (e) {
      m.log.error(`Error while getting stuff`, e.stack);
      res.json({ success: false, message: `An error occurred` });
    }
  };

  m.startSession = async (req, res) => {
    const udid = _.get(req, 'params.udid');
    // TODO: do not allow udids shorter than 12 characters for security reasons
    // TODO: discuss with the privacy office if we're allowed to store both the udid and the source IP
    if (!udid || udid.length <= 12) {
      m.log.warn(`UDID is incorrectly formatted: '${udid}'`);
      return res.json({ success: false, message: `Incorrect deidentified ID` });
    }

    try {
      const r = await m.appLib.db.collection(udidsCollectionName).findOne({ udid });
      if (!r) {
        throw `UDID is not registered: ${udid}`;
      }

      req.session.udid = udid;
      const file = await fs.readFile('../ha-dev/public/img/1x1.png').catch((err) => {
        m.log.error(`Error while reading 1x1 file: '${err}'`);
        res.writeHead(500);
        res.end();
      });
      // res.writeHead(200);
      res.setHeader('Content-Type', 'image/png');
      res.end(file, 'binary');
      // res.end();
    } catch (e) {
      m.log.error(`Error while starting a session`, e.stack);
      res.json({ success: false, message: `An error occurred while starting a session` });
    }
  };

  m.loadSession = async (req, res) => {
    const profileId = _.get(req, 'params.profile');
    // TODO: also check the UDID
    // TODO: do not allow udids shorter than 12 characters for security reasons
    // TODO: discuss with the privacy office if we're allowed to store both the udid and the source IP
    /*
    if (!udid || udid.length <= 12) {
      m.log.warn(`UDID is incorrectly formatted: '${udid}'`);
      return res.json({ success: false, message: `Incorrect deidentified ID` });
    }
     */

    try {
      const profile = await m.appLib.db
        .collection(profilesCollectionName)
        .findOne({ _id: ObjectID(profileId) });

      if (!profile) {
        throw `Profile not found: ${profileId}`;
      }
      if (!req.session.profile) {
        req.session.profile = {};
      }
      const sesProfile = req.session.profile;
      sesProfile.id = profileId;
      sesProfile.devices = _.get(profile, 'devices', []).map((d) => ObjectID(d.device._id));
      sesProfile.drugs = _.get(profile, 'drugs', []).map((d) => ObjectID(d.drug._id));
      sesProfile.icdcodes = _.get(profile, 'diagnoses', []).map(
        (d) => ObjectID(d.diagnosis[d.diagnosis.length - 1]._id)
      );

      //req.session.udid = udid;
      const file = await fs.readFile('../ha-dev/public/img/1x1.png').catch((err) => {
        m.log.error(`Error while reading 1x1 file: '${err}'`);
        res.writeHead(500);
        res.end();
      });
      // res.writeHead(200);
      res.setHeader('Content-Type', 'image/png');
      res.end(file, 'binary');
      // res.end();
    } catch (e) {
      m.log.error(`Error while loading the session`, e.stack);
      res.json({ success: false, message: `An error occurred while loading a session` });
    }
  };

  function getDrugInfo(drug) {
    return { ndc11: drug.packageNdc11, brandName: drug.name };
  }

  m.getDrugNdcByDrugId = async function (req, res) {
    const { drugId } = req.params;
    if (!ObjectID.isValid(drugId)) {
      return res.json({ success: false, message: `Invalid drugId: ${drugId}` });
    }

    try {
      const drug = await m.appLib.db
        .collection(DRUGS_MASTER_COL_NAME)
        .findOne({ _id: ObjectID(drugId) }, { packageNdc11: 1, name: 1 });

      if (!drug) {
        return res.json({ success: false, message: `Not found drug with id: ${drugId}` });
      }
      return res.json({ success: true, data: getDrugInfo(drug) });
    } catch (e) {
      m.log.error(`Error while getting drug:`, e.stack);
      res.json({ success: false, message: `Error while getting drug` });
    }
  };

  m.getDrugNdcs = async function (req, res) {
    const { profileId } = req.params;
    if (!ObjectID.isValid(profileId)) {
      return res.json({ success: false, message: `Invalid profileId: ${profileId}` });
    }

    try {
      const profile = await m.appLib.db
        .collection(profilesCollectionName)
        .findOne({ _id: ObjectID(profileId) });

      if (!profile) {
        const message = `Unable to find a profile by id: ${profileId}`;
        m.log.error(message);
        return res.json({ success: false, message });
      }

      const drugIds = _.get(profile, 'drugs', []).map((d) => ObjectID(d.drug._id));
      const drugs = await m.appLib.db
        .collection(DRUGS_MASTER_COL_NAME)
        .find({ _id: { $in: drugIds } }, { packageNdc11: 1, name: 1 })
        .toArray();
      const data = drugs.map((drug) => getDrugInfo(drug));
      return res.json({ success: true, data });
    } catch (e) {
      m.log.error(`Error while getting drugs:`, e.stack);
      res.json({ success: false, message: `Error while getting drugs` });
    }
  };

  /*
  m.getProfiles = (req, res, next) => {
    let udid = _.get(req.headers.referer.match(/[\?&]udid=([a-zA-Z0-9]{11,})/), '1');
    //let udid = _.get(req, "params.udid");
    if (udid) {
      // TODO: do not allow udids shorter than 12 characters for security reasons
      // TODO: discuss with the privacy office if we're allowed to store both the udid and the source IP
      m.appLib.db
        .model('udids')
        .findOne({ udid: udid })
        .exec() // check if the UDID is registered, may need to remove this in the future
        .then(r => {
          if (r) {
            return r;
          } else {
            throw `UDID is not registered: ${udid}`;
          }
        })
        .then(() => {
          req.session.udid = udid;
          return m.appLib.controllers.main.getItems(req, res, next);
        })
        .catch(e => {
          m.log.error(`Error while starting a session: '${e}'`);
          res.json({ success: false, message: `An error occured` });
        });
    } else {
      m.log.warn(`UDID is incorrect: '${udid}'`);
      res.json({ success: false, message: `Incorrect deidentified ID` });
    }
  };
*/

  async function updateNotificationInfoForProfile(profileId) {
    const notificationCol = m.appLib.db.collection('notifications');
    const profilesCol = m.appLib.db.collection(profilesCollectionName);
    const [numNotifications, numNewNotifications] = await Promise.all([
      notificationCol.countDocuments({ profileId }),
      notificationCol.countDocuments({ profileId, new: true }),
    ]);

    await profilesCol.update(
      { _id: ObjectID(profileId) },
      { $set: { numNewNotifications, numNotifications } }
    );
    await m.appLib.cache.clearCacheForModel(profilesCollectionName);
  }

  function decorateResJson(res, decorateFunc) {
    const originalJson = res.json;
    res.json = function (data) {
      /* eslint-disable-next-line */
      originalJson.apply(res, arguments);
      decorateFunc(data);
    };
  }

  function afterNotificationAction(req, res, json) {
    if (res.statusCode === 200 && json.success === true) {
      // invoke update only on successful action
      const { profileId } = req.body.data; // works for post/put requests
      return updateNotificationInfoForProfile(profileId);
    }
  }
  m.postNotification = (req, res, next) => {
    decorateResJson(res, afterNotificationAction.bind(null, req, res));
    return m.appLib.controllers.main.postItem(req, res, next);
  };

  m.putNotification = (req, res, next) => {
    decorateResJson(res, afterNotificationAction.bind(null, req, res));
    return m.appLib.controllers.main.putItem(req, res, next);
  };

  // m.deleteNotification = (req, res, next) => {
  //   decorateResJson(res, afterNotificationAction.bind(req, res));
  //   return m.appLib.controllers.main.deleteItem(req, res, next);
  // };

  m.updateProfileNotificationInfo = async (req, res) => {
    const { profileId } = req.params;
    if (!ObjectID.isValid(profileId)) {
      return res.json({ success: false, message: `Invalid profileId: ${profileId}` });
    }

    try {
      await updateNotificationInfoForProfile(profileId);
      res.json({ success: true });
    } catch (e) {
      const message = `Error while updating notification info for profile ${profileId}`;
      m.log.error(message, e.stack);
      res.json({ success: false, message });
    }
  };

  function getHcAlghorithm(req) {
    const { type } = req.query;
    if (HC_ALGHORITHMS.includes(type)) {
      return type;
    }
    if (HC_ALGHORITHMS.includes(DEFAULT_HC_ALGORITHM)) {
      return DEFAULT_HC_ALGORITHM;
    }
    throw new Error('Invalid configuration for DEFAULT_HC_ALGORITHM');
  }

  m.recallsForDrug = async (req, res) => {
    const { drugId } = req.params;
    try {
      const drug = await m.appLib.db
        .collection(DRUGS_MASTER_COL_NAME)
        .findOne({ _id: ObjectID(drugId) });

      if (!drug) {
        throw new Error(`Unable to find drug by id '${drugId}'`);
      }

      const field = links[getHcAlghorithm(req)].recalls;
      const lookups = _.get(drug, `links.${field}`, []);
      if (!lookups.length) {
        return res.json({ success: true, data: [] });
      }

      const { table } = lookups[0];
      const recalls = await m.appLib.db
        .collection(table)
        .find({ _id: { $in: lookups.map((l) => l._id) } }, { rawData: 0 })
        .toArray();
      res.json({ success: true, data: recalls });
    } catch (e) {
      const message = `Error while getting recalls for drug ${drugId}`;
      m.log.error(message, e.stack);
      res.json({ success: false, message });
    }
  };

  m.adverseEventsForDrug = async (req, res) => {
    const { drugId } = req.params;
    let { gender, ageFrom, ageTo } = req.query;
    ageFrom = +ageFrom || 0;
    ageTo = +ageTo || 200;

    try {
      const drug = await m.appLib.db
        .collection(DRUGS_MASTER_COL_NAME)
        .findOne({ _id: ObjectID(drugId) });

      if (!drug) {
        throw new Error(`Unable to find drug by id '${drugId}'`);
      }

      const field = links[getHcAlghorithm(req)].adverseEvents;
      const lookups = _.get(drug, `links.${field}`, []);
      if (!lookups.length) {
        return res.json({ success: true, data: [] });
      }
      const andCondition = [{ _id: { $in: lookups.map((l) => l._id) } }];
      if (ageFrom || ageTo) {
        andCondition.push({ patientOnSetAge: { $gte: ageFrom, $lte: ageTo } });
        andCondition.push({ patientOnSetAgeUnit: '801' });
      }
      if (gender) {
        andCondition.push({ patientSex: gender });
      }

      const { table } = lookups[0];
      const adverseEvents = await m.appLib.db
        .collection(table)
        .find({ $and: andCondition }, { rawData: 0 })
        .toArray();
      res.json({ success: true, data: adverseEvents });
    } catch (e) {
      const message = `Error while getting adverse events for drug ${drugId}`;
      m.log.error(message, e.stack);
      res.json({ success: false, message });
    }
  };

  async function getAdverseEventsForRxcuiConceptant(rxcui) {
    const field = links.conceptant.recalls;
    const linksPath = `links.${field}`;

    const data = {};
    const rxcuis = _.castArray(rxcui).filter((r) => r);
    _.each(rxcuis, (singleRxcui) => {
      data[singleRxcui] = [];
    });

    const drugs = await m.appLib.db
      .collection(DRUGS_MASTER_COL_NAME)
      .find(
        { rxnormCui: { $in: rxcuis }, [linksPath]: { $ne: null } },
        { name: 1, packageNdc11: 1, rxnormCui: 1, [linksPath]: 1 }
      )
      .toArray();

    await Promise.map(drugs, async (drug) => {
      const lookups = _.get(drug, linksPath);
      const { table } = lookups[0];
      const recalls = await m.appLib.db
        .collection(table)
        .find({ _id: { $in: lookups.map((l) => l._id) } }, { rawData: 0 })
        .toArray();

      data[drug.rxnormCui].push({
        name: drug.name,
        packageNdc11: drug.packageNdc11,
        recalls,
      });
    });

    return data;
  }

  async function getAdverseEventsForRxcuiOpenfda(rxcui) {
    const data = {};

    const rxcuis = _.castArray(rxcui).filter((r) => r);
    await Promise.map(rxcuis, async (singleRxcui) => {
      const openfdaRecalls = await m.appLib.db
        .collection(RECALLS_OPENFDA_COL_NAME)
        .find({ 'rxCuis.rxCui': singleRxcui }, { rawData: 0 })
        .toArray();
      data[singleRxcui] = openfdaRecalls;
    });

    return data;
  }

  m.adverseEventsForRxcui = async (req, res) => {
    const { rxcui } = req.query;
    const getAEs =
      getHcAlghorithm(req) === 'conceptant'
        ? getAdverseEventsForRxcuiConceptant
        : getAdverseEventsForRxcuiOpenfda;

    try {
      const data = await getAEs(rxcui);
      res.json({ success: true, data });
    } catch (e) {
      const message = `Error while getting recalls for rxcui: ${rxcui}`;
      m.log.error(message, e.stack);
      res.json({ success: false, message });
    }
  };

  m.splForDrug = async (req, res) => {
    const { drugId } = req.params;

    try {
      const drug = await m.appLib.db
        .collection(DRUGS_MASTER_COL_NAME)
        .findOne({ _id: ObjectID(drugId) });

      if (!drug) {
        throw new Error(`Unable to find drug by id '${drugId}'`);
      }

      const field = links[getHcAlghorithm(req)].spl;
      const lookups = _.get(drug, `links.${field}`, []);
      if (!lookups.length) {
        return res.json({ success: true, data: [] });
      }

      const { table } = lookups[0];
      const splData = await m.appLib.db
        .collection(table)
        .find({ _id: { $in: lookups.map((l) => l._id) } }, { rawData: 0 })
        .toArray();
      res.json({ success: true, data: splData });
    } catch (e) {
      const message = `Error while getting SPL data for drug ${drugId}`;
      m.log.error(message, e.stack);
      res.json({ success: false, message });
    }
  };

  return m;
};
