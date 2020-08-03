const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
  },
  submit: {
    clickSubmit,
  },
} = require('../../../utils');

const {
  selectLookupValue,
  getSingleLookupValue,
} = require('../../../utils/select.helpers');

const { lookupLabelWithFormDataFixture } = require('./lookupTypes.fixture');
const lookupNames = {
  lookup: 'selfLookupWithDataSimpleForm',
};

const PAGE_NAME = 'lookupWithDataAttachment';

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

  describe('lookup types with data attachments', () => {
    let lastLabel;

    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor(PAGE_NAME));

      lastLabel = await lookupLabelWithFormDataFixture(this.page);
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'Should submit single Lookup Field value with data attachments',
      async () => {
        await selectLookupValue(lastLabel, lookupNames.lookup, this.page);
        const actualLookupValue = await getSingleLookupValue(lookupNames.lookup, this.page);

        expect(actualLookupValue).toEqual(expect.stringContaining(lastLabel));

        await clickSubmit(this.page);
        await this.page.waitFor(2000);

        const gridCellSelector = `tr.dx-data-row:first-child .name-${lookupNames.lookup}`;
        const labelFromGridCell = await this.page.evaluate(s => document.querySelector(s).innerText.trim(), gridCellSelector);

        expect(labelFromGridCell).toBe(actualLookupValue);
      });
  });
});
