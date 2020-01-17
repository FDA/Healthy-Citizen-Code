const puppeteer = require('puppeteer');

const {
  SELECTOR_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  removeSpaceChars,
  object: { clickObject, getFieldErrorSelector, getFieldSelector },
  form: { clickCreateNewButton },
  submit: { getSubmitMsg, clickSubmit },
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

  describe('object is required, there are required fields then the entire form cannot be submitted until the required fields in the object are populated.', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('complexObjects_RequiredObjectWithRequiredFields'));
      await clickCreateNewButton(this.page);
      await clickObject('object', this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should not submit empty object',
      async () => {
        await clickSubmit(this.page);

        const boolean1MsgSelector = getFieldErrorSelector('object', 'boolean1');
        await this.page.waitFor(boolean1MsgSelector, {
          timeout: SELECTOR_TIMEOUT,
        });

        const boolean1ErrorText = await this.page.$eval(boolean1MsgSelector, el => el.innerText);
        expect(removeSpaceChars(boolean1ErrorText)).toBe('Boolean 1 is required.');
      });

    test(
      'should not submit object with filled non-required fields',
      async () => {
        // fill non-required field
        const string1Selector = getFieldSelector('object', 'string1');
        await this.page.type(string1Selector, '123');

        await clickSubmit(this.page);
        const boolean1ErrSelector = getFieldErrorSelector('object', 'boolean1');
        await this.page.waitFor(boolean1ErrSelector, {
          timeout: SELECTOR_TIMEOUT,
        });

        const boolean1Error = await this.page.$eval(boolean1ErrSelector, el => el.innerText);
        expect(removeSpaceChars(boolean1Error)).toBe('Boolean 1 is required.');
      });

    test(
      'should submit object with filled required fields',
      async () => {
        // click required checkbox
        const boolean1Selector = getFieldSelector('object', 'boolean1');
        await this.page.evaluate(
          selector => document.querySelector(selector).click(),
          boolean1Selector
        );
        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Required Object With Required Fields successfully added.');
      });
  });
});
