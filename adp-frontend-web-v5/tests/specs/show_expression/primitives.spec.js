const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    clickEditButton
  },
  submit: {
    clickSubmit
  },
  interceptor: {
    getResponseForCreatedRecord
  }
} = require('../../utils');

const {
  selectDxListValue,
  getDxSingleListValue,
} = require('../../utils/select.helpers');

const selectors = {
  select: '#list_id_select',
  selectOne: '#list_id_selectOne',
  n1: '[ng-field-name="n1"]',
  n2: '[ng-field-name="n2"]',
  n3: '[ng-field-name="n3"]',
  s2: '[ng-field-name="s2"]',
  b1: '[ng-field-name="b1"]',
};

const fieldNames = {
  select: 'select',
  selectOne: 'selectOne',
}

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
  });

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
      });

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

        await selectDxListValue('Option3', fieldNames.select, this.page);

        const snapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot1).toEqual(expectedSnapshot1);

        await selectDxListValue('Option4', fieldNames.select, this.page);

        const snapshot2 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot2).toEqual(expectedSnapshot1);
      });

    test(
      'Should show Number1 field, than Number2',
      async () => {
        await selectDxListValue('Option1', fieldNames.select, this.page);
        await this.page.waitForSelector(selectors.n1);

        let n1IsVisiblityActual = await this.page.evaluate(
          selector => document.querySelector(selector) !== null,
          selectors.n1
        );
        expect(n1IsVisiblityActual).toBe(true);

        await this.page.click('[ng-field-name="b1"] [dx-switch]');
        await this.page.waitForSelector(selectors.n2);

        let actualN2Visibility = await this.page.evaluate(
          selector => document.querySelector(selector) !== null,
          selectors.n1
        );
        expect(actualN2Visibility).toBe(true);
      });

    test(
      'should calculate fields show on edit action',
      async () => {
        await this.page.click('[ng-field-name="b1"] [dx-switch]');
        await this.page.waitForSelector(selectors.selectOne);

        await selectDxListValue('Option2', fieldNames.select, this.page);
        const [{ _id }] = await Promise.all([
          getResponseForCreatedRecord('helperMethods_showPrimitive', this.page),
          clickSubmit(this.page)
        ]);

        await clickEditButton(_id, this.page);
        await this.page.waitForSelector(selectors.selectOne);

        const expectedSnapshot = {
          select: true,
          n1: false,
          n2: true,
          s2: true,
          b1: true,
        };

        const snapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot).toEqual(expectedSnapshot);
      });

    test(
      'Should auto-fill list with single value after list is dynamically shown',
      async () => {
        await this.page.click('[ng-field-name="b1"] [dx-switch]');
        await this.page.waitForSelector(selectors.selectOne);

        let autoSelected = await getDxSingleListValue(fieldNames.selectOne, this.page);

        expect(autoSelected).toBe('NumberOne');
      });
  });
});
