const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getToken,
  table: {
    VIEW_DETAILS_SELECTOR,
  },
  form: {
    FORM_SELECTOR,
  },
  gql: {
    gqlCreateRecord
  }
} = require('../../utils');
const { openPageAndPresetData } = require('./helpers/preset-data.helpers');
const uuidv4 = require('uuid/v4');

const PAGE_TO_TEST = 'queryParamsBasic';

async function presetDataAndWaitForSelector(data, waitForSelector, page) {
  await openPageAndPresetData({
    url: PAGE_TO_TEST,
    dataToPreset: data,
    selectorToWait: waitForSelector,
  }, page);
}

async function assertFormForActionIsVisible(action, expectedStringFieldValue, page) {
  const [form, actualStringFieldValue] = await Promise.all([
    page.$(`.form-action-${action}`),
    page.$eval('[field-name-input="string"]', el => el.value),
  ]);

  expect(form).toBeTruthy();
  expect(actualStringFieldValue).toBe(expectedStringFieldValue);
}

async function queryParamsFixture(token, testPage) {
  const fixtureData = { string: uuidv4() };
  const { _id } = await gqlCreateRecord(token, testPage, fixtureData);

  return { _id, ...fixtureData };
}

describe('data presetting', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    this.context = await this.browser.createIncognitoBrowserContext();
    const page = await this.context.newPage();
    await loginWithUser(page);
    this.token = await getToken(page);
    await page.close();
  });

  afterAll(async () => {
    await this.browser.close();
  });

  describe('data presetting from query params: actions', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should open form for CREATE action with data from url query params',
      async () => {
        const dataToPreset = {
          action: 'create',
          string: 'string for create action',
        };

        await presetDataAndWaitForSelector(dataToPreset, FORM_SELECTOR, this.page);
        await assertFormForActionIsVisible(dataToPreset.action, dataToPreset.string, this.page)
      });

    test(
      'should open form for UPDATE action with data from url query params',
      async () => {
        const fixtureData = await queryParamsFixture(this.token, PAGE_TO_TEST);

        const dataToPreset = {
          _id: fixtureData._id,
          action: 'update',
        };

        await presetDataAndWaitForSelector(dataToPreset, FORM_SELECTOR, this.page);
        await assertFormForActionIsVisible(dataToPreset.action, fixtureData.string, this.page);
      });

    test(
      'should open form for CLONE action with data from url query params',
      async () => {
        const fixtureData = await queryParamsFixture(this.token, PAGE_TO_TEST);

        const dataToPreset = {
          _id: fixtureData._id,
          action: 'clone',
        };

        await presetDataAndWaitForSelector(dataToPreset, FORM_SELECTOR, this.page);
        await assertFormForActionIsVisible(dataToPreset.action, fixtureData.string, this.page);
      });

    test(
      'should open viewDetails modal action',
      async () => {
        const fixtureData = await queryParamsFixture(this.token, PAGE_TO_TEST);

        const dataToPreset = {
          _id: fixtureData._id,
          action: 'viewDetails',
          boolean: true,
        };

        await presetDataAndWaitForSelector(dataToPreset, VIEW_DETAILS_SELECTOR, this.page);

        const [viewDetailsModal, stringFieldValue] = await Promise.all([
          this.page.$(VIEW_DETAILS_SELECTOR),
          this.page.$eval('.name-string', el => el.innerText),
        ]);

        expect(viewDetailsModal).toBeTruthy();
        expect(stringFieldValue).toBe(fixtureData.string);
      });

    test(
      'should show delete modal on page load',
      async () => {
        const fixtureData = await queryParamsFixture(this.token, PAGE_TO_TEST);

        const dataToPreset = {
          _id: fixtureData._id,
          action: 'delete',
        };

        const DELETE_MODAL_SELECTOR = 'adp-confirm-dialog-modal';
        await presetDataAndWaitForSelector(dataToPreset, DELETE_MODAL_SELECTOR, this.page);

        const deleteModal = await this.page.$('.delete-action-modal');
        expect(deleteModal).toBeTruthy();
      });
  });
});
