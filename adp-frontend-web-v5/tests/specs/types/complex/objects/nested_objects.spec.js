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
      await this.page.goto(getUrlFor('complexObjects_NestedObjects'));
      await clickCreateNewButton(this.page);

      await clickObject('nestedObjects', this.page);
      await clickObject('level2', this.page);
      await clickObject('level3', this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should submit empty form ',
      async () => {
        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Nested Objects successfully added.');
      });

    test(
      'should not submit with filled non-required field on level2',
      async () => {
        const stringLvl2Selector = getFieldSelector('level2', 'stringLevel2');
        await this.page.type(stringLvl2Selector, '123');

        await clickSubmit(this.page);

        const [nestedObjects1Err, stringLevel1Err] = await this.page.evaluate(
          selectors => selectors.map(s => document.querySelector(s).innerText),
          [
            getObjectErrorSelect('nestedObjects'),
            getFieldErrorSelector('nestedObjects', 'stringLevel1'),
          ]
        );
        expect(removeSpaceChars(nestedObjects1Err)).toBe('1 error found.');
        expect(removeSpaceChars(stringLevel1Err)).toBe('stringLevel1 is required.');
      });

    test(
      'should submit with filled required field on top-level',
      async () => {
        const stringLvl1Selector = getFieldSelector('nestedObjects', 'stringLevel1');
        await this.page.type(stringLvl1Selector, '123');

        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Nested Objects successfully added.');
      });

    test(
      'should not submit if there is nested object with filled non-required field and empty required field ',
      async () => {
        // fill in non-required field in level3
        const level3String2Selector = getFieldSelector('level3', 'level3String2');
        await this.page.type(level3String2Selector, '123');

        await clickSubmit(this.page);

        // check error for required field
        const string31MsgSelector = getFieldErrorSelector('level3', 'level3String1');
        await this.page.waitFor(string31MsgSelector, {
          timeout: SELECTOR_TIMEOUT,
        });
        const [
          nestedObjects1Err,
          stringLevel1Err,
          level2Err,
          level3Err,
          string31Err,
        ] = await this.page.evaluate(
          selectors => selectors.map(s => document.querySelector(s).innerText),
          [
            getObjectErrorSelect('nestedObjects'),
            getFieldErrorSelector('nestedObjects', 'stringLevel1'),
            getObjectErrorSelect('level2'),
            getObjectErrorSelect('level3'),
            string31MsgSelector,
          ]
        );
        expect(removeSpaceChars(nestedObjects1Err)).toBe('2 errors found.');
        expect(removeSpaceChars(stringLevel1Err)).toBe('stringLevel1 is required.');
        expect(removeSpaceChars(level2Err)).toBe('1 error found.');
        expect(removeSpaceChars(level3Err)).toBe('1 error found.');
        expect(removeSpaceChars(string31Err)).toBe('stringLevel3.1 is required.');
      });
  });
});
