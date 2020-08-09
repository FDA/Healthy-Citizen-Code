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
  selectLookupTable,
  getSingleLookupValue,
  clickLookupAction,
} = require('../../../utils/select.helpers');

const lookups = {
  singleTable: 'objectId',
  multipleTables: 'objectIdsWithMultipleTables',
};

async function fillForm(fieldName, formSelector, page) {
  const LABEL_FIELD_SELECTOR = `[field-name-input="${fieldName}"]`;
  const labelValue =  uuidv4();
  await typeIntoLabelField(LABEL_FIELD_SELECTOR, labelValue, page);

  await clickSubmit(page, formSelector);
  await waitForContentRemovedFromDom(formSelector, page);

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
        const formSelector = '.basicTypes';
        await clickLookupAction(lookups.singleTable, 'create', this.page);
        await this.page.waitForSelector(formSelector);
        const labelValue = await fillForm('string', formSelector, this.page);

        await selectLookupValue(labelValue, lookups.singleTable, this.page);
        const actualLookupValue = await getSingleLookupValue(lookups.singleTable, this.page);

        expect(actualLookupValue).toBe(labelValue);
      });

    test(
      'Should edit new record for lookup and select it after',
      async () => {
        const formSelector = '.basicTypes';
        await clickLookupAction(lookups.singleTable, 'edit', this.page);
        await this.page.waitForSelector(formSelector);
        const labelValue = await fillForm('string', formSelector, this.page);

        await selectLookupValue(labelValue, lookups.singleTable, this.page);
        const actualLookupValue = await getSingleLookupValue(lookups.singleTable, this.page);

        expect(actualLookupValue).toBe(labelValue);
      });

    test(
      'Should open BasicTypes and then BasicDateTypes form modals fom lookup',
      async () => {
        const basicTypesFormSelector = '.basicTypes';
        await clickLookupAction(lookups.multipleTables, 'create', this.page);
        const basicTypesForm = await this.page.waitForSelector(basicTypesFormSelector);

        expect(basicTypesForm).toBeTruthy();

        await this.page.click(`${basicTypesFormSelector} [data-actions-name="cancelSubmit"]`);
        await this.page.waitForSelector(basicTypesFormSelector, { hidden: true });

        const basicTypesDateFormSelector = '.basicTypesDates';
        await selectLookupTable('Basic Types Dates', lookups.multipleTables, this.page);
        await clickLookupAction(lookups.multipleTables, 'create', this.page);
        const basicTypesDateForm = await this.page.waitForSelector(basicTypesDateFormSelector);

        expect(basicTypesDateForm).toBeTruthy();
      }
    )
  });
});
