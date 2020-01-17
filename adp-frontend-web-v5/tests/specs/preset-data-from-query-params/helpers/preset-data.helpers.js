const _ = require('lodash');
const { getUrlFor } = require('../../../utils');

module.exports.openPageAndPresetData = async function ({ url, dataToPreset, selectorToWait }, page) {
  const urlWithQueryParams = `${url}?` + dataToQueryParams(dataToPreset);
  await page.goto(getUrlFor(urlWithQueryParams));
  await page.reload({ waitUntil: 'load' });

  await page.waitForSelector(selectorToWait);
};

function dataToQueryParams(data) {
  let result = [];
  for (const [key, val] of Object.entries(data)) {
    result.push(encodePart(key, val));
  }

  return result.join('&');
}

function encodePart(key, val) {
  if (_.isArray(val)) {
    return val.map(v => encodePart(key, v)).join('&');
  } else {
    return `${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
  }
}
