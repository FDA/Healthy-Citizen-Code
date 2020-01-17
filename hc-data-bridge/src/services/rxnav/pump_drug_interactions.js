const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const { Group } = datapumps;
const { MongodbMixin } = datapumps.mixin;
const _ = require('lodash');
const { findDrugInteractions } = require('./rxnav_api');
const { mongoConnect } = require('../util/mongo');

class DrugInteractionPumpProcessor extends Group {
  constructor(inputSettings) {
    super();
    this.inputSettings = inputSettings;
    const { mongoUrl } = this.inputSettings;
    this.addPumps(mongoUrl);
  }

  checkInitialErrors() {
    const pumpProcessor = this;
    const { mongoUrl } = this.inputSettings;
    const errorUrls = [];
    return Promise.all([this.checkConnection(mongoUrl, errorUrls)]).then(dbConnections => {
      if (errorUrls.length) {
        throw new Error(`Cannot connect to: ${errorUrls.join(', ')}`);
      }
      pumpProcessor.dbCon = dbConnections[0];
    });
  }

  checkConnection(url, errorUrls) {
    return mongoConnect(url).catch(e => {
      errorUrls.push(url);
    });
  }

  addPumps(mongoUrl) {
    const pumpProcessor = this;

    this.addPump('rxcuiToNdcs')
      .mixin(MongodbMixin(mongoUrl))
      .useCollection('rxcuiToNdcs')
      .from(this.pump('rxcuiToNdcs').find({}, { rxcui: 1 }))
      .process(data =>
        this.pump('rxnavDrugInteractions')
          .buffer()
          .writeAsync(data.rxcui)
      );

    this.addPump('rxnavDrugInteractions')
      .mixin(MongodbMixin(mongoUrl))
      .useCollection('rxnavDrugInteractions')
      .from(this.pump('rxnavDrugInteractions').buffer())
      .process(rxcui =>
        findDrugInteractions(rxcui).then(drugInteraction => {
          const transformedDrugInteraction = pumpProcessor.transformDrugInteraction(drugInteraction);
          if (!transformedDrugInteraction) {
            console.log(`Rxnav has no data for rxcui ${rxcui}`);
            return false;
          }
          const rxcui = transformedDrugInteraction.rxcui;
          return this.pump('rxnavDrugInteractions')
            .update({ rxcui }, transformedDrugInteraction, { upsert: true })
            .then(commandResult => {
              if (commandResult.result.nModified === 1) {
                console.log(`Updated entry in 'rxnavDrugInteractions' with rxcui: ${rxcui}`);
              } else {
                console.log(`Inserted entry in 'rxnavDrugInteractions' with rxcui: ${rxcui}`);
              }
              return false;
            });
        })
      );
  }

  // according to Josh's notes
  transformDrugInteraction(drugInteraction) {
    // no drug interaction data
    if (!drugInteraction.interactionTypeGroup) {
      return null;
    }
    const rxcui = _.get(drugInteraction, 'userInput.rxcui');

    const result = _.clone(drugInteraction);
    result.rxcui = rxcui;
    delete result.nlmDisclaimer;
    delete result.userInput;
    _.forEach(result.interactionTypeGroup, interactionTypeGroup => {
      delete interactionTypeGroup.sourceDisclaimer;

      _.forEach(interactionTypeGroup.interactionType, interactionType => {
        _.forEach(interactionType.interactionPair, interactionPair => {
          // TODO: resolve how to store second drug info
          // delete interactionPair.interactionConcept;
        });
      });
    });
    return result;
  }

  processSettings() {
    console.log(`Started processing input settings: ${JSON.stringify(this.inputSettings)}`);
    const pumpProcessor = this;
    return pumpProcessor
      .logErrorsToConsole()
      .start()
      .whenFinished()
      .then(() => {
        if (!pumpProcessor.errorBuffer().isEmpty()) {
          console.error(`Errors: ${JSON.stringify(pumpProcessor.errorBuffer().getContent())}`);
          pumpProcessor.isSuccessful = false;
        } else {
          console.log(`Finished pumping drug interaction for ${pumpProcessor.inputSettings.mongoUrl}`);
          pumpProcessor.isSuccessful = true;
        }
      })
      .catch(err => {
        console.error(`Pump failed with error: ${err}`);
        pumpProcessor.isSuccessful = false;
      });
  }
}

module.exports = DrugInteractionPumpProcessor;
