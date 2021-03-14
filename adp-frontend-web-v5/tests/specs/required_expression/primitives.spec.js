const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    getFormErrorCountMessage,
  },
  submit: { clickSubmit }
} = require('../../utils');

const {
  selectDxListValue,
} = require('../../utils/select.helpers');

const fieldNames = {
  select: 'select',
  selectOne:'selectOne',
  n1: 'n1',
  n2: 'n2',
  b1: 'b1',
};

const getRequiredSnapshot = names => {
  const hasError = name => {
    let selector = `[ng-field-name="${name}"] [ng-message="required"]`;
    return document.querySelector(selector) !== null;
  };

  return {
    select: hasError(names.select),
    selectOne: hasError(names.selectOne),
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
  });

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
          selectOne: false,
          n1: false,
          n2: false,
          b1: false,
        };

        const actualRequiredSnapshot = await this.page.evaluate(getRequiredSnapshot, fieldNames);
        expect(actualRequiredSnapshot).toEqual(expectedRequiredSnapshot);
      });

    test(
      'should dynamically change fields required',
      async () => {
        await selectDxListValue('Option2', fieldNames.select, this.page);
        await clickSubmit(this.page);

        const expectedRequiredSnapshot1 = {
          select: false,
          selectOne: false,
          n1: true,
          n2: false,
          b1: false,
        };

        const actualRequiredSnapshot1 = await this.page.evaluate(getRequiredSnapshot, fieldNames);
        expect(actualRequiredSnapshot1).toEqual(expectedRequiredSnapshot1);

        await this.page.click('[ng-field-name="b1"] .dx-switch-handle');
        await this.page.waitForTimeout(200);

        await clickSubmit(this.page);

        const expectedRequiredSnapshot2 = {
          select: false,
          selectOne: false,
          n1: true,
          n2: true,
          b1: false,
        };

        const actualRequiredSnapshot2 = await this.page.evaluate(getRequiredSnapshot, fieldNames);
        expect(actualRequiredSnapshot2).toEqual(expectedRequiredSnapshot2);

        let errorCountText = await getFormErrorCountMessage(this.page);
        expect(errorCountText).toBe('2 errors found in the form.');
      });
/*
 // This test not passing due select2 bug.
 // Then (single possible) value selected after dynamic 'required' change,
 // form value(in model) is changed - but select ignores setData() method and stays empty.
 // However, form value is correct so on [Update] there is no validation errors happen

    test(
      'should auto-select field with only value in the list after required is set',
      async () => {
        const fieldSelector = selectors.listOnlyValue;

        let initial = await singleSelectValue(fieldSelector, this.page);

        expect(initial).toBe('');

        await this.page.click('[ng-field-name="b1"] .dx-switch-handle');
        await this.page.waitForTimeout(200);

        let autoSelected = await singleSelectValue(fieldSelector, this.page);

        expect(autoSelected).toBe('NumberOne');
      });

 */
  });
});
