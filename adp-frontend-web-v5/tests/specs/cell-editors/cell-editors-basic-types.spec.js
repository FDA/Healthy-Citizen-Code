const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
} = require('../../utils');

const {
  fillListEditor,
  fillStringEditors,
  waitForGridLoaded,
  clickOutsideOfGridToTriggerSubmit,
  clickAddRowButton,
  dataGenerators: {
    randomString,
  }
} = require('./cell-editors.utils');

const PAGE_TO_TEST = 'cellEditingBasicTypes';

describe('Cell Editors: basic types', () => {
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
    'should create record using Basic Cell Editors',
    async () => {
      const record = {
        string: randomString(),
        text: randomString(),
        email: `${randomString()}@${randomString()}`,
        phone: '212-234-5678',
      };

      const boolean = { boolean: 'Yes' }

      await clickAddRowButton(this.page);

      await fillStringEditors(record, this.page);
      await fillListEditor(boolean.boolean, 'boolean', this.page);

      await clickOutsideOfGridToTriggerSubmit(this.page);
      await waitForGridLoaded(this.page);

      const expected = { ...record, ...boolean };
      const actualSnapshot = await this.page.evaluate(getRecordSnapshot, Object.keys(expected));
      expect(actualSnapshot).toStrictEqual(expected);
    }
  )
});

function getRecordSnapshot(fieldNames) {
  const gridCellSelector = fieldName => `tr.dx-data-row:first-child .name-${fieldName}`;
  const queryEl = fieldName => document.querySelector(gridCellSelector(fieldName));

  let result = fieldNames.reduce((acc, fieldName) => {
    acc[fieldName] = queryEl(fieldName).innerText.trim();
    return acc;
  }, {});

  const booleanCell = queryEl('boolean');
  result.boolean = booleanCell.querySelector('.fa-check-square-o') === null ? 'No' : 'Yes';

  return result;
}
