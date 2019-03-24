const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  SELECTOR_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  removeSpaceChars,
  form: { clickCreateNewButton },
  submit: { getSubmitMsg, clickSubmit },
  array: {
    clickArrayItem,
    getArrayFieldErrorSelector,
    getArrayFieldSelector,
    addArrayItem,
    getRemoveArrayElemSelector,
  },
} = require('../../../../utils');

describe('complex arrays', () => {
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

        // check that array is empty
        await this.page.setRequestInterception(true);
        let isPostRequestSent = false;
        this.page.on('request', request => {
          if (
            request.method().toUpperCase() === 'POST' &&
            request.url().includes('complexArrays_NotRequiredArrayWithNotRequiredFields')
          ) {
            const { data } = JSON.parse(request.postData());
            expect(data.array.length).toBe(0);
            isPostRequestSent = true;
          }
          request.continue();
        });

        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Not Required Array With Not Required Fields successfully added.');
        expect(isPostRequestSent).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'should submit array with any elements',
      async () => {
        // leave first elem empty

        // add full filled elem
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 1, this.page);
        const firstElemString1Selector = getArrayFieldSelector('array', 1, 'string1');
        await this.page.type(firstElemString1Selector, '123');
        await this.page.evaluate(
          selector => document.querySelector(selector).click(),
          getArrayFieldSelector('array', 1, 'boolean1')
        );

        // add partially filled item
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 2, this.page);
        const secondElemString1Selector = getArrayFieldSelector('array', 2, 'string1');
        await this.page.type(secondElemString1Selector, '123');

        await clickSubmit(this.page);

        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Not Required Array With Not Required Fields successfully added.');
      },
      TEST_TIMEOUT
    );
  });
});
