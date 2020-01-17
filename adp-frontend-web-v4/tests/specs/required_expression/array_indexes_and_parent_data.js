const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    selectOptionByValue,
  },
  submit: {
    clickSubmit
  },
  array: {
    clickArrayItem
  }
} = require('../../utils');

const isRequired = s => {
  return document.querySelector(`${s} [ng-message="required"]`) !== null;
};

const isArrayRequired = selector => {
  const s = `${selector} adp-required-mark span`;
  const el = document.querySelector(s);

  if (el === null) {
    return false;
  }

  return el.offsetParent !== null;
};

describe('required expression', () => {
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

  describe('required expression for array with indexes', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_requiredArraysWithIndexes'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should show required for first a2[0] and for a2[0].s20 child of it',
      async () => {
        await clickArrayItem('a1', 0, this.page);
        await clickArrayItem('a2', 0, this.page);
        const selectorS1 = '#s2id_s1';
        const selectorS2 = '#s2id_s2';

        await selectOptionByValue('o11', selectorS1, this.page);
        await selectOptionByValue('o21', selectorS2, this.page);
        await clickSubmit(this.page);

        let actualRequired = await Promise.all([
          this.page.evaluate(isRequired, '[ng-field-name="s20"]'),
          this.page.evaluate(isArrayRequired, '[name="a2[0]"]'),
        ]);

        expect(actualRequired).toEqual([true, true]);
      },
      TEST_TIMEOUT
    );

    test(
      'should show required for first a3[0].s30',
      async () => {
        await clickArrayItem('a1', 0, this.page);
        await clickArrayItem('a2', 0, this.page);
        await clickArrayItem('a3', 0, this.page);

        const selectorS30 = '#s2id_s30';
        await selectOptionByValue('o22', selectorS30, this.page);
        await clickSubmit(this.page);

        let actualRequired = await this.page.evaluate(isRequired, '[ng-field-name="s3"]');
        expect(actualRequired).toBe(true);
      },
      TEST_TIMEOUT
    );
  });
});
