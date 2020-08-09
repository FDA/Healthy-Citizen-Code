const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  form: {
    FORM_SELECTOR,
  }
} = require('../../utils');
const { openPageAndPresetData } = require('./helpers/preset-data.helpers');

const PAGE_TO_TEST = 'queryParamsNestedData';

async function presetData(data, page) {
  await openPageAndPresetData({
    url: PAGE_TO_TEST,
    dataToPreset: data,
    selectorToWait: FORM_SELECTOR,
  }, page);
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

  describe('data presetting from query params: nested data', () => {
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
          'o1.s1': 'string from level one',
          'o1.o2.s2': 'string from level two',
        };
        await presetData(dataToPreset, this.page);

        const [s1FieldValue, s2FieldValue] = await Promise.all(
          ['s1', 's2'].map(name => this.page.$eval(`[field-name-input="${name}"]`, el => el.value))
        );

        expect(s1FieldValue).toBe(dataToPreset['o1.s1']);
        expect(s2FieldValue).toBe(dataToPreset['o1.o2.s2']);
      });
  });
});
