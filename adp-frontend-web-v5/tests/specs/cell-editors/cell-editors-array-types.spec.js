const puppeteer = require('puppeteer');
const _ = require('lodash');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
} = require('../../utils');

const {
  fillArrayEditors,
  waitForGridLoaded,
  clickOutsideOfGridToTriggerSubmit,
  clickAddRowButton,
  dataGenerators: {
    randomString,
    // randomInt32,
    // randomInt64,
  }
} = require('./cell-editors.utils');

const PAGE_TO_TEST = 'cellEditingArrayTypes';

describe('Cell Editors: Array types', () => {
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
    'should create record using Array Type Editors',
    async () => {
      const record = generateRecord();

      await clickAddRowButton(this.page);
      await fillArrayEditors(record, this.page);

      await clickOutsideOfGridToTriggerSubmit(this.page);
      await waitForGridLoaded(this.page);

      const actualSnapshot = await this.page.evaluate(getRecordSnapshot, Object.keys(record));
      expect(actualSnapshot).toStrictEqual(record);
    }
  )
});

function generateRecord() {
  return {
    stringMultiple: _.range(5, 10).map(randomString).join(', '),
    // int32Array: _.range(0,2).map(randomInt32).join(', '),
    // int64Array: _.range(0,2).map(randomInt64).join(', '),
  };
}

function getRecordSnapshot(fieldNames) {
  const gridCellSelector = fieldName => `tr.dx-data-row:first-child .name-${fieldName}`;
  const queryEl = fieldName => document.querySelector(gridCellSelector(fieldName));

  return fieldNames.reduce((acc, fieldName) => {
    acc[fieldName] = queryEl(fieldName).innerText.trim();
    return acc;
  }, {});
}
