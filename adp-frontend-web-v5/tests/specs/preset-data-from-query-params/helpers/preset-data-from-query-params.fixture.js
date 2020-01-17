const { getUrlFor } = require('../../../utils');

const { createRecord } = require('../../../utils/api-helpers');
const uuidv4 = require('uuid/v4');

module.exports = async function queryParamsFixture(testPage, page) {
  const fixtureData = { string: uuidv4() };

  await goToPageToAccessLocalStorage(testPage, page);
  const { id } = await createRecord(fixtureData, testPage, page);

  return { _id: id, ...fixtureData };
};

async function goToPageToAccessLocalStorage(url, page) {
  await page.goto(getUrlFor(url));
}
