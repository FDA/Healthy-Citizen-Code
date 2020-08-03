const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  object: { clickObject, getFieldSelector},
  form: { clickCreateNewButton },
  submit: {getSubmitMsg, clickSubmit},
} = require('../../../../utils');

describe('complex objects', () => {
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

  describe('object is not required, there are no required fields then the form can be submitted at any point', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('complexObjects_NotRequiredObjectWithNotRequiredFields'));
      await clickCreateNewButton(this.page);
      await clickObject('object', this.page);
    });

    afterEach(async () => {
      await clickSubmit(this.page);
      const submitMsg = await getSubmitMsg(this.page);
      // TODO: change 'updated' to 'created' when its fixed
      expect(submitMsg).toBe('Not Required Object With Not Required Field has been added.');
    });

    test(
      'empty form',
      async function noop() {});

    test(
      'filled form',
      async () => {
        const string1Selector = getFieldSelector('object', 'string1');
        await this.page.waitForSelector(string1Selector);
        await this.page.type(string1Selector, '123');
        await this.page.evaluate(
          selector => document.querySelector(selector).click(),
          getFieldSelector('object', 'boolean1')
        );
      });
  });
});
