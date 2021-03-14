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
  s1: '#s1',
  b2: '[ng-field-name="b2"]',
  a2: '[name="a2[0]"]',
  s3: '#s3',
  b3: '[ng-field-name="b3"]',
  s4: '#s4',
};

const selectFieldName = 'fieldSelect'

const groupType = 'accordion';

const getVisibilitySnapshot = selectors => {
  const hasDomElement = s => {
    return document.querySelector(s) !== null;
  };

  const isVisible = s => {
    return document.querySelector(s).offsetParent !== null;
  };

  return {
    fieldSelect: hasDomElement(selectors.fieldSelect),
    g1: isVisible(selectors.g1),
    g2: isVisible(selectors.g2),
    g3: isVisible(selectors.g3),
    g4: isVisible(selectors.g4),
    s1: hasDomElement(selectors.s1),
    s3: hasDomElement(selectors.s3),
    a2: hasDomElement(selectors.a2),
    b2: hasDomElement(selectors.b2),
    b3: hasDomElement(selectors.b3),
    s4: hasDomElement(selectors.s4),
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
          b3: true,
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
          s1: true,
          b2: true,
          a2: false,
          s3: false,
          b3: true,
          s4: false
        };

        await selectDxListValue('Option2', selectFieldName, this.page);
        await this.page.waitForSelector(selectors.b2);
        await this.page.waitForTimeout(200);

        const actualSnapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualSnapshot1).toEqual(expectedSnapshot1);
      });

    test(
      'should show/hide fields inside Group',
      async () => {
        await toggleGroup(selectors.g3, groupType, this.page);
        await this.page.click('[ng-field-name="b3"] .dx-switch-handle');
        await this.page.waitForTimeout(200);

        let s3IsVisibleActual = await this.page.evaluate(
          s => document.querySelector(s) !== null,
          selectors.s3
        );

        expect(s3IsVisibleActual).toBe(true);
      });

    test(
      'should show Array fields inside Group',
      async () => {
        await selectDxListValue('Option2', selectFieldName, this.page);
        await this.page.waitForSelector(selectors.b2);
        await this.page.waitForTimeout(200);

        await toggleGroup(selectors.g2, groupType, this.page);
        await this.page.click('[ng-field-name="b2"] .dx-switch-handle');
        await this.page.waitForTimeout(200);

        let a2IsVisibleActual = await this.page.evaluate(
          s => document.querySelector(s) !== null,
          selectors.a2
        );

        expect(a2IsVisibleActual).toBe(true);
      });

    test(
      'should show correct fields for Group on edit action',
      async () => {
        await toggleGroup(selectors.g3, groupType, this.page);
        await this.page.click('[ng-field-name="b3"] .dx-switch-handle');
        await this.page.waitForTimeout(200);

        await selectDxListValue('Option2', selectFieldName, this.page);
        await this.page.waitForSelector(selectors.b2);

        await clickSubmit(this.page);
        const { _id } = await getResponseForCreatedRecord('helperMethods_showAttributeAccordion', this.page);
        await clickEditButton(_id, this.page);

        const expectedSnapshot = {
          fieldSelect: true,
          g1: true,
          g2: true,
          g3: true,
          g4: false,
          s1: true,
          b2: true,
          a2: false,
          s3: true,
          b3: true,
          s4: false
        };

        const actualSnapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualSnapshot).toEqual(expectedSnapshot);
      });

    test(
      'should be able show/hide Group content after after show evaluation',
      async () => {
        await selectDxListValue('Option2', selectFieldName, this.page);
        await this.page.waitForSelector(selectors.b2);

        let group2IsCollapsedActual1 = await isGroupCollapsed(selectors.g2, this.page);
        expect(group2IsCollapsedActual1).toBe(true);

        await toggleGroup(selectors.g2, groupType, this.page);
        let group2IsCollapsedActual2 = await isGroupCollapsed(selectors.g2, this.page);
        expect(group2IsCollapsedActual2).toBe(false);
      });
  });
});
