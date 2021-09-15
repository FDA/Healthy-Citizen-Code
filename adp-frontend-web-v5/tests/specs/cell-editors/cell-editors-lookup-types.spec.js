const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
} = require('../../utils');

const { lookupLabelFixture } = require('../types/lookups/lookupTypes.fixture');

const {
  fillLookupEditors,
  waitForGridLoaded,
  clickOutsideOfGridToTriggerSubmit,
  clickAddRowButton,
} = require('./cell-editors.utils');

const PAGE_TO_TEST = 'cellEditingLookupTypes';

describe('Cell Editors: Lookup types', () => {
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
    'should create record using Lookup Cell Editors',
    async () => {
      const lookupLabel = await lookupLabelFixture(this.page);
      const record = {
        objectId: lookupLabel,
        objectIdSortByStringDesc: lookupLabel,
        objectIdWitTables: lookupLabel,
        objectIds: lookupLabel,
        objectIdsWithMultipleTables: lookupLabel,
      };

      await clickAddRowButton(this.page);
      await this.page.waitForSelector(".adp-lookup-selector");
      await fillLookupEditors(record, this.page);
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
  const getValueWithoutTablePrefix = val => {
    const [tablePart, valPart] = val.split(' | ');
    return valPart ? valPart : tablePart;
  }
  return fieldNames.reduce((acc, fieldName) => {
    acc[fieldName] = getValueWithoutTablePrefix(queryEl(fieldName).innerText.trim());
    return acc;
  }, {});
}
