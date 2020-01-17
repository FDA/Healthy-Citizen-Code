const puppeteer = require('puppeteer');
const uuidv4 = require('uuid/v4');
const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  waitForContentRemovedFromDom,
  form: {
    clickCreateNewButton,
  },
  submit: {
    clickSubmit,
  }
} = require('../../../utils');

const {
  selectLookupValue,
  getSingleLookupValue,
  clickLookupAction,
} = require('../../../utils/select.helpers');

const LOOKUP_NAME = 'objectId';

async function execActionForLookup(actionName, lookupName, page) {
  const PARENT_FORM_SELECTOR = '.basicTypes';
  await clickLookupAction(lookupName, actionName, PARENT_FORM_SELECTOR, page);

  const LABEL_FIELD_SELECTOR = '[name="string"]';
  const labelValue =  uuidv4();
  await typeIntoLabelField(LABEL_FIELD_SELECTOR,  labelValue, page);

  await clickSubmit(page, PARENT_FORM_SELECTOR);
  await waitForContentRemovedFromDom(PARENT_FORM_SELECTOR, page);

  return labelValue;
}

async function typeIntoLabelField(selector, value, page) {
  const labelValue = value;
  await page.$eval(selector, el => el.value = '');
  await page.type(selector, labelValue);

  return labelValue;
}

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

  describe('lookup types: create and edit buttons', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('lookupTypes'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'Should create new record for lookup and select it after',
      async () => {
        const labelValue = await execActionForLookup('create', LOOKUP_NAME, this.page);

        await selectLookupValue(labelValue, LOOKUP_NAME, this.page);
        const actualLookupValue = await getSingleLookupValue(LOOKUP_NAME, this.page);

        expect(actualLookupValue).toBe(labelValue);
      });

    test(
      'Should edit new record for lookup and select it after',
      async () => {
        const labelValue = await execActionForLookup('edit', LOOKUP_NAME, this.page);

        await selectLookupValue(labelValue, LOOKUP_NAME, this.page);
        const actualLookupValue = await getSingleLookupValue(LOOKUP_NAME, this.page);

        expect(actualLookupValue).toBe(labelValue);
      });
  });
});
