const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    selectOptionByValue,
    singleSelectValue,
    clearSelectValue,
    multiSelectValue,
    removeMultiSelectValue
  },
} = require('../../../utils');

const fieldSelectors = {
  listSingle: '#s2id_listSingle',
  listMultiple: '#s2id_listMultiple'
};

describe('list types', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    this.context = await this.browser.createIncognitoBrowserContext();
    const page = await this.context.newPage();
    await loginWithUser(page);
    await page.close();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await this.browser.close();
  });

  describe('list types: create action', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('listTypes'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should select correct values for String list type field',
      async () => {
        await selectOptionByValue('val1', fieldSelectors.listSingle, this.page);
        let selectedActual1 = await singleSelectValue(fieldSelectors.listSingle, this.page);

        expect(selectedActual1).toBe('val1');

        await selectOptionByValue('val3', fieldSelectors.listSingle, this.page);
        let selectedActual2 = await singleSelectValue(fieldSelectors.listSingle, this.page);

        expect(selectedActual2).toBe('val3');
      },
      TEST_TIMEOUT
    );

    test(
      'should clear selection from String list type field',
      async () => {
        await selectOptionByValue('val2', fieldSelectors.listSingle, this.page);
        let selectValue = await singleSelectValue(fieldSelectors.listSingle, this.page);
        expect(selectValue).toBe('val2');

        await clearSelectValue(fieldSelectors.listSingle, this.page);
        let selectAfterClear = await singleSelectValue(fieldSelectors.listSingle, this.page);
        expect(selectAfterClear).toBe('');
      },
      TEST_TIMEOUT
    );

    test(
      'should select correct values for String[] list type',
      async () => {
        const fieldSelector = fieldSelectors.listMultiple;

        await selectOptionByValue('val2', fieldSelector, this.page);
        let selectValue1 = await multiSelectValue(fieldSelector, this.page);
        expect(selectValue1).toEqual(['val2']);

        await selectOptionByValue('val1', fieldSelector, this.page);
        let selectValue2 = await multiSelectValue(fieldSelector, this.page);
        expect(selectValue2).toEqual(['val2', 'val1']);

        await selectOptionByValue('val4', fieldSelector, this.page);
        let selectValue3 = await multiSelectValue(fieldSelector, this.page);
        expect(selectValue3).toEqual(['val2', 'val1', 'val4']);
      },
      TEST_TIMEOUT
    );

    test(
      'should clear selected values from for String[] list type',
      async () => {
        const fieldSelector = fieldSelectors.listMultiple;

        await selectOptionByValue('val2', fieldSelector, this.page);
        await selectOptionByValue('val1', fieldSelector, this.page);
        await selectOptionByValue('val4', fieldSelector, this.page);

        await removeMultiSelectValue(fieldSelector, 'val1', this.page);
        let selectValue1 = await multiSelectValue(fieldSelector, this.page);
        expect(selectValue1).toEqual(['val2', 'val4']);
      },
      TEST_TIMEOUT
    );
  });
});
