require('dotenv').load({ path: require('path').resolve(__dirname, '../.env') });
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const log = require('log4js').getLogger('session-controller');
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

module.exports = () => {
  const m = {};

  m.init = appLib => {
    m.appLib = appLib;
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
  m.registerUdid = (req, res, next) => {
    const udid = _.get(req, 'params.udid');
    m.appLib.db
      .model('udids')
      .findOne({ udid })
      .exec()
      .then(r => {
        if (r) {
          throw 'This UDID is already registered';
        }
      })
      .then(() => m.appLib.dba.createItem(m.appLib.db.model('udids'), null, { udid }))
      .then(() => {
        res.json({ success: true, message: `UDID '${udid}' has been registered` });
      })
      .catch(e => {
        log.error(`Error while registering a UDID: '${e}'`);
        res.json({ success: false, message: `An error occurred` });
      });
  };

  m.getStuff = (req, res, next) => {
    const udid = _.get(
      req.headers.referer.match(/[?&]udid=([a-zA-Z0-9]{11,})/),
      '1',
      req.session.udid
    ); // do not allow udids shorter than 12 characters for security reasons
    const profileId = _.get(req.headers.referer.match(/[?&]profile=([a-zA-Z0-9]{11,})/), '1');
    // TODO: discuss with the privacy office if we're allowed to store both the udid and the source IP
    m.appLib.db
      .model('udids')
      .findOne({ udid })
      .lean()
      .exec() // check if the UDID is registered, may need to remove this in the future
      .then(r => {
        if (r) {
          req.session.udid = udid;
          return;
        }
        throw new Error(`UDID is not registered: ${udid}`);
      })
      .then(() =>
        m.appLib.db
          .model('profiles')
          .findOne({ _id: new ObjectID(profileId) })
          .lean()
          .exec()
      )
      .then(profile => {
        if (profile) {
          const sesProfile = req.session.profile;
          sesProfile.id = profileId;
          sesProfile.devices = _.get(profile, 'devices', []).map(d => new ObjectID(d.device._id));
          sesProfile.drugs = _.get(profile, 'drugs', []).map(d => new ObjectID(d.drug._id));
          sesProfile.icdcodes = _.get(profile, 'diagnoses', []).map(
            d => new ObjectID(d.diagnosis[d.diagnosis.length-1]._id)
          );
        } else {
          req.session.profile = {};
        }
      })
      .then(() => m.appLib.controllers.main.getItems(req, res, next))
      .catch(e => {
        log.error(`Error while getting stuff`, e.stack);
        res.json({ success: false, message: `An error occurred` });
      });
  };

  m.startSession = (req, res) => {
    const udid = _.get(req, 'params.udid');
    // TODO: do not allow udids shorter than 12 characters for security reasons
    // TODO: discuss with the privacy office if we're allowed to store both the udid and the source IP
    if (!udid || udid.length <= 12) {
      log.warn(`UDID is incorrectly formatted: '${udid}'`);
      return res.json({ success: false, message: `Incorrect deidentified ID` });
    }

    m.appLib.db
      .model('udids')
      .findOne({ udid })
      .exec()
      .then(r => {
        if (!r) {
          throw `UDID is not registered: ${udid}`;
        }
      })
      .then(() => {
        req.session.udid = udid;
        return fs.readFile('../ha-dev/public/img/1x1.png').catch(err => {
          log.error(`Error while reading 1x1 file: '${err}'`);
          res.writeHead(500);
          res.end();
        });
      })
      .then(file => {
        // res.writeHead(200);
        res.setHeader('Content-Type', 'image/png');
        res.end(file, 'binary');
        // res.end();
      })
      .catch(e => {
        log.error(`Error while starting a session`, e.stack);
        res.json({ success: false, message: `An error occurred while starting a session` });
      });
  };


  m.loadSession = (req, res) => {
    const profile = _.get(req, 'params.profile');
    // TODO: also check the UDID
    // TODO: do not allow udids shorter than 12 characters for security reasons
    // TODO: discuss with the privacy office if we're allowed to store both the udid and the source IP
    /*
    if (!udid || udid.length <= 12) {
      log.warn(`UDID is incorrectly formatted: '${udid}'`);
      return res.json({ success: false, message: `Incorrect deidentified ID` });
    }
     */

    m.appLib.db
        .model('profiles')
        .findOne({ _id: new ObjectID(profile) })
        .exec()
        .then(r => {
          if (!r) {
            throw `Profile not found: ${profile}`;
          } else  {
            if(!req.session.profile) {
              req.session.profile = {};
            }
            const sesProfile = req.session.profile;
            sesProfile.id = profile;
            sesProfile.devices = _.get(r, 'devices', []).map(d => new ObjectID(d.device._id));
            sesProfile.drugs = _.get(r, 'drugs', []).map(d => new ObjectID(d.drug._id));
            sesProfile.icdcodes = _.get(r, 'diagnoses', []).map(
                d => new ObjectID(d.diagnosis[d.diagnosis.length-1]._id)
            );
          }
        })
        .then(() => {
          //req.session.udid = udid;
          return fs.readFile('../ha-dev/public/img/1x1.png').catch(err => {
            log.error(`Error while reading 1x1 file: '${err}'`);
            res.writeHead(500);
            res.end();
          });
        })
        .then(file => {
          // res.writeHead(200);
          res.setHeader('Content-Type', 'image/png');
          res.end(file, 'binary');
          // res.end();
        })
        .catch(e => {
          log.error(`Error while loading the session`, e.stack);
          res.json({ success: false, message: `An error occurred while loading a session` });
        });
  };


  function getDrugInfo(drug) {
    return { ndc11: drug.packageNdc11, brandName: drug.name };
  }

  m.getDrugNdcByDrugId = function(req, res) {
    const { drugId } = req.params;
    if (!ObjectID.isValid(drugId)) {
      return res.json({ success: false, message: `Invalid drugId: ${drugId}` });
    }
    return m.appLib.db
      .model(DRUGS_MASTER_COL_NAME)
      .findOne({ _id: new ObjectID(drugId) }, { packageNdc11: 1, name: 1 })
      .lean()
      .exec()
      .then(drug => {
        if (!drug) {
          return res.json({ success: false, message: `Not found drug with id: ${drugId}` });
        }
        return res.json({ success: true, data: getDrugInfo(drug) });
      })
      .catch(e => {
        log.error(`Error while getting drug:`, e.stack);
        res.json({ success: false, message: `Error while getting drug` });
      });
  };

  m.getDrugNdcs = function(req, res) {
    const { profileId } = req.params;
    if (!ObjectID.isValid(profileId)) {
      return res.json({ success: false, message: `Invalid profileId: ${profileId}` });
    }
    m.appLib.db
      .model('profiles')
      .findOne({ _id: new ObjectID(profileId) })
      .lean()
      .exec()
      .then(profile => {
        if (!profile) {
          log.error(`Unable to find a profile by id: ${profileId}`);
          return res.json({
            success: false,
            message: `Unable to find a profile by id: ${profileId}`,
          });
        }
        const drugIds = _.get(profile, 'drugs', []).map(d => new ObjectID(d.drug._id));
        return m.appLib.db
          .model(DRUGS_MASTER_COL_NAME)
          .find({ _id: { $in: drugIds } }, { packageNdc11: 1, name: 1 })
          .lean()
          .exec()
          .then(drugs => {
            const data = drugs.map(drug => getDrugInfo(drug));
            return res.json({ success: true, data });
          });
      })
      .catch(e => {
        log.error(`Error while getting drugs:`, e.stack);
        res.json({ success: false, message: `Error while getting drugs` });
      });
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
          log.error(`Error while starting a session: '${e}'`);
          res.json({ success: false, message: `An error occured` });
        });
    } else {
      log.warn(`UDID is incorrect: '${udid}'`);
      res.json({ success: false, message: `Incorrect deidentified ID` });
    }
  };
*/

  function updateNotificationInfoForProfile(profileId) {
    const notificationCol = m.appLib.db.model('notifications');
    const profilesCol = m.appLib.db.model('profiles');
    return Promise.all([
      notificationCol.count({ profileId }),
      notificationCol.count({ profileId, new: true }),
    ])
      .then(([numNotifications, numNewNotifications]) =>
        profilesCol.update(
          { _id: new ObjectID(profileId) },
          { $set: { numNewNotifications, numNotifications } }
        )
      )
      .then(() => m.appLib.cache.clearCacheForModel('profiles'));
  }

  function decorateResJson(res, decorateFunc) {
    const originalJson = res.json;
    res.json = function(data) {
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

  m.updateProfileNotificationInfo = (req, res) => {
    const { profileId } = req.params;
    if (!ObjectID.isValid(profileId)) {
      return res.json({ success: false, message: `Invalid profileId: ${profileId}` });
    }
    updateNotificationInfoForProfile(profileId)
      .then(() => {
        res.json({ success: true });
      })
      .catch(e => {
        const message = `Error while updating notification info for profile ${profileId}`;
        log.error(message, e.stack);
        res.json({ success: false, message });
      });
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

  m.recallsForDrug = (req, res) => {
    const { drugId } = req.params;
    m.appLib.db
      .model(DRUGS_MASTER_COL_NAME)
      .findById(drugId)
      .then(drug => {
        if (!drug) {
          throw new Error(`Unable to find drug by id '${drugId}'`);
        }

        const field = links[getHcAlghorithm(req)].recalls;
        const lookups = _.get(drug, `links.${field}`, []);
        if (!lookups.length) {
          return res.json({ success: true, data: [] });
        }

        const { table } = lookups[0];
        return m.appLib.db
          .model(table)
          .find({ _id: { $in: lookups.map(l => l._id) } }, { rawData: 0 })
          .lean()
          .exec()
          .then(recalls => res.json({ success: true, data: recalls }));
      })
      .catch(e => {
        const message = `Error while getting recalls for drug ${drugId}`;
        log.error(message, e.stack);
        res.json({ success: false, message });
      });
  };

  m.adverseEventsForDrug = (req, res) => {
    const { drugId } = req.params;
    let { gender, ageFrom, ageTo } = req.query;
    ageFrom = +ageFrom || 0;
    ageTo = +ageTo || 200;

    m.appLib.db
      .model(DRUGS_MASTER_COL_NAME)
      .findById(drugId)
      .lean()
      .then(drug => {
        if (!drug) {
          throw new Error(`Unable to find drug by id '${drugId}'`);
        }

        const field = links[getHcAlghorithm(req)].adverseEvents;
        const lookups = _.get(drug, `links.${field}`, []);
        if (!lookups.length) {
          return res.json({ success: true, data: [] });
        }
        const andCondition = [{ _id: { $in: lookups.map(l => l._id) } }];
        if (ageFrom || ageTo) {
          andCondition.push({ patientOnSetAge: { $gte: ageFrom, $lte: ageTo } });
          andCondition.push({ patientOnSetAgeUnit: '801' });
        }
        if (gender) {
          andCondition.push({ patientSex: gender });
        }

        const { table } = lookups[0];
        return m.appLib.db
          .model(table)
          .find({ $and: andCondition }, { rawData: 0 })
          .lean()
          .exec()
          .then(adverseEvents => res.json({ success: true, data: adverseEvents }));
      })
      .catch(e => {
        const message = `Error while getting adverse events for drug ${drugId}`;
        log.error(message, e.stack);
        res.json({ success: false, message });
      });
  };

  function getAdverseEventsForRxcuiConceptant(rxcui) {
    const field = links.conceptant.recalls;
    const linksPath = `links.${field}`;

    const data = {};
    const rxcuis = _.castArray(rxcui).filter(r => r);
    _.each(rxcuis, singleRxcui => {
      data[singleRxcui] = [];
    });

    return m.appLib.db
      .model(DRUGS_MASTER_COL_NAME)
      .find(
        { rxnormCui: { $in: rxcuis }, [linksPath]: { $ne: null } },
        { name: 1, packageNdc11: 1, rxnormCui: 1, [linksPath]: 1 }
      )
      .lean()
      .exec()
      .then(drugs =>
        Promise.map(drugs, drug => {
          const lookups = _.get(drug, linksPath);
          const { table } = lookups[0];
          return m.appLib.db
            .model(table)
            .find({ _id: { $in: lookups.map(l => l._id) } }, { rawData: 0 })
            .lean()
            .exec()
            .then(recalls => {
              data[drug.rxnormCui].push({
                name: drug.name,
                packageNdc11: drug.packageNdc11,
                recalls,
              });
            });
        })
      )
      .then(() => data);
  }

  function getAdverseEventsForRxcuiOpenfda(rxcui) {
    const data = {};

    const rxcuis = _.castArray(rxcui).filter(r => r);
    return Promise.map(rxcuis, singleRxcui =>
      m.appLib.db
        .model(RECALLS_OPENFDA_COL_NAME)
        .find({ 'rxCuis.rxCui': singleRxcui }, { rawData: 0 })
        .lean()
        .exec()
        .then(openfdaRecalls => {
          data[singleRxcui] = openfdaRecalls;
        })
    ).then(() => data);
  }

  m.adverseEventsForRxcui = (req, res) => {
    const { rxcui } = req.query;
    const getAEs =
      getHcAlghorithm(req) === 'conceptant'
        ? getAdverseEventsForRxcuiConceptant
        : getAdverseEventsForRxcuiOpenfda;

    getAEs(rxcui)
      .then(data => {
        res.json({ success: true, data });
      })
      .catch(e => {
        const message = `Error while getting recalls for rxcui: ${rxcui}`;
        log.error(message, e.stack);
        res.json({ success: false, message });
      });
  };

  m.splForDrug = (req, res) => {
    const { drugId } = req.params;
    m.appLib.db
      .model(DRUGS_MASTER_COL_NAME)
      .findById(drugId)
      .then(drug => {
        if (!drug) {
          throw new Error(`Unable to find drug by id '${drugId}'`);
        }

        const field = links[getHcAlghorithm(req)].spl;
        const lookups = _.get(drug, `links.${field}`, []);
        if (!lookups.length) {
          return res.json({ success: true, data: [] });
        }
        const { table } = lookups[0];
        return m.appLib.db
          .model(table)
          .find({ _id: { $in: lookups.map(l => l._id) } }, { rawData: 0 })
          .lean()
          .exec()
          .then(splData => res.json({ success: true, data: splData }));
      })
      .catch(e => {
        const message = `Error while getting SPL data for drug ${drugId}`;
        log.error(message, e.stack);
        res.json({ success: false, message });
      });
  };

  return m;
};
