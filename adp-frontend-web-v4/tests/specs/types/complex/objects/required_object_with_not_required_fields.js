const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  object: { clickObject },
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
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await this.browser.close();
  });

  describe('object is not required, there are no required fields then the form can be submitted at any point', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('complexObjects_RequiredObjectWithNotRequiredFields'));
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
        expect(submitMsg).toBe('Required Object With Not Required Fields successfully added.');
      },
      TEST_TIMEOUT
    );
  });
});
