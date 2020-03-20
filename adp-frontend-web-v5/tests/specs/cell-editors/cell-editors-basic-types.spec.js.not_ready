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

const PAGE_TO_TEST = 'cellEditingBasicTypes';

function getGridCellSelector(fieldName) {
  return `.dx-data-row:first-child .name-${fieldName}`;
}

function getGridEditorSelector(fieldName) {
  const cellSelector = getGridCellSelector(fieldName);
  return `${cellSelector} .dx-texteditor-input`;
}

async function fillBasicStringEditors(recordData, fieldNames, page) {
  for await (const fieldName of fieldNames) {
    const gridEditorSelector = getGridEditorSelector(fieldName);
    await page.waitFor(gridEditorSelector);

    const value = recordData[fieldName];
    await page.type(gridEditorSelector, value);
    await activateNextEditor(page);
  }
}

async function fillListCellEditor(fieldData, fieldName, page) {
  const parentRowSelector = '.dx-data-row:first-child';

  for (const val of fieldData) {
    await selectDxListValueWithParent(val, fieldName, parentRowSelector, page)
  }
}

async function fillStringMultipleEditor(data, fieldName, page) {
  const editorSelector = getGridEditorSelector(fieldName);

  for await (const value of data.split(', ')) {
    await page.type(editorSelector, value);
    await page.keyboard.press('Enter');
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

  const booleanCell = queryForCell('boolean');
  result.boolean = booleanCell.querySelector('.fa-check') !== null ? 'Yes' : 'No';
  result.stringMultiple = queryForCell('stringMultiple').innerText.trim();

  return result;
}

const randomString = (alphabetRE = /[^a-z]+/g, length = 5) => {
  return Math.random().toString(36).replace(alphabetRE, '').substr(0, length);
};
const randomNumberStringOfLenNine = () => {
  const num = Math.floor((Math.random() + Math.floor(Math.random()*9)+1) * Math.pow(10, 8));
  return num.toString();
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

  const record = {
    string: randomString(),
    text: randomString(),
    email: `${randomString()}@${randomString()}`,
    phone: '8999999999',
    number: randomNumberStringOfLenNine(),
    boolean: 'Yes',
    stringMultiple: [randomString(), randomString()].join(', '),
  }

  test(
    'should create record using Basic Cell Editors',
    async () => {
      await this.page.click('.dx-datagrid-addrow-button');

      const basicStringEditors = ['string', 'text', 'email', 'phone', 'number'];
      await fillBasicStringEditors(record, basicStringEditors, this.page);

      await fillListCellEditor([record.boolean], 'boolean', this.page);

      await activateNextEditor(this.page);
      await fillStringMultipleEditor(record['stringMultiple'], 'stringMultiple', this.page);


      const clickOutsideOfGridToTriggerSubmit = async () => await this.page.click('body');
      await clickOutsideOfGridToTriggerSubmit();

      const { _id } = await getResponseForCreatedRecord(PAGE_TO_TEST, this.page);
      await waitForGridLoaded(this.page);

      const actualSnapshot = await this.page.evaluate(getRecordSnapshot, Object.keys(record), _id);
      expect(actualSnapshot).toStrictEqual(record);
    }
  )
});
