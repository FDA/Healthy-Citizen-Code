const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    selectLookupValue,
  },
  submit: {
    clickSubmit,
  }
} = require('../../../utils');

const lookupLabelFixture = require('../../../fixture/lookupTypes.fixture');
const selectors = {
  single: '#s2id_objectId',
  multiple: '#s2id_objectIds',
};

const getRequest = async (page) => {
  const res = await page.waitForResponse(response => {
    const request = response.request();

    return request.method().toUpperCase() === 'POST' &&
      request.url().includes('lookupTypes');
  });

  return JSON.parse(res.request().postData()).data;
};

describe('lookup types', () => {
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

  describe('lookup types: create action', () => {
    let lastLabel = '';
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('lookupTypes'));

      lastLabel = await lookupLabelFixture(this.page);
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'Should save form with single Lookup Field',
      async () => {
        await selectLookupValue(lastLabel, selectors.single, this.page);
        await clickSubmit(this.page);
        const body = await getRequest(this.page);

        let actualLookupValue = body.objectId.label;
        expect(actualLookupValue).toBe(lastLabel);
      },
      TEST_TIMEOUT
    );

    test(
      'Should save form with multiple Lookup Field',
      async () => {
        await selectLookupValue(lastLabel, selectors.multiple, this.page);
        await clickSubmit(this.page);
        const body = await getRequest(this.page);

        let actualLookupValue = body.objectIds[0].label;
        expect(actualLookupValue).toBe(lastLabel);
      },
      TEST_TIMEOUT
    );
  });
});
