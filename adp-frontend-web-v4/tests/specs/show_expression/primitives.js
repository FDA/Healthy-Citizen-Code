const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    selectOptionByValue,
    clickEditButton
  },
  submit: {
    clickSubmit
  },
  interceptor: {
    getRecordIdFromCreateResponse
  }
} = require('../../utils');

const selectors = {
  showSelect: '#s2id_showSelect',
  n1: 'input#n1',
  n2: 'input#n2',
  n3: 'input#n3',
  s2: '#s2',
  b1: '[name="b1"]',
};

const getVisibilitySnapshot = selectors => {
  const hasDomElement = selector => {
    return document.querySelector(selector) !== null;
  };

  return {
    showSelect: hasDomElement(selectors.showSelect),
    n1: hasDomElement(selectors.n1),
    n2: hasDomElement(selectors.n2),
    n3: hasDomElement(selectors.n3),
    s2: hasDomElement(selectors.s2),
    b1: hasDomElement(selectors.b1)
  };
};

describe('show expression', () => {
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

  describe('show expression without Groups and Complex', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showPrimitive'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'correct fields visibility for fresh form on record create',
      async () => {
        const expectedSnapshot1 = {
          showSelect: true,
          n1: false,
          n2: false,
          n3: true,
          s2: false,
          b1: true,
        };

        const snapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot1).toEqual(expectedSnapshot1);
      },
      TEST_TIMEOUT
    );

    test(
      'should not react to change',
      async () => {
        const expectedSnapshot1 = {
          showSelect: true,
          n1: false,
          n2: false,
          n3: true,
          s2: false,
          b1: true,
        };

        await selectOptionByValue('Option3', selectors.showSelect, this.page);

        const snapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot1).toEqual(expectedSnapshot1);

        await selectOptionByValue('Option4', selectors.showSelect, this.page);

        const snapshot2 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot2).toEqual(expectedSnapshot1);
      },
      TEST_TIMEOUT
    );

    test(
      'Should show Number1 field, than Number2',
      async () => {
        await selectOptionByValue('Option1', selectors.showSelect, this.page);
        await this.page.waitForSelector(selectors.n1);

        let n1IsVisiblityActual = await this.page.evaluate(
          selector => document.querySelector(selector) !== null,
          selectors.n1
        );
        expect(n1IsVisiblityActual).toBe(true);

        await this.page.click(`#checkbox-label-b1`);
        await this.page.waitForSelector(selectors.n2);

        let n2IsVisiblityActual = await this.page.evaluate(
          selector => document.querySelector(selector) !== null,
          selectors.n1
        );
        expect(n2IsVisiblityActual).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'Number3 show should always evaluate to true',
      async () => {
        await selectOptionByValue('Option1', selectors.showSelect, this.page);
        await this.page.waitForSelector(selectors.n1);

        let n3IsVisiblityActualOnSelectedValue = await this.page.evaluate(
          selector => document.querySelector(selector) !== null,
          selectors.n1
        );
        expect(n3IsVisiblityActualOnSelectedValue).toBe(true);

        await this.page.click(`#checkbox-label-b1`);
        await this.page.waitForSelector(selectors.n2);

        let n3IsVisiblityActualOnCheckboxChecked = await this.page.evaluate(
          selector => document.querySelector(selector) !== null,
          selectors.n1
        );
        expect(n3IsVisiblityActualOnCheckboxChecked).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'should calculate fields show on edit action',
      async () => {
        await selectOptionByValue('Option2', selectors.showSelect, this.page);
        // await this.page.waitForSelector(selectors.n1);

        await this.page.click(`#checkbox-label-b1`);
        // await this.page.waitForSelector(selectors.n2);

        await clickSubmit(this.page);
        const id = await getRecordIdFromCreateResponse('helperMethods_showPrimitive', this.page);
        await clickEditButton(id, this.page);

        const expectedSnapshot = {
          showSelect: true,
          n1: false,
          n2: true,
          n3: true,
          s2: true,
          b1: true,
        };

        const snapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot).toEqual(expectedSnapshot);
      },
      TEST_TIMEOUT
    );
  });
});
