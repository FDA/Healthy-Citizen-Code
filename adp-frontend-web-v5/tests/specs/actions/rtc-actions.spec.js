const puppeteer = require('puppeteer');
const appConfig = require('../../app_config')();
const fetch = require('node-fetch');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  getToken,
} = require('../../utils');

const PAGE_TO_TEST = 'basicTypes';
const waitForGridLoaded = async (page) => page.waitForTimeout(2000);

async function emulateSocketIoMessage(page) {
  const endpoint = appConfig.apiUrl + '/socket-io-test';
  const data = {
    data: {change: 'recordcreated', collection: PAGE_TO_TEST},
    type: 'database'
  }
  const requestInit = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'JWT ' + await getToken(page),
    },
    body: JSON.stringify(data),
  };

  const resp = await fetch(endpoint, requestInit);
  const json = await resp.json();

  if (!json.data) {
    throw new Error(`Response on ${endpoint} is not successful`);
  }

  return json;
}

describe('RTC Actions', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    this.context = await this.browser.createIncognitoBrowserContext();
    const page = await this.context.newPage();
    await loginWithUser(page);
    await page.close();
  });

  afterAll(async () => {
    await this.browser.close();
  });

  beforeEach(async () => {
    this.page = await this.context.newPage();
    await this.page.goto(getUrlFor(PAGE_TO_TEST));

    await waitForGridLoaded(this.page);
  })

  test(
    'should notify about record creation upon socket message',
    async () => {
      const modalTitleSelector = 'h3.modal-title';

      await Promise.all([
        emulateSocketIoMessage(this.page),
        this.page.waitForSelector(modalTitleSelector),
      ]);

      const messageContent = await this.page.$eval(modalTitleSelector, title => title.innerText);

      expect(messageContent).toEqual('New record has been added to this collection by another user');
    });
});
