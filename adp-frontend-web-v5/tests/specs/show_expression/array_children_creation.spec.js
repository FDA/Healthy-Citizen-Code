const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  array: {
    clickArrayItem,
    addArrayItem
  },
  form: {
    clickCreateNewButton
  },
} = require('../../utils');

const selectorsChild0 = {
  a1: '[name="a1[0]"]',
  s1: '[name="a1[0]"] [name="s1"]',
  b1: '[name="a1[0]"] [ng-field-name="b1"]'
};

const selectorsChild1 = {
  a1: '[name="a1[1]"]',
  s1: '[name="a1[1]"] [name="s1"]',
  b1: '[name="a1[1]"] [ng-field-name="b1"]'
};

const getVisibilitySnapshot = selectors => {
  const hasDomElement = selector => document.querySelector(selector) !== null;

  return {
    a1: hasDomElement(selectors.a1),
    s1: hasDomElement(selectors.s1),
    b1: hasDomElement(selectors.b1),
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

  describe('show expression: array child should calculate show values independently from siblings', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showArrayChildCreation'));
      await clickCreateNewButton(this.page);
      await clickArrayItem('a1', 0, this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'newly created items should have its own show attribute values',
      async () => {
        const clickCheckboxByIndex = async (index) => {
          let checkboxSelector = `[name="a1[${index}]"] [ng-field-name="b1"] .dx-checkbox-icon`;
          await this.page.click(checkboxSelector);
        };

        await clickCheckboxByIndex(0);
        await addArrayItem('a1', this.page);
        await clickArrayItem('a1', 1, this.page);

        const childrenVisible = {
          a1: true,
          s1: true,
          b1: true
        };

        const onlyS1Hidden = {
          a1: true,
          s1: false,
          b1: true
        };

        const snapshotChild0 = await this.page.evaluate(getVisibilitySnapshot, selectorsChild0);
        expect(snapshotChild0).toEqual(childrenVisible);

        const snapshotChild1 = await this.page.evaluate(getVisibilitySnapshot, selectorsChild1);
        expect(snapshotChild1).toEqual(onlyS1Hidden);

        await clickCheckboxByIndex(0);
        await clickCheckboxByIndex(1);

        const snapshotChild0After = await this.page.evaluate(getVisibilitySnapshot, selectorsChild0);
        expect(snapshotChild0After).toEqual(onlyS1Hidden);

        const snapshotChild1After = await this.page.evaluate(getVisibilitySnapshot, selectorsChild1);
        expect(snapshotChild1After).toEqual(childrenVisible);
      })
  });
});
