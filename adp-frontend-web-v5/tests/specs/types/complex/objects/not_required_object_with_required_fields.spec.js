const puppeteer = require('puppeteer');

const {
  SELECTOR_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  removeSpaceChars,
  object: { clickObject, getFieldErrorSelector, getObjectErrorSelect, getFieldSelector },
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
      await this.page.goto(getUrlFor('complexObjects_NotRequiredObjectWithRequiredFields'));
      await clickCreateNewButton(this.page);
      await clickObject('object', this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should submit empty object',
      async () => {
        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        // TODO: change 'updated' to 'created' when its fixed
        expect(submitMsg).toBe('Not Required Object With Required Fields successfully added.');
      });

    test(
      'should not submit object with filled non-required field and empty required field',
      async () => {
        const string2Selector = `${getFieldSelector('object', 'string2')} input`;
        await this.page.waitForSelector(string2Selector);
        await this.page.type(string2Selector, '123');
        await clickSubmit(this.page);

        const objectErrorSelector = getObjectErrorSelect('object');
        const string1ErrorSelector = getFieldErrorSelector('object', 'string1');
        await this.page.waitFor(string1ErrorSelector, {
          timeout: SELECTOR_TIMEOUT,
        });

        const string1ErrorText = await this.page.$eval(string1ErrorSelector, el => el.innerText);
        const objectErrorText = await this.page.$eval(objectErrorSelector, el => el.innerText);
        expect(removeSpaceChars(objectErrorText)).toBe('1 error found.');
        expect(removeSpaceChars(string1ErrorText)).toBe('String 1 is required.');
      });

    test(
      'should submit object with filled non-required and required field',
      async () => {
        const string1Selector = getFieldSelector('object', 'string1');
        await this.page.waitForSelector(string1Selector);
        await this.page.type(string1Selector, '123');
        const string2Selector = getFieldSelector('object', 'string2');
        await this.page.waitForSelector(string2Selector);
        await this.page.type(string2Selector, '123');

        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        // TODO: change 'updated' to 'created' when its fixed
        expect(submitMsg).toBe('Not Required Object With Required Fields successfully added.');
      });
  });
});
