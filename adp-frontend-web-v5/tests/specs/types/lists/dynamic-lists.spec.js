const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
  },
} = require('../../../utils');

const {
  selectDxListValue,
  getDxSingleListValue,
  getDxMultipleListValue,
  clearDxListValue,
  removeDxMultiSelectValue,
} = require('../../../utils/select.helpers');

const fieldNames = {
  listSingle: 'listSingle',
  listMultiple: 'listMultiple',
  listOnlyValue: 'listOnlyValue',
  listMultipleOnlyValue: 'listMultipleOnlyValue',
};

const PAGE_TO_TEST = 'listStringTypesDynamic';

async function selectValueAndAssertForSingleList(expectedValue, fieldName, page) {
  await selectDxListValue(expectedValue, fieldName, page);
  let actualValue = await getDxSingleListValue(fieldName, page);

  expect(actualValue).toBe(expectedValue);
}

async function selectValueAndAssertForMultipleList(expectedValues, fieldName, page) {
  await selectEachValue(expectedValues, fieldName, page);
  let actualValue = await getDxMultipleListValue(fieldName, page);

  expect(actualValue).toStrictEqual(expectedValues);
}

async function selectEachValue(expectedValues, fieldName, page) {
  for (const val of expectedValues) {
    await selectDxListValue(val, fieldName, page);
  }
}

describe('dynamic list types', () => {
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

  describe('dynamic list types: create action', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor(PAGE_TO_TEST));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should select correct values for String list type field',
      async () => {
        await selectValueAndAssertForSingleList('val1', fieldNames.listSingle, this.page);
        await selectValueAndAssertForSingleList('val3', fieldNames.listSingle, this.page);
      });

    test(
      'should clear selection from String list type field',
      async () => {
        await selectValueAndAssertForSingleList('val2', fieldNames.listSingle, this.page);

        await clearDxListValue(fieldNames.listSingle, this.page);
        let selectAfterClear = await getDxSingleListValue(fieldNames.listSingle, this.page);
        expect(selectAfterClear).toBe('');
      });

    test(
      'should select correct values for String[] list type',
      async () => {
        await selectValueAndAssertForMultipleList(
          ['val2', 'val1', 'val4'],
          fieldNames.listMultiple,
          this.page
        )
      });

    test(
      'should clear selected values from for String[] list type',
      async () => {
        const fieldSelector = fieldNames.listMultiple;

        await selectEachValue(['val2', 'val1', 'val4'], fieldSelector, this.page);
        await removeDxMultiSelectValue(fieldSelector, 'val1', this.page);

        let actualValue = await getDxMultipleListValue(fieldSelector, this.page);
        expect(actualValue).toStrictEqual(['val2', 'val4']);
      });

    test(
      'should auto-select required field with only value in the list',
      async () => {
        let autoSelected = await getDxSingleListValue(fieldNames.listOnlyValue, this.page);
        expect(autoSelected).toBe('onlyValue');
      });


    test(
      'should auto-select required field with only value in the multiple list',
      async () => {
        let autoSelected = await getDxMultipleListValue(fieldNames.listMultipleOnlyValue, this.page);
        expect(autoSelected).toStrictEqual(['onlyValue']);
      });
  });
});
