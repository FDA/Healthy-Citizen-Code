const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  form: {
    FORM_SELECTOR,
  }
} = require('../../utils');
const {
  getDxSingleListValue,
  getSingleSelectValueByName,
  getDxMultipleListValue,
  getImperialUnitMultipleValue,
} = require('../../utils/select.helpers');

const { openPageAndPresetData } = require('./helpers/preset-data.helpers');

const PAGE_TO_TEST = 'queryParamsBasic';

async function presetDataAndWaitForSelector(data, page) {
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

  describe('data presetting from query params: data types', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should open page and preset data for String[] type',
      async () => {
        const dataToPreset = {
          action: 'create',
          stringMultiple: ['val1', 'val2', 'val3'],
        };

        await presetDataAndWaitForSelector(dataToPreset, this.page);
        const actualValue = await this.page.$$eval(
          '[name="stringMultiple"] .dx-tag span',
            els => els.map(el => el.innerText)
        );

        expect(actualValue).toStrictEqual(dataToPreset.stringMultiple);
      });

    test(
      'should open page and preset data for List type',
      async () => {
        const dataToPreset = {
          action: 'create',
          list: 'val1',
        };

        await presetDataAndWaitForSelector(dataToPreset, this.page);
        const actualValue = await getDxSingleListValue('list', this.page);
        const expectedValue = 'val1';
        expect(actualValue).toBe(expectedValue);
      });

    test(
      'should open page and preset data for List[] type',
      async () => {
        const dataToPreset = {
          action: 'create',
          listMultiple: ['val1', 'val2', 'val3'],
        };

        await presetDataAndWaitForSelector(dataToPreset, this.page);
        const actualValue = await getDxMultipleListValue('listMultiple', this.page);

        expect(actualValue).toStrictEqual(dataToPreset.listMultiple);
      });

    test(
      'should open page and preset data for List[] type',
      async () => {
        const dataToPreset = {
          action: 'create',
          listMultiple: ['val1', 'val2', 'val3'],
        };

        await presetDataAndWaitForSelector(dataToPreset, this.page);
        const actualValue = await getDxMultipleListValue('listMultiple', this.page);

        expect(actualValue).toStrictEqual(dataToPreset.listMultiple);
      });

    test(
      'should open page and preset data for ImperialWeight type',
      async () => {
        const dataToPreset = {
          action: 'create',
          imperialWeight: 1,
        };

        await presetDataAndWaitForSelector(dataToPreset, this.page);
        const actualValue = await getSingleSelectValueByName('imperialWeight', this.page);
        const expectedValue = '1lb';

        expect(actualValue).toBe(expectedValue);
      });

    test(
      'should open page and preset data for ImperialWeightWithOz type',
      async () => {
        const dataToPreset = {
          action: 'create',
          imperialWeightWithOz: '4.7',
        };

        await presetDataAndWaitForSelector(dataToPreset, this.page);
        const actualValue = await getImperialUnitMultipleValue('imperialWeightWithOz', this.page);
        const expectedValue = ['4lb', '7oz'];

        expect(actualValue).toStrictEqual(expectedValue);
      });

    test(
      'should open page and preset data for ImperialHeight type',
      async () => {
        const dataToPreset = {
          action: 'create',
          imperialHeight: '1.2',
        };

        await presetDataAndWaitForSelector(dataToPreset, this.page);
        const actualValue = await getImperialUnitMultipleValue('imperialHeight', this.page);
        const expectedValue = ["1'", "2''"];

        expect(actualValue).toStrictEqual(expectedValue);
      });

    const testsDefinitions = [
      { type: 'String', name: 'string', expected: 'query string' },
      { type: 'Date', name: 'date', expected: '10/9/2019' },
      { type: 'DateTime', name: 'datetime', expected: '10/9/2019 6:25 am', },
      { type: 'Time', name: 'time', expected: '6:25 am', },

      { type: 'Text', name: 'text', expected: 'lorem', },
      { type: 'Email', name: 'email', expected: 'some@some', },
      { type: 'Phone', name: 'phone', expected: '+79994448388', },
      { type: 'Number', name: 'number', expected: '123', },
    ];

    for (const testDef of testsDefinitions) {
      test(
        `Should open page and preset data for ${testDef.type} type`,
        async () => {
          const dataToPreset = {
            action: 'create',
            [testDef.name]: testDef.expected,
          };

          await presetDataAndWaitForSelector(dataToPreset, this.page);
          let selector = `[name="${testDef.name}"]`;
          if (['String', 'Email', 'Phone'].includes(testDef.type)) {
            selector += ' input';
          } else if (testDef.type === 'Text') {
            selector += ' textarea';
          }

          const actualValue = await this.page.$eval(selector, el => el.value);

          expect(actualValue).toBe(testDef.expected);
        });
    }
  });
});
