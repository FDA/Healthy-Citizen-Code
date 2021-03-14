const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: { clickCreateNewButton },
  object: { clickObject },
} = require('../../utils');

const selectors = {
  s2: '[name="s2"]',
  b2: '[name="b2"]',
};

const getVisibilitySnapshot = selectors => {
  const hasDomElement = selector => {
    return document.querySelector(selector) !== null;
  };

  return {
    s2: hasDomElement(selectors.s2),
    b2: hasDomElement(selectors.b2),
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

  describe('show expression for Objects', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showObjects'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should render only b2 inside nested objects',
      async () => {
        await clickObject('o1', this.page);
        await clickObject('o2', this.page);

        const expectedSnapshot = {
          s2: false,
          b2: true,
        };

        const actualSnapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualSnapshot).toEqual(expectedSnapshot);
      });

    test(
      'should show s2 inside nested objects',
      async () => {
        await clickObject('o1', this.page);
        await clickObject('o2', this.page);

        const expectedSnapshot = {
          s2: true,
          b2: true,
        };
        await this.page.click('[ng-field-name="b2"] .dx-switch-handle');
        await this.page.waitForTimeout(200);

        const actualSnapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualSnapshot).toEqual(expectedSnapshot);
      });
  });
});
