const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    clickEditButton
  },
  submit: {
    clickSubmit
  },
  group: {
    toggleGroup,
    isGroupCollapsed
  },
  interceptor: {
    getResponseForCreatedRecord
  }
} = require('../../utils');

const {
  selectDxListValue,
} = require('../../utils/select.helpers');


const selectors = {
  fieldSelect: '#list_id_fieldSelect',
  g1: '[ng-group-name="g1"]',
  g2: '[ng-group-name="g2"]',
  g3: '[ng-group-name="g3"]',
  g4: '[ng-group-name="g4"]',
  s1: '[adp-qaid-field-control="s1"]',
  b2: '[adp-qaid-field-control="b2"]',
  a2: '[name="a2[0]"]',
  s3: '[adp-qaid-field-control="s3"]',
  b3: '[adp-qaid-field-control="b3"]',
  s4: '[adp-qaid-field-control="s4"]',
};

const selectFieldName = 'fieldSelect'

const groupType = 'accordion';

const getVisibilitySnapshot = selectors => {
  const isVisible = s => {
    const element = document.querySelector(s);

    return !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length))
  };

  return {
    fieldSelect: isVisible(selectors.fieldSelect),
    g1: isVisible(selectors.g1),
    g2: isVisible(selectors.g2),
    g3: isVisible(selectors.g3),
    g4: isVisible(selectors.g4),
    s1: isVisible(selectors.s1),
    s3: isVisible(selectors.s3),
    a2: isVisible(selectors.a2),
    b2: isVisible(selectors.b2),
    b3: isVisible(selectors.b3),
    s4: isVisible(selectors.s4),
  };
};

describe('show expression', () => {
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

  describe('show expression for Accordion Group', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showAttributeAccordion'));
      await clickCreateNewButton(this.page);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should open form with correct visibility for empty data on create action',
      async () => {
        const expectedSnapshot = {
          fieldSelect: true,
          g1: true,
          g2: false,
          g3: true,
          g4: false,
          s1: true,
          b2: false,
          a2: false,
          s3: false,
          b3: false,
          s4: false
        };

        const actualSnapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualSnapshot).toEqual(expectedSnapshot);
      });

    test(
      'should show Group#2 and its children and not affect others fields visibility',
      async () => {
        const expectedSnapshot1 = {
          fieldSelect: true,
          g1: true,
          g2: true,
          g3: true,
          g4: false,
          s1: false,
          b2: true,
          a2: false,
          s3: false,
          b3: false,
          s4: false
        };

        await selectDxListValue('Option2', selectFieldName, this.page);
        await this.page.waitForSelector(selectors.g2, { visible: true });
        await toggleGroup(selectors.g2, groupType, this.page);
        await this.page.waitForSelector(selectors.s1, { hidden: true });

        const actualSnapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualSnapshot1).toEqual(expectedSnapshot1);
      });

    test(
      'should show/hide fields inside Group',
      async () => {
        await toggleGroup(selectors.g3, groupType, this.page);
        const booleanCtrl = await this.page.waitForSelector('[adp-qaid-field-control="b3"]', { visible: true });
        await booleanCtrl.click();

        const s3FieldEl = await this.page.waitForSelector(selectors.s3, { visible: true });
        expect(s3FieldEl).not.toBeNull();
      });

    test(
      'should show Array fields inside Group',
      async () => {
        await selectDxListValue('Option2', selectFieldName, this.page);
        await this.page.waitForSelector(selectors.g2, { visible: true });
        await toggleGroup(selectors.g2, groupType, this.page);

        const booleanCtrl = await this.page.waitForSelector('[adp-qaid-field-control="b2"]', { visible: true });
        await this.page.waitForTimeout(500);
        await booleanCtrl.click();

        const a2FieldEl = await this.page.waitForSelector(selectors.a2, { visible: true });
        expect(a2FieldEl).not.toBeNull();
      });

    test(
      'should show correct fields for Group on edit action',
      async () => {
        await toggleGroup(selectors.g3, groupType, this.page);
        const booleanCtrl = await this.page.waitForSelector('[adp-qaid-field-control="b3"]', { visible: true });
        await booleanCtrl.click();

        const [{ _id }] = await Promise.all([
          getResponseForCreatedRecord('helperMethods_showAttributeAccordion', this.page),
          clickSubmit(this.page)]);
        await clickEditButton(_id, this.page);

        const groupEl = await this.page.waitForSelector(selectors.g3, { visible: true });
        await groupEl.click();
        await this.page.waitForSelector(selectors.s1, { hidden: true });

        const expectedSnapshot = {
          fieldSelect: true,
          g1: true,
          g2: false,
          g3: true,
          g4: false,
          s1: false,
          b2: false,
          a2: false,
          s3: true,
          b3: true,
          s4: false,
        };

        await this.page.waitForTimeout(500);
        const actualSnapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualSnapshot).toEqual(expectedSnapshot);
      });

    test(
      'should be able show/hide Group content after after show evaluation',
      async () => {
        await selectDxListValue('Option2', selectFieldName, this.page);
        await this.page.waitForSelector(selectors.g2, { visible: true });

        let group2IsCollapsedActual1 = await isGroupCollapsed(selectors.g2, this.page);
        expect(group2IsCollapsedActual1).toBe(true);

        await this.page.waitForTimeout(400);
        await toggleGroup(selectors.g2, groupType, this.page);
        let group2IsCollapsedActual2 = await isGroupCollapsed(selectors.g2, this.page);
        expect(group2IsCollapsedActual2).toBe(false);
      });
  });
});
