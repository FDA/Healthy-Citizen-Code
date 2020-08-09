const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  form: {
    FORM_SELECTOR,
  }
} = require('../../utils');
const { openPageAndPresetData } = require('./helpers/preset-data.helpers');

const PAGE_TO_TEST = 'queryParamsSinglePage';

async function presetData(dataToPreset, page) {
  await openPageAndPresetData({
    url: PAGE_TO_TEST,
    dataToPreset,
    selectorToWait: FORM_SELECTOR,
  }, page);
}

async function assertFormForActionIsVisible(action, expectedStringFieldValue, page) {
  const [form, actualStringFieldValue] = await Promise.all([
    page.$(FORM_SELECTOR),
    page.$eval('[field-name-input="string"]', el => el.value),
  ]);

  expect(form).toBeTruthy();
  expect(actualStringFieldValue).toBe(expectedStringFieldValue);
}

describe('data presetting', () => {
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

  describe('data presetting from query params: single page create action', () => {
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

        await presetData(dataToPreset, this.page);

        await assertFormForActionIsVisible(dataToPreset.action, dataToPreset.string, this.page)
      });

    test(
      'should open form for update action with data from url query params',
      async () => {
        const dataToPreset = {
          action: 'update',
          string: 'string for update action',
        };

        await presetData(dataToPreset, this.page);

        await assertFormForActionIsVisible(dataToPreset.action, dataToPreset.string, this.page)
      });
  });
});
