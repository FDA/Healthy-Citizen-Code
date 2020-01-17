const _ = require('lodash');
const Promise = require('bluebird');
const args = require('optimist').argv;
const pRetry = require('p-retry');
const { findDrugInteractions } = require('./rxnav_api');
const { isValidMongoDbUrl } = require('../../lib/helper');
const { mongoConnect } = require('../util/mongo');

const retryOptions = {
  onFailedAttempt: (error) => {
    console.log(`Attempt ${error.attemptNumber} failed. There are ${error.attemptsLeft} attempts left.`);
  },
  retries: 5,
};

const getConnection = (url) => mongoConnect(url)

const transformDrugInteraction = (drugInteraction) => {
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

    /*_.forEach(interactionTypeGroup.interactionType, (interactionType) => {
      _.forEach(interactionType.interactionPair, (interactionPair) => {
        // TODO: resolve how to store second drug info
        // delete interactionPair.interactionConcept;
      });
    });*/
  });
  return result;
};

const findAndUpsertDrugInteraction = (doc, collectionName) => pRetry(() => findDrugInteractions(doc.rxcui), retryOptions)
  .then((drugInteraction) => {
    const transformedDrugInteraction = transformDrugInteraction(drugInteraction);
    if (!transformedDrugInteraction) {
      throw new Error(`Rxnav has no data for rxcui: ${doc.rxcui}`);
    }
    return transformedDrugInteraction;
  })
  .then((transformedDrugInteraction) => {
    const { rxcui } = transformedDrugInteraction;
    return dbCon.collection(collectionName)
      .update({ rxcui }, transformedDrugInteraction, { upsert: true })
      .then((commandResult) => {
        if (commandResult.result.nModified === 1) {
          console.log(`Updated entry in 'rxnavDrugInteractions' with rxcui: ${rxcui}`);
        } else {
          console.log(`Inserted entry in 'rxnavDrugInteractions' with rxcui: ${rxcui}`);
        }
      });
  })
  .catch((err) => {
    console.log(err.message);
  });

// Default collection names: 'rxcuiToNdcs', 'rxnavDrugInteractions'
const { rxcuiCollectionName, drugInteractionCollectionName, mongoUrl } = args;
if (!rxcuiCollectionName || !drugInteractionCollectionName || !isValidMongoDbUrl(mongoUrl)) {
  console.log(`One of param 'rxcuiCollectionName' or 'drugInteractionCollectionName' or 'mongoUrl' is invalid`);
  process.exit(1);
}

let dbCon;
getConnection(mongoUrl)
  .then((dbConnection) => {
    dbCon = dbConnection;
    return Promise.all([
      dbCon.collection(rxcuiCollectionName).find({}, { projection: { rxcui: 1 }}),
      dbCon.collection(drugInteractionCollectionName).createIndex({ rxcui: 1 }),
    ]);
  })
  .then(([rxcuiCursor, createIndexResult]) => Promise.map(rxcuiCursor.toArray(), doc =>
    findAndUpsertDrugInteraction(doc, drugInteractionCollectionName), { concurrency: 50 }))
  .then(() => {
    console.log(`Done pumping drug interaction in collection '${drugInteractionCollectionName}'.`);
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
