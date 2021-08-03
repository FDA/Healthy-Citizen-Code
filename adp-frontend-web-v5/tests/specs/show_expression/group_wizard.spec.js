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
  interceptor: {
    getResponseForCreatedRecord
  }
} = require('../../utils');

const {
  selectDxListValue,
} = require('../../utils/select.helpers');


const selectors = {
  fieldSelect: '#list_id_fieldSelect',
  s1: '[adp-qaid-field-control="s1"]',
  s3: '[adp-qaid-field-control="s3"]',
  b2: '[adp-qaid-field-control="b2"]',
  a2: '[name="a2[0]"]',
  b3: '[adp-qaid-field-control="b3"]',
  s4: '[adp-qaid-field-control="s4"]',

  g1: '[ng-group-name="g1"]',
  g2: '[ng-group-name="g2"]',
  g3: '[ng-group-name="g3"]',
  g4: '[ng-group-name="g4"]',

  m1: '[ng-wizard-menu-item="g1"]',
  m2: '[ng-wizard-menu-item="g2"]',
  m3: '[ng-wizard-menu-item="g3"]',
  m4: '[ng-wizard-menu-item="g4"]',
};

const selectName = 'fieldSelect';

const getVisibilitySnapshot = selectors => {
  const isVisible = s => {
    const e = document.querySelector(s);
    if (e === null) {
      return false;
    }

    return !!e.offsetParent;
  };

  return {
    fieldSelect: isVisible(selectors.fieldSelect),
    s1: isVisible(selectors.s1),
    s3: isVisible(selectors.s3),
    b3: isVisible(selectors.b3),
    b2: isVisible(selectors.b2),
    a2: isVisible(selectors.a2),
    s4: isVisible(selectors.s4),

    g1: isVisible(selectors.g1),
    g2: isVisible(selectors.g2),
    g3: isVisible(selectors.g3),
    g4: isVisible(selectors.g4),

    m1: isVisible(selectors.m1),
    m2: isVisible(selectors.m2),
    m3: isVisible(selectors.m3),
    m4: isVisible(selectors.m4),
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

  describe('show expression for Wizard Group', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showAttributeWizard'));
      await clickCreateNewButton(this.page);
      await this.page.waitForTimeout(1000);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should have same all Groups and related menu items in DOM when form opened',
      async () => {
        const expectedVisibilitySnapshot = {
          fieldSelect: true,
          s1: true,
          s3: false,
          b2: false,
          a2: false,
          b3: false,
          s4: false,

          g1: true,
          g2: false,
          g3: false,
          g4: false,

          m1: true,
          m2: false,
          m3: true,
          m4: false,
        };

        const actualVisibilitySnapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualVisibilitySnapshot).toEqual(expectedVisibilitySnapshot);
      });

    test(
      'should change visibility and dom presence related Group and its children on menu click',
      async () => {
        await selectDxListValue('Option2', selectName, this.page);
        const menuBtn = await this.page.waitForSelector(selectors.m2, { visible: true });
        await menuBtn.click();
        await this.page.waitForSelector(selectors.b2, { visible: true });

        const expectedVisibilitySnapshot = {
          fieldSelect: true,
          s1: false,
          b2: true,
          a2: false,
          s3: false,
          b3: false,
          s4: false,

          g1: false,
          g2: true,
          g3: false,
          g4: false,

          m1: true,
          m2: true,
          m3: true,
          m4: false,
        };

        const actualVisibilitySnapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualVisibilitySnapshot).toEqual(expectedVisibilitySnapshot);
      });

    test(
      'should be able to show/hide field inside group',
      async () => {
        await this.page.click(selectors.m3);
        const booleanCtrl = await this.page.waitForSelector(selectors.b3, { visible: true });
        await booleanCtrl.click();
        const s3Field = await this.page.waitForSelector(selectors.s3, { visible: true });

        expect(s3Field).not.toBeNull();
      });

    test(
      'should have same all Groups and related menu items in DOM when form opened for editing',
      async () => {
        await this.page.click(selectors.m3);
        const booleanCtrl = await this.page.waitForSelector(selectors.b3, { visible: true });
        await booleanCtrl.click();

        await selectDxListValue('Option2', selectName, this.page);

        await clickSubmit(this.page);
        const { _id } = await getResponseForCreatedRecord('helperMethods_showAttributeWizard', this.page);
        await clickEditButton(_id, this.page);

        await this.page.click(selectors.m3);
        await this.page.waitForSelector(selectors.b3, { visible: true });

        const expectedVisibilitySnapshot = {
          fieldSelect: true,
          s1: false,
          b2: false,
          a2: false,
          s3: true,
          b3: true,
          s4: false,

          g1: false,
          g2: false,
          g3: true,
          g4: false,

          m1: true,
          m2: true,
          m3: true,
          m4: false,
        };

        const actualVisibilitySnapshot = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualVisibilitySnapshot).toEqual(expectedVisibilitySnapshot);
      });

    test(
      'should show Array fields inside Group',
      async () => {
        await selectDxListValue('Option2', selectName, this.page);
        const menuItem = await this.page.waitForSelector(selectors.m2, { visible: true });
        await menuItem.click();

        const boolCtrl = await this.page.waitForSelector(selectors.b2, { visible: true });
        await boolCtrl.click();

        const a2Field = await this.page.waitForSelector(selectors.a2, { visible: true });
        expect(a2Field).not.toBeNull();
      })
  });
});
