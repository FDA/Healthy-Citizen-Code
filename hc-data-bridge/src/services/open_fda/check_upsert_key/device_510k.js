const _ = require('lodash');
const fs = require('fs');
const es = require('event-stream');
const JSONStream = require('JSONStream');
// const devices = [];
const devices = {};
const devices2 = {};
const devices3 = {};

(async () => {
  await new Promise(resolve => {
    const readStream = fs.createReadStream('/home/andy/Downloads/device-510k-0001-of-0001.json');
    readStream
      .pipe(JSONStream.parse('results.*'))
      .on('data', (r) => {
        const key = r.kNumber + r.deviceName + r.applicant; // 152330 - all elems
        const key2 = r.kNumber + r.deviceName; // 152330 - all elems
        const key3 = r.kNumber; // 152330 - all elems
        console.log(r.kNumber)
        devices[key] =  (devices[key] || 0) + 1;
        devices2[key2] =  (devices2[key2] || 0) + 1;
        devices3[key3] =  (devices3[key3] || 0) + 1;
      })
      .on('end', () => {
        console.log(Object.keys(devices).length);
        console.log(Object.keys(devices2).length);
        console.log(Object.keys(devices3).length);
        resolve();
      });
  });

})();

