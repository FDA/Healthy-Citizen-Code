const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
} = require('../../utils');

const {
  fillListEditors,
  waitForGridLoaded,
  clickOutsideOfGridToTriggerSubmit,
  clickAddRowButton,
} = require('./cell-editors.utils');

const PAGE_TO_TEST = 'cellEditingListStringTypes';

describe('Cell Editors: List types', () => {
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
    'should create record using List Cell Editors',
    async () => {
      const record = {
        listSingle: 'val1',
        listMultiple: 'val1, val3',
        dynamicListSingle: 'val2',
        dynamicListMultiple: 'val2, val4',
      };

      await clickAddRowButton(this.page);
      await fillListEditors(record, this.page);
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
