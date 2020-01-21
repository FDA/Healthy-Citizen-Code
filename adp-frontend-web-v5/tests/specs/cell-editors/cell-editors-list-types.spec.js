const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  interceptor: {
    getResponseForCreatedRecord
  }
} = require('../../utils');

const { selectDxListValueWithParent }  = require('../../utils/select.helpers');
const { waitForGridLoaded } = require('../../utils/grid.helpers');

const PAGE_TO_TEST = 'cellEditingListTypes';

async function fillListCellEditor(fieldData, fieldName, page) {
  const parentRowSelector = '.dx-data-row:first-child';
  await page.waitForSelector(`#list_id_${fieldName}`);

  for (const val of fieldData) {
    await selectDxListValueWithParent(val, fieldName, parentRowSelector, page)
  }
}

const getRecordSnapshot = (fieldNames, recordId) => {
  const parentRow = document.querySelector(`.table-action[adp-${recordId}]`).closest('tr');

  const queryForCell = fieldName => {
    const cellSelector = `.name-${fieldName}`;
    return parentRow.querySelector(cellSelector);
  };

  let result = {};

  fieldNames.forEach(name => {
    const el = queryForCell(name);
    result[name]  = el.innerText.trim();
  });

  return result;
}

const activateNextEditor = async page => page.keyboard.press('Tab');

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

  // keep order
  const listsRecord = {
    listSingle: 'val1',
    listMultiple: 'val1, val3',
    dynamicListSingle: 'val2',
    dynamicListMultiple: 'val2, val4',
  }

  test(
    'should create record using List Cell Editors',
    async () => {
      await this.page.click('.dx-datagrid-addrow-button');

      for (const [fieldName, value] of Object.entries(listsRecord)) {
        const arrayOfValues = value.split(', ');
        await fillListCellEditor(arrayOfValues, fieldName, this.page);
        await activateNextEditor(this.page);
      }

      const clickOutsideOfGridToTriggerSubmit = async () => await this.page.click('body');
      await clickOutsideOfGridToTriggerSubmit();

      const { _id } = await getResponseForCreatedRecord(PAGE_TO_TEST, this.page);
      await waitForGridLoaded(this.page);

      const actualSnapshot = await this.page.evaluate(getRecordSnapshot, Object.keys(listsRecord), _id);
      expect(actualSnapshot).toStrictEqual(listsRecord);
    }
  )
});
