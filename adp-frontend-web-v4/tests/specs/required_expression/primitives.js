const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    selectOptionByValue,
    clickEditButton,
    getFormErrorCountMessage
  },
  submit: {
    clickSubmit
  },
  interceptor: {
    getResponseForCreatedRecord
  }
} = require('../../utils');

const fieldNames = {
  select: 'select',
  n1: 'n1',
  n2: 'n2',
  b1: 'b1',
};

const selectors = { select: '#s2id_select' };

const getRequiredSnapshot = names => {
  const hasError = name => {
    let selector = `[ng-field-name="${name}"] [ng-message="required"]`;
    return document.querySelector(selector) !== null;
  };

  return {
    select: hasError(names.select),
    n1: hasError(names.n1),
    n2: hasError(names.n2),
    b1: hasError(names.b1),
  };
};

describe('required expression', () => {
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

  describe('required expression for primitives', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_requiredConditional'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should fail to submit and show correct error message for clean form on create action',
      async () => {
        await clickSubmit(this.page);

        let errorCountText = await getFormErrorCountMessage(this.page);
        expect(errorCountText).toBe('1 error found in the form.');

        const expectedRequiredSnapshot = {
          select: true,
          n1: false,
          n2: false,
          b1: false,
        };

        const actualRequiredSnapshot = await this.page.evaluate(getRequiredSnapshot, fieldNames);
        expect(actualRequiredSnapshot).toEqual(expectedRequiredSnapshot);
      },
      TEST_TIMEOUT
    );

    test(
      'should dynamically change fields required',
      async () => {
        await selectOptionByValue('Option2', selectors.select, this.page);
        await clickSubmit(this.page);

        const expectedRequiredSnapshot1 = {
          select: false,
          n1: true,
          n2: false,
          b1: false,
        };

        const actualRequiredSnapshot1 = await this.page.evaluate(getRequiredSnapshot, fieldNames);
        expect(actualRequiredSnapshot1).toEqual(expectedRequiredSnapshot1);

        await this.page.click('#checkbox-label-b1');

        const expectedRequiredSnapshot2 = {
          select: false,
          n1: true,
          n2: true,
          b1: false,
        };

        const actualRequiredSnapshot2 = await this.page.evaluate(getRequiredSnapshot, fieldNames);
        expect(actualRequiredSnapshot2).toEqual(expectedRequiredSnapshot2);

        let errorCountText = await getFormErrorCountMessage(this.page);
        expect(errorCountText).toBe('2 errors found in the form.');
      },
      TEST_TIMEOUT
    );
  });
});
