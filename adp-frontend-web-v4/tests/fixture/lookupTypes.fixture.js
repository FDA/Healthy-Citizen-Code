const appConfig = require('../app_config')();
const config = require('../test_config')();
const uuidv4 = require('uuid/v4');
const fetch = require('node-fetch');

const FixtureError = require('../utils/errors/fixture-error');

module.exports = async function lookupLabelFixture(page) {
  const labelText = uuidv4();
  await createRecord(labelText, page);

  return labelText;
};

async function createRecord(labelText, page) {
  const endpoint = `${appConfig.apiUrl}/basicTypes`;
  const requestInit = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'JWT ' + await getToken(page),
    },
    body: JSON.stringify({ data: { string: labelText } }),
  };

  const resp = await fetch(endpoint, requestInit);
  const json = await resp.json();

  if (!json.success) {
    throw new FixtureError('Error while creating fixture for "lookupTypes". Wrong response on record creation.');
  }
}

async function getToken(page) {
  return await page.evaluate(() => localStorage.getItem('ls.token'));
}