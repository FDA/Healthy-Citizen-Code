const puppeteer = require('puppeteer');
const _ = require('lodash');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
} = require('../../utils');

const {
  fillStringEditors,
  waitForGridLoaded,
  clickOutsideOfGridToTriggerSubmit,
  dataGenerators: {
    randomInt32,
  }
} = require('./cell-editors.utils');

const PAGE_TO_TEST = 'cellEditingCurrencyTypes';

describe('Cell Editors: Currency types', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    this.context = await this.browser.createIncognitoBrowserContext();
    this.page = await this.context.newPage();
    await loginWithUser(this.page);

    await this.page.goto(getUrlFor(PAGE_TO_TEST));
    await waitForGridLoaded(this.page);
  });

  afterAll(async () => {
    await this.page.close();
    await this.browser.close();
  });

  test(
    'should create record using Currency Cell Editors',
    async () => {
      const record = {
        usdCurrency: randomInt32(),
      };

      await this.page.click('.dx-datagrid-addrow-button');
      await fillStringEditors(record, this.page);
      await clickOutsideOfGridToTriggerSubmit(this.page);
      await waitForGridLoaded(this.page);

      const actualSnapshot = await this.page.evaluate(getRecordSnapshot, Object.keys(record));

      const expected = { usdCurrency: formatToCurrency(record.usdCurrency) };
      expect(actualSnapshot).toStrictEqual(expected);
    }
  )
});

function getRecordSnapshot(fieldNames) {
  const gridCellSelector = fieldName => `tr.dx-data-row:first-child .name-${fieldName}`;
  const queryEl = fieldName => document.querySelector(gridCellSelector(fieldName));

  return fieldNames.reduce((acc, fieldName) => {
    acc[fieldName] = queryEl(fieldName).innerText.trim();
    return acc;
  }, {});
}

function formatToCurrency(value) {
  const formatted = value
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    .replace('-', '');

  return Number(value) < 0 ? `($ ${formatted})` : `$ ${formatted}`;
}
