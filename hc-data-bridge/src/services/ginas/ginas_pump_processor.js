const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const { Group } = datapumps;
const { MongodbMixin } = datapumps.mixin;
const _ = require('lodash');
const Crawler = require('crawler');
const { Transform } = require('stream');
const rp = require('request-promise');
const Promise = require('bluebird');
const { mongoConnect } = require('../util/mongo');

const PAGES_PER_SECOND = 100;

class GinasPumpProcessor extends Group {
  constructor (inputSettings) {
    super();
    this.inputSettings = inputSettings;
    const { mongoUrl } = this.inputSettings;

    // prepare crawlerData for processSettings
    this.crawlersData = [
      {
        firstPageUrl: 'https://tripod.nih.gov/ginas/app/api/v1/substances',
        collectionName: 'ginasSubstances',
        uniqueField: 'uuid',
      },
      {
        firstPageUrl: 'https://tripod.nih.gov/ginas/app/api/v1/structures',
        collectionName: 'ginasStructures',
        uniqueField: 'id',
      },
    ];
    _.forEach(this.crawlersData, (crawlerData, key) => {
      const stream = new Transform({ readableObjectMode: true });
      const crawler = this.getCrawler(stream);
      this.addPumpForStream(mongoUrl, crawlerData, stream);

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
      return Promise.map(pumpProcessor.crawlersData, crawlerData => pumpProcessor.dbCon.collection(crawlerData.collectionName).createIndex({ [crawlerData.uniqueField]: 1 }));
    })
      .then(() => null);
  }

  checkConnection (url, errorUrls) {
    return mongoConnect(url)
      .catch(e => {
        errorUrls.push(url);
      });
  }

  getCrawler (stream) {
    const crawler = new Crawler({
      maxConnections: PAGES_PER_SECOND,
      // rateLimit: 1000, // minimum time gap between two tasks
      jQuery: false,
      retries: 10,
      retryTimeout: 5000,
      // This will be called for each crawled page
      callback (error, res, done) {
        if (error) {
          console.log(error);
          done();
        } else if (res.statusCode !== 200) {
          console.log(`Invalid status code sent: ${res.statusCode}`);
          done();
        } else {
          let body;
          try {
            body = JSON.parse(res.body);
          } catch (e) {
            console.log(`Error occurred while parsing ${_.get(body, 'uri', 'unknown body.uri')}. ${res.body} is not JSON.`);
            done();
          }
          console.log(`Received page: ${body.uri}`);

          body.content.forEach((elem) => {
            stream.push(elem);
          });
          done();
        }
      },
    });

    crawler.on('drain', () => {
      // finish stream
      stream.push(null);
    });

    return crawler;
  }

  addPumpForStream (mongoUrl, crawlerData, stream) {
    const { collectionName } = crawlerData;
    const pumpName = `${collectionName}Pump`;
    this.addPump(pumpName)
      .mixin(MongodbMixin(mongoUrl))
      .from(stream)
      .useCollection(collectionName)
      .process((elem) => {
        const id = elem.uuid || elem.id; // substance.uuid and structure.id
        return this.pump(pumpName)
          .update({ [crawlerData.uniqueField]: id }, elem, { upsert: true })
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
      pageUrls.push(`${basePath}?skip=${page * countPerPage}`);
    }
    return pageUrls;
  }

  getStartQueuePromises () {
    const pumpProcessor = this;
    const startQueuePromises = [];
    _.forEach(pumpProcessor.crawlersData, (crawlerData) => {
      const startQueuePromise = pumpProcessor.getFirstPage(crawlerData.firstPageUrl)
        .then((firstPage) => {
          const { total, count } = firstPage;
          const pageUrls = pumpProcessor.getPageUrls(crawlerData.firstPageUrl, total, count);
          crawlerData.crawler.queue(pageUrls);

          return true;
        });

      startQueuePromises.push(startQueuePromise);
    });
    return startQueuePromises;
  }

  processSettings () {
    console.log(`${new Date().toISOString()} - Started processing input settings: ${JSON.stringify(this.inputSettings)}`);
    const startQueuePromises = this.getStartQueuePromises();
    const pumpProcessor = this;
    return Promise.all(startQueuePromises)
      .then(() => pumpProcessor.processPumpProcessor());
  }

  processPumpProcessor () {
    const pumpProcessor = this;
    return pumpProcessor
      .logErrorsToConsole()
      .start()
      .whenFinished()
      .then(() => {
        if (!pumpProcessor.errorBuffer().isEmpty()) {
          console.error(`${new Date().toISOString()} - Errors: ${JSON.stringify(pumpProcessor.errorBuffer().getContent())}`);
          pumpProcessor.isSuccessful = false;
        } else {
          console.log(`${new Date().toISOString()} - Finished pumping GINAS data for ${pumpProcessor.inputSettings.mongoUrl}`);
          pumpProcessor.isSuccessful = true;
        }
      })
      .catch((err) => {
        console.error(`Pump failed with error: ${err}`);
        pumpProcessor.isSuccessful = false;
      });
  }
}

module.exports = GinasPumpProcessor;
