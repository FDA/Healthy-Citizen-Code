const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  array: {
    clickArrayItem
  },
  form: {
    clickCreateNewButton,
    clickEditButton,
    selectOptionByValue,
  },
  submit: {
    clickSubmit
  },
  interceptor: {
    getRecordIdFromCreateResponse
  }
} = require('../../utils');

const selectors = {
  'a1[0]': '[name="a1[0]"]',
  'a1[0].a2[0]': '[name="a1[0]"] [name="a2[0]"]',
  'a1[0].a2[0].a3[0]': '[name="a1[0]"] [name="a2[0]"] [name="a3[0]"]',
  'a1[0].s1': '[name="a1[0]"] #s2id_s1',
  'a1[0].a2[0].s2': '[name="a1[0]"] [name="a2[0]"] #s2id_s2',
  'a1[0].a2[0].s20': '[name="a1[0]"] [name="a2[0]"] #s20',
  'a1[0].a2[0].a3[0].s3': '[name="a1[0]"] [name="a2[0]"] [name="a3[0]"] #s3',
};

const getVisibilitySnapshot = selectors => {
  const hasDomElement = selector => document.querySelector(selector) !== null;

  return {
    'a1[0]': hasDomElement(selectors['a1[0]']),
    'a1[0].a2[0]': hasDomElement(selectors['a1[0].a2[0]']),
    'a1[0].a2[0].a3[0]': hasDomElement(selectors['a1[0].a2[0].a3[0]']),
    'a1[0].s1': hasDomElement(selectors['a1[0].s1']),
    'a1[0].a2[0].s2': hasDomElement(selectors['a1[0].a2[0].s2']),
    'a1[0].a2[0].s20': hasDomElement(selectors['a1[0].a2[0].s20']),
    'a1[0].a2[0].a3[0].s3': hasDomElement(selectors['a1[0].a2[0].a3[0].s3']),
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

  describe('show expression context params: indexes and parentData', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showArraysWithIndexes'));
      await clickCreateNewButton(this.page);
      await clickArrayItem('a1', 0, this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'Only Array item a1[0] and a1[0].s1 should be visible on form load',
      async () => {
        const expectedSnapshot1 = {
          'a1[0]': true,
          'a1[0].a2[0]': false,
          'a1[0].a2[0].a3[0]': false,
          'a1[0].s1': true,
          'a1[0].a2[0].s2': false,
          'a1[0].a2[0].s20': false,
          'a1[0].a2[0].a3[0].s3': false,
        };

        const snapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot1).toEqual(expectedSnapshot1);
      },
      TEST_TIMEOUT
    );

    test(
      'Should show a[0] children fields in correct sequence',
      async () => {
        const expectedSnapshot1 = {
          'a1[0]': true,
          'a1[0].a2[0]': true,
          'a1[0].a2[0].a3[0]': false,
          'a1[0].s1': true,
          'a1[0].a2[0].s2': true,
          'a1[0].a2[0].s20': false,
          'a1[0].a2[0].a3[0].s3': false,
        };

        const s1 = selectors['a1[0].s1'];
        const s2 = selectors['a1[0].a2[0].s2'];
        await selectOptionByValue('o11', s1, this.page);
        await this.page.waitForSelector(s2);

        const snapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot1).toEqual(expectedSnapshot1);

        const s20 = selectors['a1[0].a2[0].s20'];
        await clickArrayItem('a2', 0, this.page);
        await selectOptionByValue('o23', s2, this.page);
        await this.page.waitForSelector(s20);

        const exptectedSnapshot2 = {
          ...expectedSnapshot1,
          'a1[0].a2[0].s20': true
        };
        const snapshot2 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot2).toEqual(exptectedSnapshot2);

        const s3 = selectors['a1[0].a2[0].a3[0].s3'];
        await selectOptionByValue('o21', s2, this.page);
        await this.page.waitForSelector(s3);

        const exptectedSnapshot3 = {
          ...expectedSnapshot1,
          'a1[0].a2[0].a3[0]': true,
          'a1[0].a2[0].a3[0].s3': true
        };
        const snapshot3 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot3).toEqual(exptectedSnapshot3);
      },
      TEST_TIMEOUT
    );

    test(
      'should render correct fields on edit action',
      async () => {
        const s1 = selectors['a1[0].s1'];
        const s2 = selectors['a1[0].a2[0].s2'];
        await selectOptionByValue('o11', s1, this.page);
        await this.page.waitForSelector(s2);

        await clickArrayItem('a2', 0, this.page);
        const s3 = selectors['a1[0].a2[0].a3[0].s3'];
        await selectOptionByValue('o21', s2, this.page);
        await this.page.waitForSelector(s3);

        await clickSubmit(this.page);
        const id = await getRecordIdFromCreateResponse('helperMethods_showArraysWithIndexes', this.page);
        await clickEditButton(id, this.page);

        const expectedSnapshot1 = {
          'a1[0]': true,
          'a1[0].a2[0]': true,
          'a1[0].a2[0].a3[0]': true,
          'a1[0].s1': true,
          'a1[0].a2[0].s2': true,
          'a1[0].a2[0].s20': false,
          'a1[0].a2[0].a3[0].s3': true,
        };

        const snapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(snapshot).toEqual(expectedSnapshot1);
      },
      TEST_TIMEOUT
    )
  });
});
