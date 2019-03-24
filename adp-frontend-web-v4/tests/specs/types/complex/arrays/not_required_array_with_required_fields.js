const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
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

  describe('array is not required, there are required fields', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('complexArrays_NotRequiredArrayWithRequiredFields'));
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
            request.url().includes('complexArrays_NotRequiredArrayWithRequiredFields')
          ) {
            const { data } = JSON.parse(request.postData());
            expect(data.array.length).toBe(0);
            isPostRequestSent = true;
          }
          request.continue();
        });

        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        // TODO: change 'updated' to 'created' when its fixed
        expect(submitMsg).toBe('Not Required Array With Required Fields successfully added.');
        expect(isPostRequestSent).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'should submit the array with filled required fields and empty elements',
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

        // add item with filled required field
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 2, this.page);
        await this.page.evaluate(
          selector => document.querySelector(selector).click(),
          getArrayFieldSelector('array', 2, 'boolean1')
        );

        // check that first empty element is not sent
        await this.page.setRequestInterception(true);
        let isPostRequestSent = false;
        this.page.on('request', request => {
          if (
            request.method().toUpperCase() === 'POST' &&
            request.url().includes('complexArrays_NotRequiredArrayWithRequiredFields')
          ) {
            const { data } = JSON.parse(request.postData());
            expect(data.array.length).toBe(2);
            expect(data.array[0].string1).toBe('123');
            expect(data.array[1].boolean1).toBe(true);
            isPostRequestSent = true;
          }
          request.continue();
        });

        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Not Required Array With Required Fields successfully added.');
        expect(isPostRequestSent).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'should not submit if the array has elements one of which is not empty and has no filled required fields',
      async () => {
        // add full filled elem
        const firstElemString1Selector = getArrayFieldSelector('array', 0, 'string1');
        await this.page.type(firstElemString1Selector, '123');
        await this.page.evaluate(
          selector => document.querySelector(selector).click(),
          getArrayFieldSelector('array', 0, 'boolean1')
        );

        // add partially filled item
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 1, this.page);
        const secondElemString1Selector = getArrayFieldSelector('array', 1, 'string1');
        await this.page.type(secondElemString1Selector, '123');

        await clickSubmit(this.page);

        const [arrayElemErr] = await this.page.evaluate(
          selectors => selectors.map(s => document.querySelector(s).innerText),
          [getArrayFieldErrorSelector('array', 1, 'boolean1')]
        );
        expect(removeSpaceChars(arrayElemErr)).toBe('Boolean 1 is required.');
      },
      TEST_TIMEOUT
    );
  });
});
