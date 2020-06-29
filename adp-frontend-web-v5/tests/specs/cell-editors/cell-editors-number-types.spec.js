const puppeteer = require('puppeteer');

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
    randomInt64,
    randomInt32Positive,
    randomInt64Positive,
  }
} = require('./cell-editors.utils');

const PAGE_TO_TEST = 'cellEditingBasicNumberTypes';

describe('Cell Editors: Number types', () => {
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
    'should create record using Number Cell Editors',
    async () => {
      let record = generateTestRecord();

      await this.page.click('.dx-datagrid-addrow-button');
      await fillStringEditors(record, this.page);

      await clickOutsideOfGridToTriggerSubmit(this.page);
      await waitForGridLoaded(this.page);

      const actualSnapshot = await this.page.evaluate(getRecordSnapshot, Object.keys(record));
      expect(actualSnapshot).toStrictEqual(record);
    }
  );
});

function generateTestRecord() {
  let record = {
    number: `${randomInt32()}.${randomInt32Positive()}`.replace(/0+$/, ''),
    double: `${randomInt32()}.${randomInt32Positive()}`.replace(/0+$/, ''),
    int32: `${randomInt32()}`,
    int64: `${randomInt64()}`,
    decimal128: `${randomInt64()}.${randomInt64Positive()}`.replace(/0+$/, ''),
  };

  return Object.entries(record).reduce((acc, [key, val]) => {
    const MAX_LENGTH_OF_DX_NUMBER = 15;
    acc[key] = val.slice(0, MAX_LENGTH_OF_DX_NUMBER);
    return acc;
  }, {});
}

function getRecordSnapshot(fieldNames) {
  const gridCellSelector = fieldName => `tr.dx-data-row:first-child .name-${fieldName}`;
  const queryEl = fieldName => document.querySelector(gridCellSelector(fieldName));

  return fieldNames.reduce((acc, fieldName) => {
    acc[fieldName] = queryEl(fieldName).innerText.trim();
    return acc;
  }, {});
}
