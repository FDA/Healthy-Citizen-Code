const puppeteer = require('puppeteer');

const {
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
  interceptor: {
    getRequestForCreatedRecord,
  }
} = require('../../../../utils');

const clickCheckboxForArrayIndex = async (index, name) => {
  await this.page.click(`[name="array[${index}]"] [ng-field-name="${name}"] .dx-checkbox-icon`);
}

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

        await clickSubmit(this.page);

        const [data, submitMsg] = await Promise.all([
          getRequestForCreatedRecord(this.page),
          getSubmitMsg(this.page),
        ]);

        expect(data.array.length).toBe(0);
        expect(submitMsg).toBe('Not Required Array With Required Fields successfully added.');

        const isPostRequestSent = !!data;
        expect(isPostRequestSent).toBe(true);
      });

    test(
      'should submit the array with filled required fields and empty elements',
      async () => {
        // leave first elem empty

        // add full filled elem
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 1, this.page);
        const firstElemString1Selector = `${getArrayFieldSelector('array', 1, 'string1')} input`;
        await this.page.type(firstElemString1Selector, '123');
        await clickCheckboxForArrayIndex(1, 'boolean1');

        // add item with filled required field
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 2, this.page);
        await clickCheckboxForArrayIndex(2, 'boolean1');

        await clickSubmit(this.page);

        const [data, submitMsg] = await Promise.all([
          getRequestForCreatedRecord(this.page),
          getSubmitMsg(this.page),
        ]);

        expect(data.array.length).toBe(2);
        expect(data.array[0].string1).toBe('123');
        expect(data.array[1].boolean1).toBe(true);
        expect(submitMsg).toBe('Not Required Array With Required Fields successfully added.');

        const isPostRequestSent = !!data;
        expect(isPostRequestSent).toBe(true);
      });

    test(
      'should not submit if the array has elements one of which is not empty and has no filled required fields',
      async () => {
        // add full filled elem
        const firstElemString1Selector = `${getArrayFieldSelector('array', 0, 'string1')} input`;
        await this.page.type(firstElemString1Selector, '123');
        await clickCheckboxForArrayIndex(0, 'boolean1');

        // add partially filled item
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 1, this.page);
        const secondElemString1Selector = `${getArrayFieldSelector('array', 1, 'string1')} input`;
        await this.page.type(secondElemString1Selector, '123');

        await clickSubmit(this.page);

        const [arrayElemErr] = await this.page.evaluate(
          selectors => selectors.map(s => document.querySelector(s).innerText),
          [getArrayFieldErrorSelector('array', 1, 'boolean1')]
        );
        expect(removeSpaceChars(arrayElemErr)).toBe('Boolean 1 is required.');
      });
  });
});
