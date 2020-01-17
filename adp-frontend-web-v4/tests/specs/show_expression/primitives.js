const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    selectOptionByValue,
    clickEditButton
  },
  submit: {
    clickSubmit
  },
  interceptor: {
    getResponseForCreatedRecord
  }
} = require('../../utils');

const selectors = {
  select: '#s2id_select',
  n1: 'input#n1',
  n2: 'input#n2',
  s2: '#s2',
  b1: '[name="b1"]',
};

const getVisibilitySnapshot = selectors => {
  const hasDomElement = selector => {
    return document.querySelector(selector) !== null;
  };

  return {
    select: hasDomElement(selectors.select),
    n1: hasDomElement(selectors.n1),
    n2: hasDomElement(selectors.n2),
    s2: hasDomElement(selectors.s2),
    b1: hasDomElement(selectors.b1)
  };
};

describe('show expression', () => {
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

  describe('show expression Primitives', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showPrimitive'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'correct fields visibility for fresh form on record create',
      async () => {
        const expectedSnapshot1 = {
          select: true,
          n1: false,
          n2: false,
          s2: false,
          b1: true,
        };

        const snapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot1).toEqual(expectedSnapshot1);
      },
      TEST_TIMEOUT
    );

    test(
      'should not react to change',
      async () => {
        const expectedSnapshot1 = {
          select: true,
          n1: false,
          n2: false,
          s2: false,
          b1: true,
        };

        await selectOptionByValue('Option3', selectors.select, this.page);

        const snapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot1).toEqual(expectedSnapshot1);

        await selectOptionByValue('Option4', selectors.select, this.page);

        const snapshot2 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot2).toEqual(expectedSnapshot1);
      },
      TEST_TIMEOUT
    );

    test(
      'Should show Number1 field, than Number2',
      async () => {
        await selectOptionByValue('Option1', selectors.select, this.page);
        await this.page.waitForSelector(selectors.n1);

        let n1IsVisiblityActual = await this.page.evaluate(
          selector => document.querySelector(selector) !== null,
          selectors.n1
        );
        expect(n1IsVisiblityActual).toBe(true);

        await this.page.click(`#checkbox-label-b1`);
        await this.page.waitForSelector(selectors.n2);

        let actualN2Visibility = await this.page.evaluate(
          selector => document.querySelector(selector) !== null,
          selectors.n1
        );
        expect(actualN2Visibility).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'should calculate fields show on edit action',
      async () => {
        await selectOptionByValue('Option2', selectors.select, this.page);
        await this.page.click(`#checkbox-label-b1`);

        await clickSubmit(this.page);
        const { id } = await getResponseForCreatedRecord('helperMethods_showPrimitive', this.page);
        await clickEditButton(id, this.page);

        const expectedSnapshot = {
          select: true,
          n1: false,
          n2: true,
          s2: true,
          b1: true,
        };

        const snapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot).toEqual(expectedSnapshot);
      },
      TEST_TIMEOUT
    );
  });
});
