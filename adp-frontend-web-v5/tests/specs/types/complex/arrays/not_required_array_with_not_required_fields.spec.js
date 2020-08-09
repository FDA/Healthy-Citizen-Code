const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: { clickCreateNewButton },
  submit: { getSubmitMsg, clickSubmit },
  array: {
    clickArrayItem,
    getArrayFieldSelector,
    addArrayItem,
    getRemoveArrayElemSelector,
  },
  interceptor: {
    getRequestForCreatedRecord,
  }
} = require('../../../../utils');

describe('complex arrays', () => {
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

  describe('array is required, and there are no required fields', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('complexArrays_NotRequiredArrayWithNotRequiredFields'));
      await clickCreateNewButton(this.page);
      await clickArrayItem('array', 0, this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should submit array with 0 elems',
      async () => {
        const removeArrayElemSelector = getRemoveArrayElemSelector('array', 0);
        const isRemoveElemBtnEnabled = await this.page.evaluate(
          selector => document.querySelector(selector).disabled,
          removeArrayElemSelector
        );
        expect(isRemoveElemBtnEnabled).toBe(false);
        await this.page.evaluate(
          selector => document.querySelector(selector).click(),
          removeArrayElemSelector
        );

        await clickSubmit(this.page);
        const [data, submitMsg] = await Promise.all([
          getRequestForCreatedRecord(this.page),
          getSubmitMsg(this.page),
        ]);

        expect(data.array.length).toBe(0);
        expect(submitMsg).toBe('Not Required Array With Not Required Field has been added.');
        const isPostRequestSent = !!data;
        expect(isPostRequestSent).toBe(true);
      });

    test(
      'should submit array with any elements',
      async () => {
        // leave first elem empty

        // add full filled elem
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 1, this.page);
        const firstElemString1Selector = getArrayFieldSelector('array', 1, 'string1');
        await this.page.type(firstElemString1Selector, '123');
        await this.page.click(`[name="array[1]"] [ng-field-name="boolean1"] .dx-switch-handle`);

        // add partially filled item
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 2, this.page);
        const secondElemString1Selector = getArrayFieldSelector('array', 2, 'string1');
        await this.page.type(secondElemString1Selector, '123');

        await clickSubmit(this.page);

        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Not Required Array With Not Required Field has been added.');
      });
  });
});
