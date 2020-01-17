const appConfig = require('../app_config')();
const fetch = require('node-fetch');
const FixtureError = require('../utils/errors/fixture-error');

module.exports.createRecord = async function (data, resourceName, page) {
  const endpoint = `${appConfig.apiUrl}/${resourceName}`;
  const requestInit = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'JWT ' + await getToken(page),
    },
    body: JSON.stringify({ data: data }),
  };

  const resp = await fetch(endpoint, requestInit);
  const json = await resp.json();

  if (!json.success) {
    throw new FixtureError(`Error while creating fixture for "${resourceName}". Wrong response on record creation.`);
  }

  return json;
};

async function getToken(page) {
  return await page.evaluate(() => localStorage.getItem('ls.token'));
}
