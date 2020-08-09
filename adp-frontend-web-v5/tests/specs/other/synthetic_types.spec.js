const puppeteer = require('puppeteer');
const {
  getLaunchOptions,
  form: { clickCreateNewButton },
  loginWithUser,
  getUrlFor,
} = require('../../utils');

describe('synthetic types', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    const context = await this.browser.createIncognitoBrowserContext();
    this.page = await context.newPage();
    await loginWithUser(this.page);
  });

  afterAll(async () => {
    await this.browser.close();
  });

  test(
    'synthetic types',
    async () => {
      await this.page.goto(getUrlFor('syntheticTypes'));
      await clickCreateNewButton(this.page)
      const createButtonSelector = '.btn.page-action';
      await this.page.waitFor(createButtonSelector);
      await this.page.click(createButtonSelector);
      await this.page.waitFor('form');

      const selectors = {
        number1Selector: '[field-name-input="number1"]',
        number2Selector: '[field-name-input="number2"]',
        number3Selector: '[ng-field-name="number3"] .input span',
        sumPlusIncrementSelector: '[ng-field-name="sumPlusIncrement"] .input span',
        sumPlusIncrementWithWatchSelector:
          '[ng-field-name="sumPlusIncrementWithWatch"] .input span',
        randomStringSelector: '[ng-field-name="randomString"] .input div',
      };

        const getSnapshot = selectors => {
        return {
          number1: document.querySelector(selectors.number1Selector).value,
          number2: document.querySelector(selectors.number2Selector).value,
          number3: document.querySelector(selectors.number3Selector).innerText,
          sumPlusIncrement: document.querySelector(selectors.sumPlusIncrementSelector).innerText,
          sumPlusIncrementWithWatch: document.querySelector(
            selectors.sumPlusIncrementWithWatchSelector
          ).innerText,
          randomString: document.querySelector(selectors.randomStringSelector).innerText,
        };
      };

      const expectedSnapshot1 = expect.objectContaining({
        number1: '',
        number2: '',
        number3: '0',
        sumPlusIncrement: 'sumPlusOneFormRenderer',
        sumPlusIncrementWithWatch: '0',
        randomString: expect.any(String),
      });
      const snapshot1 = await this.page.evaluate(getSnapshot, selectors);
      expect(snapshot1).toEqual(expectedSnapshot1);

      await this.page.type(selectors.number1Selector, '1');
      await this.page.waitFor(300);
      const snapshot2 = await this.page.evaluate(getSnapshot, selectors);
      const expectedSnapshot2 = expect.objectContaining({
        ...expectedSnapshot1.sample,
        number1: '1',
        number3: '1',
        sumPlusIncrementWithWatch: '1',
        randomString: snapshot1.randomString,
      });

      expect(snapshot2).toEqual(expectedSnapshot2);

      await this.page.type(selectors.number2Selector, '1');
      await this.page.waitFor(300);
      const snapshot3 = await this.page.evaluate(getSnapshot, selectors);
      const expectedSnapshot3 = expect.objectContaining({
        ...expectedSnapshot2.sample,
        number2: '1',
        number3: '2',
        sumPlusIncrementWithWatch: '2',
        randomString: expect.not.stringContaining(snapshot2.randomString),
      });
      expect(snapshot3).toEqual(expectedSnapshot3);
    });
});
