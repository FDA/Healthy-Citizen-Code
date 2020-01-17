const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const _ = require('lodash');

const { Group } = datapumps;
const { MongodbMixin } = datapumps.mixin;
const ObjectId = require('mongodb').ObjectID;
const { mongoConnect } = require('../../util/mongo');

/**
 * Pumps all PHI records only with corresponding PII field 'shareDeidentifiedDataWithResearchers' = true from HC into Research(participants collection)
 * Participant records are updated by 'guid' field.
 *
 * Algorithm by steps:
 * 1) Get pii with shareDeidentifiedDataWithResearchers = true
 * 2) Get 'user' object by 'piiId' field. Get field 'phiId' from 'user' object
 * 3) Get 'phi' object by 'phiId' field
 * 4) Transform data from 'pii' and 'phi' objects to get new 'participant' object. Transformations from HC-942 in Jira.
 * 5) Update (modify or insert) new 'participant' object by 'guid' field in Research DB in 'participants' collection.
 */
class ResearchToHcPumpProcessor extends Group {
  /**
   * Builds chain of pumps.
   * @param inputSettings specifies hcUrl and researchUrl mongodb urls like 'mongodb://localhost:27017/hc-stage-test'
   */
  constructor (inputSettings) {
    super();
    this.inputSettings = inputSettings;
    const { hcUrl, researchUrl } = this.inputSettings;
    this.addPumps(hcUrl, researchUrl);
  }

  addPumps (hcUrl, researchUrl) {
    this.addPump('HC-participants')
      .mixin(MongodbMixin(researchUrl))
      .useCollection('participants')
      .from(this.pump('HC-participants').find({}, { guid: 1, notifications: 1 }))
      .process(notificationsData => this.pump('HC-participants').buffer().writeAsync(notificationsData));

    this.addPump('HC-piis')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('piis')
      .from(this.pump('HC-participants').buffer())
      .process((notificationsData) => {
        const { _id, guid, notifications } = notificationsData;
        return this.pump('HC-piis')
          .findOne({ 'demographics.guid': guid })
          .then((pii) => {
            if (!pii) {
              console.log(`No pii found with demographics.guid = ${guid}`);
              return this.pump('HC-piis').buffer().writeAsync(notificationsData);
            }
            return this.pump('HC-piis').buffer().writeAsync({ notificationsData, piiId: pii._id });
          });
      });

    this.addPump('HC-users')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('users')
      .from(this.pump('HC-piis').buffer())
      .process((notificationsDataWithPiiId) => {
        const { notificationsData, piiId } = notificationsDataWithPiiId;
        return this.pump('HC-users')
          .findOne({ piiId: piiId.toString() })
          .then((user) => {
            if (!user) {
              console.log(`No user found with piiId: ${piiId.toString()}`);
              return;
            }
            return this.pump('HC-users').buffer().writeAsync({
              notificationsData,
              phiId: user.phiId,
            });
          });
      });

    this.addPump('HC-phis')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('phis')
      .from(this.pump('HC-users').buffer())
      .process((notificationsDataWithPhiId) => {
        const { notificationsData, phiId } = notificationsDataWithPhiId;
        return this.pump('HC-phis')
          .findOne({ _id: new ObjectId(phiId) })
          .then((phi) => {
            if (!phi) {
              console.log(`No phi found with id: ${phiId}`);
              return;
            }
            const researchNotifications = _.clone(notificationsData.notifications);
            let newNotifications = [];
            const hcNotifications = phi.researchNotifications || [];
            for (let hcIndex = 0; hcIndex < hcNotifications.length; hcIndex++) {
              const hcNotification = hcNotifications[hcIndex];
              let isConflict = false;
              for (let researchIndex = 0; researchIndex < researchNotifications.length; researchIndex++) {
                // insert new notification if conflict
                const researchNotification = researchNotifications[researchIndex];
                if (hcNotification.notificationId === researchNotification.notificationId) {
                  newNotifications.push(researchNotification);
                  hcNotifications.splice(hcIndex, 1);
                  researchNotifications.splice(researchIndex, 1);
                  hcIndex--;
                  researchIndex--;
                  isConflict = true;
                  break;
                }
              }
              // insert old non-conflict notification
              if (!isConflict) {
                newNotifications.push(hcNotification);
              }
            }
            // insert new non-conflict notifications
            newNotifications = newNotifications.concat(researchNotifications);
            phi.researchNotifications = newNotifications;

            return this.pump('HC-phis')
              .update({ _id: new ObjectId(phiId) }, phi)
              .then((result) => {
                if (_.get(result, 'result.nModified') === 1) {
                  console.log(`Modified phi with id ${phiId}`);
                } else {
                  console.log(`No changes for phi with id ${phiId}`);
                }
              });
          });
      });
  }

  /**
   * Checks whether constructed pump processor is valid
   * @returns {Promise.<T>} promise with errors
   */
  checkInitialErrors () {
    const { hcUrl, researchUrl } = this.inputSettings;
    const errorUrls = [];
    return Promise.all([
      this.checkConnection(hcUrl, errorUrls),
      this.checkConnection(researchUrl, errorUrls),
    ]).then(() => {
      if (errorUrls.length) {
        throw new Error(`Cannot connect to: ${errorUrls.join(', ')}`);
      }
    });
  }

  checkConnection (url, errorUrls) {
    return mongoConnect(url)
      .then(dbConnection => {
        return dbConnection.close();
      })
      .catch(e => {
        errorUrls.push(url);
      });
  }

  processSettings () {
    console.log(`Started processing input settings: ${JSON.stringify(this.inputSettings)}`);
    const pumpProcessor = this;
    return this
      .logErrorsToConsole()
      .start()
      .whenFinished()
      .then(() => {
        if (!pumpProcessor.errorBuffer().isEmpty()) {
          console.error(`Errors: ${JSON.stringify(pumpProcessor.errorBuffer().getContent())}`);
          pumpProcessor.isSuccessful = false;
        } else {
          console.log(`Finished pumping from Research(${pumpProcessor.inputSettings.researchUrl}) to HC(${pumpProcessor.inputSettings.hcUrl})`);
          pumpProcessor.isSuccessful = true;
        }
      })
      .catch((err) => {
        console.error(`Pump failed with error: ${err}`);
        pumpProcessor.isSuccessful = false;
      });
  }
}

module.exports = ResearchToHcPumpProcessor;
