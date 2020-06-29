const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
} = require('../../utils');

const {
  fillImperialUnitsEditors,
  waitForGridLoaded,
  clickOutsideOfGridToTriggerSubmit,
} = require('./cell-editors.utils');

const PAGE_TO_TEST = 'cellEditingImperialUnitsTypes';

describe('Cell Editors: Imperial Units types', () => {
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
    'should create record using Imperial Units Cell Editors',
    async () => {
      const record = {
        imperialHeight: "1' 7''",
        imperialWeight: "6lb",
        imperialWeightWithOz: "4lb 11oz"
      };

      await this.page.click('.dx-datagrid-addrow-button');
      await fillImperialUnitsEditors(record, this.page);
      await clickOutsideOfGridToTriggerSubmit(this.page);
      await waitForGridLoaded(this.page);

      const actualSnapshot = await this.page.evaluate(getRecordSnapshot, Object.keys(record));
      expect(actualSnapshot).toStrictEqual(record);
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
