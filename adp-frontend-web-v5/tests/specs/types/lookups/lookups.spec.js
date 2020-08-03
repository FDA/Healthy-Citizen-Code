const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    clickEditButton,
  },
  submit: {
    clickSubmit,
  },
  interceptor: {
    getResponseForCreatedRecord,
  }
} = require('../../../utils');

const {
  selectLookupValue,
  getSingleLookupValue,
  getMultipleLookupValue,
} = require('../../../utils/select.helpers');

const { lookupLabelFixture } = require('./lookupTypes.fixture');
const lookupNames = {
  single: 'objectId',
  multiple: 'objectIds',
};

const PAGE_NAME = 'lookupTypes';

describe('lookup types', () => {
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

  describe('lookup types', () => {
    let lastLabel = '';

    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor(PAGE_NAME));

      lastLabel = await lookupLabelFixture(this.page);
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'Should select single Lookup Field value',
      async () => {
        await selectLookupValue(lastLabel, lookupNames.single, this.page);
        const actualLookupValue = await getSingleLookupValue(lookupNames.single, this.page);

        expect(actualLookupValue).toBe(lastLabel);
      });

    test(
      'Should save form with single Lookup Field',
      async () => {
        await selectLookupValue(lastLabel, lookupNames.single, this.page);
        await clickSubmit(this.page);

        const { _id } = await getResponseForCreatedRecord(PAGE_NAME, this.page);
        await clickEditButton(_id, this.page);

        const actualLookupValue = await getSingleLookupValue(lookupNames.single, this.page);
        expect(actualLookupValue).toBe(lastLabel);
      });

    test(
      'Should select value for Lookup Field with multiple selection',
      async () => {
        await selectLookupValue(lastLabel, lookupNames.multiple, this.page);
        const [actualLookupValue] = await getMultipleLookupValue(lookupNames.multiple, this.page);

        expect(actualLookupValue).toMatch(lastLabel);
      });

    test(
      'Should save form with multiple Lookup Field',
      async () => {
        await selectLookupValue(lastLabel, lookupNames.multiple, this.page);
        await clickSubmit(this.page);
        const { _id } = await getResponseForCreatedRecord(PAGE_NAME, this.page);
        await clickEditButton(_id, this.page);

        const [actualLookupValue] = await getMultipleLookupValue(lookupNames.multiple, this.page);
        expect(actualLookupValue).toMatch(lastLabel);
      });
  });
});
