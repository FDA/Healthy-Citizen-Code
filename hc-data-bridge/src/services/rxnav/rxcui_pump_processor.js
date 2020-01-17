const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const { Group } = datapumps;
const fs = require('fs');
const es = require('event-stream');
const { convertValuesToObject } = require('./ndc_rxcui_helper');
const { mongoConnect } = require('../util/mongo');
const { getNormalizedNDC } = require('../util/ndc');

class RxcuiPumpProcessor extends Group {
  constructor(inputSettings) {
    super();
    this.inputSettings = inputSettings;
    this.lineNum = 0;
    this.fileStream = fs.createReadStream(`${__dirname}/resources/RXNSAT.RRF`, { encoding: 'utf8' }).pipe(es.split());
    const { mongoUrl } = this.inputSettings;
    this.addPumps(mongoUrl);
  }

  static getRxnsatDoc(line) {
    const values = line.split('|');
    const rxnsatObject = convertValuesToObject(values);
    return rxnsatObject.ATN !== 'NDC' ? null : rxnsatObject;
  }

  static getNdcToRxcuiDoc(rxnsatDoc) {
    const normalizedNDC = getNormalizedNDC(rxnsatDoc);
    if (!normalizedNDC) {
      return null;
    }

    return {
      ndc11: normalizedNDC,
      rxcui: rxnsatDoc.RXCUI,
    };
  }

  addPumps() {
    const pumpProcessor = this;
    const { rxcuiCollectionName, rxnsatCollectionName, medicationMasterCollectionName } = this.inputSettings;
    this.addPump('rrf-data'); // rxnsat.rrf file pump
    this.addPump('handleData'); // pump for saving raw data from rxnsat.rrf and mapping rxcui -> [ndcs]

    this.pump('rrf-data')
      .from(pumpProcessor.fileStream)
      .process(line => {
        pumpProcessor.lineNum++;
        if (pumpProcessor.lineNum % 100000 === 0) {
          console.log(`Processed lines number: ${pumpProcessor.lineNum}. Line: ${line}`);
        }
        const rxnsatDoc = RxcuiPumpProcessor.getRxnsatDoc(line);
        const ndcToRxcuiDoc = RxcuiPumpProcessor.getNdcToRxcuiDoc(rxnsatDoc);
        // save only records with normalized NDC
        if (ndcToRxcuiDoc) {
          // inject normalized ndc to raw data
          rxnsatDoc.ndc11 = ndcToRxcuiDoc.ndc11;
          return this.pump('rrf-data')
            .buffer()
            .writeAsync({ rxnsatDoc, ndcToRxcuiDoc });
        }
        return Promise.resolve();
      });

    this.pump('handleData')
      .from(this.pump('rrf-data').buffer())
      .process(({ rxnsatDoc, ndcToRxcuiDoc: { ndc11, rxcui } }) =>
        Promise.all([
          pumpProcessor.dbCon
            .collection(rxnsatCollectionName)
            .findAndModify({ ndc11: rxnsatDoc.ndc11 }, { _id: 1 }, rxnsatDoc, { new: true, upsert: true }),
          pumpProcessor.dbCon
            .collection(rxcuiCollectionName)
            .findAndModify({ rxcui }, { _id: 1 }, { $addToSet: { ndcs: ndc11 } }, { upsert: true }),
        ]).then(([rxnsatResult]) => {
          const insertedRxnatDoc = rxnsatResult.value;
          return pumpProcessor.dbCon.collection(medicationMasterCollectionName).findAndModify(
            { ndc11: insertedRxnatDoc.ndc11 },
            { _id: 1 },
            {
              $set: {
                rxnsatData: {
                  id: insertedRxnatDoc._id,
                  rxcui: insertedRxnatDoc.RXCUI,
                },
              },
            },
            { upsert: true }
          );
        })
      );
  }

  /**
   * Checks whether constructed pump processor is valid
   * @returns {Promise.<T>} promise with errors
   */
  checkInitialErrors() {
    const pumpProcessor = this;
    const { mongoUrl, rxcuiCollectionName, rxnsatCollectionName, medicationMasterCollectionName } = this.inputSettings;
    const errorUrls = [];
    return this.checkConnection(mongoUrl, errorUrls)
      .then(dbConnection => {
        if (errorUrls.length) {
          return `Cannot connect to: ${errorUrls.join(', ')}`;
        }
        pumpProcessor.dbCon = dbConnection;
        return Promise.all([
          pumpProcessor.dbCon.collection(rxnsatCollectionName).createIndex({ ndc11: 1 }),
          pumpProcessor.dbCon.collection(rxcuiCollectionName).createIndex({ rxcui: 1 }),
          pumpProcessor.dbCon.collection(medicationMasterCollectionName).createIndex({ ndc11: 1 }),
        ]);
      })
      .then(() => null);
  }

  checkConnection(url, errorUrls) {
    return mongoConnect(url).catch(e => {
      errorUrls.push(url);
    });
  }

  processSettings() {
    console.time('Rxcui pumping');
    console.log(`Started processing input settings: ${JSON.stringify(this.inputSettings)}`);
    const pumpProcessor = this;
    return pumpProcessor
      .logErrorsToConsole()
      .start()
      .whenFinished()
      .then(() => {
        console.timeEnd('Rxcui pumping');
        if (!pumpProcessor.errorBuffer().isEmpty()) {
          console.error(`Errors: ${JSON.stringify(pumpProcessor.errorBuffer().getContent())}`);
          pumpProcessor.isSuccessful = false;
        } else {
          console.log(`Finished pumping rxcuis for (${pumpProcessor.inputSettings.mongoUrl})`);
          pumpProcessor.isSuccessful = true;
        }
      })
      .catch(err => {
        console.error(`Pump failed with error: ${err}`);
        pumpProcessor.isSuccessful = false;
      });
  }
}

module.exports = RxcuiPumpProcessor;
