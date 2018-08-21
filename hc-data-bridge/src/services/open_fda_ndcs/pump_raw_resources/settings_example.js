const _ = require('lodash');

// every file available for download from OpenFDA can be viewed by 'https://api.fda.gov/download.json'
// in settings specify collection destination and what type of resource to pump
module.exports = [
  {
    mongoUrl: 'mongodb://localhost:27017/openfda-test',
    destCollectionName: 'drugEvent',
    resourcePath: 'drug.event', // path starts from results in json 'https://api.fda.gov/download.json'
    fileFilter: file => file.startsWith('https://download.open.fda.gov/drug/event/2018q1'),
    // fileFilter: file => true, // for every file in resourcePath.partitions field
    getDocId: doc => _.get(doc, 'safetyreportid'), // every resourcePath has unique path (or even combination) for doc id
  },
];
