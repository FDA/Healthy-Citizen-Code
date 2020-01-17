const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  SELECTOR_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: { clickCreateNewButton },
  submit: { clickSubmit },
  interceptor: { getResponseForCreatedRecord },
  table: { clickViewDetailsButton }
} = require('../../utils');

const fieldNames = [
  "neverVisible",
  "visible",
  "visibleInForm",
  "visibleInTables",
  "visibleInViewDetails",
  "hiddenInViewDetails",
  "hiddenInForm",
  "hiddenInTables",
];

const evalFieldsExistInForm = (names) => {
  const hasDomElement = name => {
    const selector = `input#${name}`;
    return document.querySelector(selector) !== null;
  };

  let result = {};
  names.forEach(n => { result[n] = hasDomElement(n) });

  return result;
};

const evalFieldsInDatableById = (id, names, inModal = false) => {
  let parent;

  if (inModal) {
    let parentSelector = '.table-list';
    parent = document.querySelector(parentSelector)
  } else {
    let parentSelector = `[adp-${id}][data-action="update"]`;
    parent = document.querySelector(parentSelector).closest('tr');
  }

  const hasDomElement = name => parent.querySelector(`.name-${name}`) !== null;

  const result = {};
  names.forEach(n => { result[n] = hasDomElement(n) });
  return result;
};

describe('page functionality', () => {
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

  describe('visibility attributes', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('visibilityAttributes'));
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'Check fields visibility in form',
      async () => {
        await clickCreateNewButton(this.page);
        const expectedVisibility = {
          "neverVisible": false,
          "visible": true,
          "visibleInForm": true,
          "visibleInTables": false,
          "visibleInViewDetails": false,
          "hiddenInViewDetails": true,
          "hiddenInForm": false,
          "hiddenInTables": true,
        };

        const actualVisibility = await this.page.evaluate(evalFieldsExistInForm, fieldNames);

        expect(expectedVisibility).toEqual(actualVisibility);
      },
      TEST_TIMEOUT
    );

    test(
      'Check fields visibility in datatable',
      async () => {
        await clickCreateNewButton(this.page);
        await clickSubmit(this.page);
        const { id } = await getResponseForCreatedRecord('visibilityAttributes', this.page);

        const expectedVisibility = {
          "neverVisible": false,
          "visible": true,
          "visibleInForm": false,
          "visibleInTables": true,
          "visibleInViewDetails": false,
          "hiddenInViewDetails": true,
          "hiddenInForm": true,
          "hiddenInTables": false,
        };

        await this.page.waitFor(`[adp-${id}][data-action="update"]`, { timeout: SELECTOR_TIMEOUT });
        const actualVisibility = await this.page.evaluate(evalFieldsInDatableById, id, fieldNames);

        expect(expectedVisibility).toEqual(actualVisibility);
      },
      TEST_TIMEOUT
    );

    test(
      'Check fields visibility in viewDetails pop up',
      async () => {
        await clickCreateNewButton(this.page);
        await clickSubmit(this.page);
        const { id } = await getResponseForCreatedRecord('visibilityAttributes', this.page);

        const expectedVisibility = {
          "neverVisible": false,
          "visible": true,
          "visibleInForm": false,
          "visibleInTables": false,
          "visibleInViewDetails": true,
          "hiddenInViewDetails": false,
          "hiddenInForm": true,
          "hiddenInTables": true,
        };

        await this.page.waitFor('.actions-columns', { timeout: SELECTOR_TIMEOUT });
        await clickViewDetailsButton(id, this.page);

        const actualVisibility = await this.page.evaluate(evalFieldsInDatableById, id, fieldNames, true);
        expect(expectedVisibility).toEqual(actualVisibility);
      },
      TEST_TIMEOUT
    );
  });
});
