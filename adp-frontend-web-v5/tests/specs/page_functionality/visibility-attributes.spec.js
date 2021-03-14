const puppeteer = require('puppeteer');
const _ = require('lodash');

const {
  SELECTOR_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: { clickCreateNewButton },
  submit: { clickSubmit },
  interceptor: { getResponseForCreatedRecord },
  table: {
    VIEW_DETAILS_SELECTOR,
    ACTIONS_COLUMN_SELECTOR,
    clickViewDetailsButton,
  }
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
    const selector = `[field-name-input="${name}"]`;
    return document.querySelector(selector) !== null;
  };

  return _.reduce(names, (result, name) => {
    result[name] = hasDomElement(name);
    return result;
  }, {});
};

const evalFieldsInDatable = (id, names) => {
  let parentSelector = `[adp-${id}]`;
  let parent = document.querySelector(parentSelector).closest('tr');

  const hasDomElement = (name) => {
    var tableCell = parent.querySelector(`.name-${name}`);
    return tableCell !== null;
  };

  return _.reduce(names, (result, name) => {
    result[name] = hasDomElement(name);
    return result;
  }, {});
};

const evalFieldsInViewDetails = (id, names, viewDetailsSelector) => {
  let parent = document.querySelector(viewDetailsSelector);

  const hasDomElement = (name) => {
    var tableCell = parent.querySelector(`.name-${name}`);
    return tableCell !== null;
  };

  return _.reduce(names, (result, name) => {
    result[name] = hasDomElement(name);
    return result;
  }, {});
};

describe('page functionality', () => {
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
      });

    test(
      'Check fields visibility in datatable',
      async () => {
        await clickCreateNewButton(this.page);
        await clickSubmit(this.page);
        const { _id } = await getResponseForCreatedRecord('visibilityAttributes', this.page);

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

        await this.page.waitForSelector(`.actions-column-container[adp-${_id}]`, { timeout: SELECTOR_TIMEOUT });
        const actualVisibility = await this.page.evaluate(evalFieldsInDatable, _id, fieldNames);

        expect(expectedVisibility).toEqual(actualVisibility);
      });

    test(
      'Check fields visibility in viewDetails pop up',
      async () => {
        await clickCreateNewButton(this.page);
        await clickSubmit(this.page);
        const { _id } = await getResponseForCreatedRecord('visibilityAttributes', this.page);

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

        await this.page.waitForSelector(ACTIONS_COLUMN_SELECTOR, { timeout: SELECTOR_TIMEOUT });
        await clickViewDetailsButton(_id, this.page);

        const actualVisibility = await this.page.evaluate(evalFieldsInViewDetails, _id, fieldNames, VIEW_DETAILS_SELECTOR);
        expect(expectedVisibility).toEqual(actualVisibility);
      });
  });
});
