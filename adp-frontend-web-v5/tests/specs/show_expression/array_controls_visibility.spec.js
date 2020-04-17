const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  array: {
    getRemoveArrayElemSelector
  },
  form: {
    clickCreateNewButton
  },
} = require('../../utils');

const selectors = {
  label: '[field-container="a1"] label',
  arrayAddItemBtn: '[field-container="a1"] .js-array-add-item-btn',
};


const getVisibilitySnapshot = selectors => {
  const hasDomElement = selector => document.querySelector(selector).offsetParent !== null;

  return {
    label: hasDomElement(selectors.label),
    arrayAddItemBtn: hasDomElement(selectors.arrayAddItemBtn),
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

  describe('show expression: array child should show/hide controls', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showArrayControlsVisibility'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should not show Array label and AddItem button if show is false',
      async () => {
        const expected = {
          label: false,
          arrayAddItemBtn: false,
        };

        const actual = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actual).toEqual(expected)
      });

    test(
      'should show Array label and AddItem button if show is true',
      async () => {
        await this.page.click('[ng-field-name="b1"] .dx-checkbox-icon');

        const expected = {
          label: true,
          arrayAddItemBtn: true,
        };

        const actual = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actual).toEqual(expected)
      });

    test(
      'should show Array label and AddItem button if array has no items',
      async () => {
        await this.page.click('[ng-field-name="b1"] .dx-checkbox-icon');
        const removeArrayElemSelector = getRemoveArrayElemSelector('a1', 0);
        await this.page.click(removeArrayElemSelector);

        const expected = {
          label: true,
          arrayAddItemBtn: true,
        };

        const actual = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actual).toEqual(expected);
      });
  });
});
