const args = require('optimist').argv;
const Promise = require('bluebird');
const axios = require('axios');
const _ = require('lodash');
const { mongoConnect } = require('../util/mongo');

const { upsertSafetyAlert, parseSingleAlertPage } = require('./pump_util');
const { parseString } = require('../util/parse_xml_string');

const { mongoUrl, medWatchCollectionName } = args;
const collectionName = medWatchCollectionName || 'medWatch';
const RSS_LINK = 'https://www.fda.gov/AboutFDA/ContactFDA/StayInformed/RSSFeeds/MedWatch/rss.xml';

if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

function createIndexes(indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(collectionName).createIndex({ [fieldName]: 1 })
  );
}

async function handleChannelsInfo(channelsInfo, dbCon) {
  await Promise.mapSeries(channelsInfo, channelInfo => {
    const { title, lastBuildDate, links } = channelInfo;
    console.log(`Handling RSS channel '${title}', Last Build Date: ${lastBuildDate}`);
    return Promise.map(links, async alertLink => {
      try {
        const alert = await parseSingleAlertPage(alertLink);
        alert.docSource = 'RSS';
        await upsertSafetyAlert(alert, dbCon, collectionName);
      } catch (e) {
        console.log(`Cannot parse single alert page ${alertLink}. Alert will be skipped.`, e.stack);
      }
    });
  });
}

(async () => {
  let dbCon;
  try {
    dbCon = await mongoConnect(mongoUrl);
    const indexFieldNames = ['productName'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);
  } catch (e) {
    console.log(`Unable to get connection by url '${mongoUrl}'`, e.stack);
    process.exit(1);
  }

  let channelsInfo;
  try {
    const { data: xml } = await axios.get(RSS_LINK);
    const rssFeed = await parseString(xml);
    channelsInfo = _.castArray(rssFeed.rss.channel).map(ch => ({
      title: 'MedWatch Safety Alert RSS Feed',
      lastBuildDate: _.get(ch, 'lastBuildDate', 'Not Specified'),
      links: _.flatten(_.castArray(ch.item).map(item => item.link)),
    }));
  } catch (e) {
    console.log(`Unable to get data handle RSS Feed by link '${RSS_LINK}'`, e.stack);
    process.exit(1);
  }

  try {
    await handleChannelsInfo(channelsInfo, dbCon);

    console.log(`\nDone pumping RSS Feed data by link '${RSS_LINK}'`);
    process.exit(0);
  } catch (e) {
    console.error(`Error occurred while pumping RSS Feed data by link '${RSS_LINK}'`, e.stack);
    process.exit(1);
  }
})();
