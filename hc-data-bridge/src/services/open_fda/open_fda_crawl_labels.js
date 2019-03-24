/**
 * Current file is deprecated since we have switched to pupming using json file listing all available resources.
 * Furthermore, downloading and pumping big files is faster than requesting API.
 */

const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const { Group } = datapumps;
const { MongodbMixin } = datapumps.mixin;
const { MongoClient } = require('mongodb');
const _ = require('lodash');
const Crawler = require('crawler');
const { Transform } = require('stream');
const rp = require('request-promise');

const PAGES_PER_SECOND = 50;
const ITEMS_PER_PAGE = 100;

// API forbid te request items with param 'skip' that is more than 25000.
class OpenFDACrawlLabels extends Group {
  constructor (inputSettings) {
    super();
    this.inputSettings = inputSettings;
    const { mongoUrl } = this.inputSettings;

    // prepare crawlerData for processSettings
    this.crawlersData = {
      substances: {
        firstPageUrl: 'https://api.fda.gov/drug/label.json',
        mongoUrl,
        collectionName: 'drugLabels',
      },
    };
    _.forEach(this.crawlersData, (crawlerData, key) => {
      const stream = new Transform({ readableObjectMode: true });
      const crawler = this.getCrawler(stream);
      this.addPumpForStream(mongoUrl, crawlerData.collectionName, stream);

      crawlerData.stream = stream;
      crawlerData.crawler = crawler;
    });
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
    return new Promise((resolve, reject) => {
      MongoClient.connect(url, (err, db) => {
        if (err) {
          errorUrls.push(url);
          resolve();
          return;
        }
        resolve(db);
      });
    });
  }

  getCrawler (stream) {
    const crawler = new Crawler({
      maxConnections: PAGES_PER_SECOND,
      // rateLimit: 1000 / PAGES_PER_SECOND,
      jQuery: false,
      retries: 10,
      retryTimeout: 5000,
      // This will be called for each crawled page
      callback (error, res, done) {
        if (error) {
          console.log(error);
          return done();
        }
        const body = JSON.parse(res.body);
        console.log(`Received page: ${body.uri}`);

        body.results.forEach((elem) => {
          stream.push(elem);
        });
        return done();
      },
    });

    crawler.on('drain', () => {
      // finish stream
      stream.push(null);
    });

    return crawler;
  }

  addPumpForStream (mongoUrl, collectionName, stream) {
    const pumpName = `${collectionName}Pump`;
    this.addPump(pumpName)
      .mixin(MongodbMixin(mongoUrl))
      .from(stream)
      .useCollection(collectionName)
      .process((elem) => {
        const id = elem.uuid || elem.id; // substance.uuid and structure.id
        return this.pump(pumpName)
          .update({ id }, elem, { upsert: true })
          .then((commandResult) => {
            if (commandResult.result.nModified === 1) {
              console.log(`Updated entry in ${collectionName} with id: ${id}`);
            } else {
              console.log(`Inserted entry in ${collectionName} with id: ${id}`);
            }
            return true;
          });
      });
  }

  getFirstPage (firstPageUrl) {
    return rp(firstPageUrl)
      .then(res => JSON.parse(res));
  }

  getPageUrls (basePath, total, countPerPage) {
    const pageUrls = [];
    const pageNum = Math.ceil(total / countPerPage);
    for (let page = 0; page < pageNum; page++) {
      pageUrls.push(`${basePath}?limit=${countPerPage}&skip=${page * countPerPage}`);
    }
    return pageUrls;
  }

  processSettings () {
    console.log(`${new Date().toISOString()} - Started processing input settings: ${JSON.stringify(this.inputSettings)}`);
    const pumpProcessor = this;
    const startQueuePromises = [];
    _.forEach(pumpProcessor.crawlersData, (crawlerData) => {
      const startQueuePromise = pumpProcessor.getFirstPage(crawlerData.firstPageUrl)
        .then((firstPage) => {
          const { total } = firstPage.meta.results;
          const pageUrls = pumpProcessor.getPageUrls(crawlerData.firstPageUrl, total, ITEMS_PER_PAGE);
          crawlerData.crawler.queue(pageUrls);

          return true;
        });

      startQueuePromises.push(startQueuePromise);
    });
    return Promise.all(startQueuePromises)
      .then(() => pumpProcessor
        .logErrorsToConsole()
        .start()
        .whenFinished()
        .then(() => {
          if (!pumpProcessor.errorBuffer().isEmpty()) {
            console.error(`${new Date().toISOString()} - Errors: ${JSON.stringify(pumpProcessor.errorBuffer().getContent())}`);
            pumpProcessor.isSuccessful = false;
          } else {
            console.log(`${new Date().toISOString()} - Finished pumping Open FDA data for ${pumpProcessor.inputSettings.mongoUrl}`);
            pumpProcessor.isSuccessful = true;
          }
        })
        .catch((err) => {
          console.error(`Pump failed with error: ${err}`);
          pumpProcessor.isSuccessful = false;
        }));
  }
}

module.exports = OpenFDACrawlLabels;
