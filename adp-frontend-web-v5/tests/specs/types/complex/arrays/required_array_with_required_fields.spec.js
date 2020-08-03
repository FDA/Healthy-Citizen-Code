const puppeteer = require('puppeteer');

const {
  SELECTOR_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  removeSpaceChars,
  form: { clickCreateNewButton },
  submit: { getSubmitMsg, clickSubmit },
  array: { clickArrayItem, getArrayFieldErrorSelector, getArrayFieldSelector, addArrayItem },
} = require('../../../../utils');

const clickCheckboxForArrayIndex = async (index, name) => {
  await this.page.click(`[name="array[${index}]"] [ng-field-name="${name}"] .dx-switch-handle`);
  await this.page.waitFor(200);
}

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
      await this.page.goto(getUrlFor('complexArrays_RequiredArrayWithRequiredFields'));
      await clickCreateNewButton(this.page);
      await clickArrayItem('array', 0, this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should not submit empty form',
      async () => {
        await clickSubmit(this.page);

        const boolean1MsgSelector = getArrayFieldErrorSelector('array', 0, 'boolean1');
        await this.page.waitFor(boolean1MsgSelector, {
          timeout: SELECTOR_TIMEOUT,
        });

        const boolean1ErrorText = await this.page.$eval(boolean1MsgSelector, el => el.innerText);
        expect(removeSpaceChars(boolean1ErrorText)).toBe('Boolean 1 is required.');
      });

    test(
      'should not submit with any not valid array elems (1 valid and 1 not valid array elem)',
      async () => {
        // valid elem
        const firstElemString1Selector = getArrayFieldSelector('array', 0, 'string1');
        await this.page.type(firstElemString1Selector, '123');
        await clickCheckboxForArrayIndex(0, 'boolean1');

        // not valid elem
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
      });

    test(
      'should submit with valid array elems',
      async () => {
        // valid elem
        const firstElemString1Selector = getArrayFieldSelector('array', 0, 'string1');
        await this.page.type(firstElemString1Selector, '123');
        await clickCheckboxForArrayIndex(0, 'boolean1');

        // not valid elem
        await addArrayItem('array', this.page);
        await clickArrayItem('array', 1, this.page);
        await clickCheckboxForArrayIndex(1, 'boolean1');

        await clickSubmit(this.page);
        const submitMsg = await getSubmitMsg(this.page);
        expect(submitMsg).toBe('Required Array With Required Field has been added.');
      });
  });
});
