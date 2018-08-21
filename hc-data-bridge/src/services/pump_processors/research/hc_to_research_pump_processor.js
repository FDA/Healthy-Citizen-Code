const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const _ = require('lodash');

const { Group } = datapumps;
const { MongodbMixin } = datapumps.mixin;
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID;

const lists = require('../../../lib/lists_short.js');

const medicalConditionDescriptions = lists.medicalConditions;
// const diabetesMedicationDescriptions = lists.diabetesMedicationTypes;
const proceduresDescriptions = lists.procedures;
const sideEffectsDescriptions = lists.sideEffects;

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
class HcToResearchPumpProcessor extends Group {
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
    this.addPump('HC-piis')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('piis')
      .from(this.pump('HC-piis').find({ 'demographics.shareDeidentifiedDataWithResearchers': true }))
      .process(pii => this.pump('HC-piis').buffer().writeAsync(pii));

    this.addPump('HC-users')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('users')
      .from(this.pump('HC-piis').buffer())
      .process(pii => this.pump('HC-users')
        .find({ piiId: pii._id.toString() })
        .toArray()
        .then((users) => {
          if (!_.isEmpty(users)) {
            this.pump('HC-users').buffer().writeAsync({
              piiData: {
                guid: _.get(pii, 'demographics[0].guid', null),
                ageRange: _.get(pii, 'demographics[0].ageRange', null),
                gender: _.get(pii, 'demographics[0].gender', null),
                race: _.get(pii, 'demographics[0].race', null),
                zip: _.get(pii, 'demographics[0].zip', null),
                geographicRegion: _.get(pii, 'demographics[0].geographicRegion', null),
              },
              phiId: _.get(users, '[0].phiId', null),
            });
          }
        }));

    this.addPump('HC-phis')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('phis')
      .from(this.pump('HC-users').buffer())
      .process((piiDataWithPhiId) => {
        const { piiData, phiId } = piiDataWithPhiId;
        return this.pump('HC-phis')
          .find({ _id: new ObjectId(phiId) })
          .toArray()
          .then((phis) => {
            if (!_.isEmpty(phis)) {
              const source = this.getSourceByMongoUrl(hcUrl);
              const participant = this.getParticipant(phis[0], piiData, source);
              this.pump('HC-phis').buffer().writeAsync(participant);
            }
          });
      });

    this.addPump('HC-participants')
      .mixin(MongodbMixin(researchUrl))
      .useCollection('participants')
      .from(this.pump('HC-phis').buffer())
      .process((participant) => {
        const { guid } = participant;
        return this.pump('HC-participants')
          .update({ guid }, participant, { upsert: true })
          .then((result) => {
            if (_.get(result, 'result.nModified') === 1) {
              console.log(`Modified participant with guid ${guid}`);
            } else {
              console.log(`Inserted participant with guid ${guid}`);
            }
          });
      });
  }

  getSourceByMongoUrl (hcUrl) {
    return hcUrl.substring(hcUrl.lastIndexOf('/') + 1) || null;
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
    return new Promise((resolve, reject) => {
      MongoClient.connect(url, (err, db) => {
        if (err) {
          errorUrls.push(url);
          resolve();
          return;
        }
        db.close();
        resolve(db);
      });
    });
  }

  getParticipant (phi, piiData, source) {
    const participant = _.clone(piiData);
    participant.source = source;

    // TODO: need to remove duplicates for all mappings?
    let medicalConditionCodes = [];
    _.forEach(phi.groupings, (grouping) => {
      medicalConditionCodes = medicalConditionCodes.concat(grouping.medicalConditions || []);
    });
    const medicalConditionValues = [];
    _.forEach(medicalConditionCodes, (code) => {
      const medicalConditionValue = medicalConditionDescriptions[code];
      if (medicalConditionValue) {
        medicalConditionValues.push(medicalConditionValue);
      }
    });
    participant.conditions = medicalConditionValues.join('\n');

    const medicationLabels = [];
    _.forEach(phi.myMedications, (medication) => {
      const productIdLabel = medication.productId_label;
      if (productIdLabel) {
        medicationLabels.push(productIdLabel);
      }
    });
    participant.medicationTypes = medicationLabels.join('\n');

    const procedures = _.flatten(_.map(phi.encounters, 'procedures'));
    let proceduresCodes = _.flatten(_.map(procedures, 'procedureCode'));
    proceduresCodes = _.uniq(proceduresCodes);
    participant.procedures = _.reduce(proceduresCodes, (result, proceduresCode) => `${result}${proceduresCode}: ${proceduresDescriptions[proceduresCode]}\n`, []);

    const adverseEventsArray = [];
    _.forEach(phi.myAdverseEvents, (adverseEvent) => {
      adverseEventsArray.push(`${adverseEvent.productName}.${adverseEvent.subject}.${adverseEvent.details}`);
    });

    const sideEffectsArray = [];
    _.forEach(phi.sideEffects, (sideEffect) => {
      const descriptionArray = [];
      _.forEach(sideEffect.sideEffect, (sideEffectCode) => {
        descriptionArray.push(`${sideEffectsDescriptions[sideEffectCode]}`);
      });

      sideEffectsArray.push(`${descriptionArray.join(',')}.${sideEffect.comments}`);
    });
    participant.sideEffects = adverseEventsArray.concat(sideEffectsArray).join('\n');

    return participant;
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
          console.log(`Finished pumping from HC(${pumpProcessor.inputSettings.hcUrl}) to Research(${pumpProcessor.inputSettings.researchUrl})`);
          pumpProcessor.isSuccessful = true;
        }
      })
      .catch((err) => {
        console.error(`Pump failed with error: ${err}`);
        pumpProcessor.isSuccessful = false;
      });
  }
}

module.exports = HcToResearchPumpProcessor;
