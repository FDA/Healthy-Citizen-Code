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

  describe('array is required, there are required fields', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('complexArrays_RequiredArrayWithNotRequiredFields'));
      await clickCreateNewButton(this.page);
      await clickArrayItem('array', 0, this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });


    test(
      'should not allow to delete single array elem',
      async () => {
        const isRemoveElemBtnDisabled = await this.page.evaluate(
          selector => document.querySelector(selector).disabled,
          getRemoveArrayElemSelector('array', 0)
        );
        expect(isRemoveElemBtnDisabled).toBe(true);
      });

    test(
      'should submit form with 1 empty element',
      async () => {
        await clickSubmit(this.page);

        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Required Array With Not Required Field has been added.');
      });

    test(
      'should submit with any array elems',
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
        expect(submitMsg).toBe('Required Array With Not Required Field has been added.');
      });

  });
});
