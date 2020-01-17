const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const Group = datapumps.Group;
const { MongodbMixin, MergeMixin } = datapumps.mixin;
const _ = require('lodash');
const { findDrugInteractions } = require('./rxnav_api');
const { getNormalizedNDCByPackageNDC } = require('../util/ndc');
const { mongoConnect } = require('../util/mongo');

class DrugInteractionPumpProcessor extends Group {
  constructor (inputSettings) {
    super();
    this.inputSettings = inputSettings;
    const { mongoUrl } = this.inputSettings;
    this.addPumps(mongoUrl);
  }

  checkInitialErrors () {
    const pumpProcessor = this;
    const { mongoUrl } = this.inputSettings;
    const errorUrls = [];
    return Promise.all([
      this.checkConnection(mongoUrl, errorUrls),
    ]).then((dbConnections) => {
      if (errorUrls.length) {
        throw new Error(`Cannot connect to: ${errorUrls.join(', ')}`);
      }
      pumpProcessor.dbCon = dbConnections[0];
    });
  }

  checkConnection (url, errorUrls) {
    return mongoConnect(url).catch(e => {
      errorUrls.push(url);
    });
  }

  addPumps (mongoUrl) {
    const pumpProcessor = this;

    this.addPump('phis.myMedications')
      .mixin(MongodbMixin(mongoUrl))
      .useCollection('phis')
      .from(this.pump('phis.myMedications').find({}, { 'myMedications.productId': 1 }))
      .process((data) => {
        const myMedications = data.myMedications || [];
        const productIds = myMedications.map(myMedication => myMedication.productId);
        if (productIds) {
          return this.pump('phis.myMedications').buffer().writeAsync(productIds);
        }
        return Promise.resolve();
      });

    this.addPump('productsMedications')
      .mixin(MongodbMixin(mongoUrl))
      .useCollection('productsmedications')
      .from(this.pump('phis.myMedications').buffer())
      .process((productIds) => {
        if (!_.isEmpty(productIds)) {
          return this.pump('productsMedications')
            .find({ _id: { $in: productIds } }, { ndc: 1 })
            .toArray()
            .then((products) => {
              const ndcs = products.filter((product) => {
                const ndc = product['Item Code'];
                // we don't have 'SAB' only 'ATV'
                const normalizedNDC = getNormalizedNDCByPackageNDC(ndc);
                return !!normalizedNDC;
              });
              return this.pump('productsMedications').buffer().writeAsync(ndcs);
            });
        }
        return Promise.resolve();
      });

    this.addPump('phis.myBiologics')
      .mixin(MongodbMixin(mongoUrl))
      .useCollection('phis')
      .from(this.pump('phis.myBiologics').find({}, { 'myBiologics.productId': 1 }))
      .process((data) => {
        const myBiologics = data.myBiologics || [];
        const productIds = myBiologics.map(myBiologic => myBiologic.productId);
        if (productIds) {
          return this.pump('phis.myBiologics').buffer().writeAsync(productIds);
        }
        return Promise.resolve();
      });

    this.addPump('productsBiologics')
      .mixin(MongodbMixin(mongoUrl))
      .useCollection('productsbiologics')
      .from(this.pump('phis.myBiologics').buffer())
      .process((productIds) => {
        if (!_.isEmpty(productIds)) {
          return this.pump('productsBiologics')
            .find({ _id: { $in: productIds } }, { 'rawData.Item Code': 1 })
            .toArray()
            .then((products) => {
              const ndcs = products.filter((product) => {
                const ndc = product['Item Code'];
                // we don't have 'SAB' only 'ATV'
                const normalizedNDC = getNormalizedNDCByPackageNDC(ndc);
                return !!normalizedNDC;
              });
              return this.pump('productsBiologics').buffer().writeAsync(ndcs);
            });
        }
        return Promise.resolve();
      });

    this.addPump('ndcsToRxcui')
      .mixin(MongodbMixin(mongoUrl))
      .mixin(MergeMixin)
      .useCollection('rxcuiToNdcs')
      .from(this.pump('productsMedications').buffer())
      .from(this.pump('productsBiologics').buffer())
      .process(ndcs => this.pump('ndcsToRxcui')
        .find({ ndcs: { $in: ndcs } }, { rxcui: 1 })
        .toArray()
        .then((results) => {
          const rxcuis = results.map(result => result.rxcui);
          if (rxcuis.length > 0) {
            return this.pump('ndcsToRxcui').buffer().writeArrayAsync(rxcuis);
          }
          return this.pump('ndcsToRxcui').buffer().writeAsync(); // '310965' as example
        }));

    this.addPump('interaction')
      .mixin(MongodbMixin(mongoUrl))
      .useCollection('drugInteractions')
      .from(this.pump('ndcsToRxcui').buffer())
      .process(rxcui => findDrugInteractions(rxcui)
        .then((drugInteraction) => {
          const transformedDrugInteraction = pumpProcessor.transformDrugInteraction(drugInteraction);
          if (!transformedDrugInteraction) {
            return false;
          }
          const rxcui = transformedDrugInteraction.rxcui;
          return this.pump('interaction')
            .update({ rxcui }, transformedDrugInteraction, { upsert: true })
            .then((commandResult) => {
              if (commandResult.result.nModified === 1) {
                console.log(`Updated entry in 'drugInteractions' with rxcui: ${rxcui}`);
              } else {
                console.log(`Inserted entry in 'drugInteractions' with rxcui: ${rxcui}`);
              }
              return false;
            });
        }));
  }

  transformDrugInteraction (drugInteraction) {
    // no drug interaction data
    if (!drugInteraction.interactionTypeGroup) {
      return null;
    }
    const rxcui = _.get(drugInteraction, 'userInput.rxcui');

    const result = _.clone(drugInteraction);
    result.rxcui = rxcui;
    delete result.nlmDisclaimer;
    delete result.userInput;
    _.forEach(result.interactionTypeGroup, (interactionTypeGroup) => {
      delete interactionTypeGroup.sourceDisclaimer;

      _.forEach(interactionTypeGroup.interactionType, (interactionType) => {
        _.forEach(interactionType.interactionPair, (interactionPair) => {
          // TODO: resolve how to store second drug info
          // delete interactionPair.interactionConcept;
        });
      });
    });
    return result;
  }

  processSettings () {
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
      .catch((err) => {
        console.error(`Pump failed with error: ${err}`);
        pumpProcessor.isSuccessful = false;
      });
  }
}

module.exports = DrugInteractionPumpProcessor;
