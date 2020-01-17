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
  s1: '#s1',
  s3: '#s3',
  b2: '[name="b2"]',
  a2: '[name="a2[0]"]',
  b3: '[name="b3"]',
  s4: '#s4',

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

    return document.querySelector(s).offsetParent !== null;
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

const getDomSnapshot = selectors => {
  const inDom = s => document.querySelector(s) !== null;

  return {
    fieldSelect: inDom(selectors.fieldSelect),
    s1: inDom(selectors.s1),
    s3: inDom(selectors.s3),
    b2: inDom(selectors.b2),
    a2: inDom(selectors.a2),
    b3: inDom(selectors.b3),
    s4: inDom(selectors.s4),

    g1: inDom(selectors.g1),
    g2: inDom(selectors.g2),
    g3: inDom(selectors.g3),
    g4: inDom(selectors.g4),

    m1: inDom(selectors.m1),
    m2: inDom(selectors.m2),
    m3: inDom(selectors.m3),
    m4: inDom(selectors.m4),
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
      await this.page.waitFor(1000);
    });

    afterEach(async () => {
      await this.page.close();
    });

    test(
      'should have same all Groups and related menu items in DOM when form opened',
      async () => {
        const expectedDomSnapshot = {
          fieldSelect: true,
          s1: true,
          s3: false,
          b2: false,
          a2: false,
          b3: true,
          s4: false,

          g1: true,
          g2: true,
          g3: true,
          g4: true,

          m1: true,
          m2: true,
          m3: true,
          m4: true,
        };

        const actualDomSnapshot = await this.page.evaluate(
          getDomSnapshot,
          selectors
        );
        expect(actualDomSnapshot).toEqual(expectedDomSnapshot);

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

        const actualVisibilitySnapshot = await this.page.evaluate(
          getVisibilitySnapshot,
          selectors
        );
        expect(actualVisibilitySnapshot).toEqual(expectedVisibilitySnapshot);
      });

    test(
      'should change visibility and dom presence related Group and its children on menu click',
      async () => {
        await selectDxListValue('Option2', selectName, this.page);

        const expectedDomSnapshot = {
          fieldSelect: true,
          s1: true,
          s3: false,
          b2: true,
          a2: false,
          b3: true,
          s4: false,

          g1: true,
          g2: true,
          g3: true,
          g4: true,

          m1: true,
          m2: true,
          m3: true,
          m4: true,
        };

        const actualDomSnapshot = await this.page.evaluate(
          getDomSnapshot,
          selectors
        );
        expect(actualDomSnapshot).toEqual(expectedDomSnapshot);

        await this.page.click(selectors.m2);
        await this.page.waitFor(500);
        // await this.page.waitForSelector(selectors.s2);

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

        const actualVisibilitySnapshot = await this.page.evaluate(
          getVisibilitySnapshot,
          selectors
        );
        expect(actualVisibilitySnapshot).toEqual(expectedVisibilitySnapshot);
      });

    test(
      'should be able to show/hide field inside group',
      async () => {
        await this.page.click(selectors.m3);
        await this.page.waitForSelector(selectors.b3);

        await this.page.click('#checkbox-label-b3');

        const isVisible = s => {
          const e = document.querySelector(s);
          if (e === null) {
            return false;
          }

          return document.querySelector(s).offsetParent !== null;
        };

        const s3FieldVisibility = await this.page.evaluate(isVisible, selectors.s3);
        expect(s3FieldVisibility).toBe(true);
      });

    test(
      'should have same all Groups and related menu items in DOM when form opened for editing',
      async () => {
        await this.page.click(selectors.m3);
        await this.page.waitForSelector(selectors.b3);
        await this.page.click('#checkbox-label-b3');
        await selectDxListValue('Option2', selectName, this.page);

        await clickSubmit(this.page);
        const { _id } = await getResponseForCreatedRecord('helperMethods_showAttributeWizard', this.page);
        await clickEditButton(_id, this.page);

        const expectedDomSnapshot = {
          fieldSelect: true,
          s1: true,
          b2: true,
          a2: false,
          s3: true,
          b3: true,
          s4: false,

          g1: true,
          g2: true,
          g3: true,
          g4: true,

          m1: true,
          m2: true,
          m3: true,
          m4: true,
        };

        const actualDomSnapshot = await this.page.evaluate(
          getDomSnapshot,
          selectors
        );
        expect(actualDomSnapshot).toEqual(expectedDomSnapshot);

        await this.page.click(selectors.m3);
        await this.page.waitForSelector(selectors.b3);
        // fix for unstable test: to make sure b3 is visible
        await this.page.waitFor(1000);

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

        const actualVisibilitySnapshot = await this.page.evaluate(
          getVisibilitySnapshot,
          selectors
        );
        expect(actualVisibilitySnapshot).toEqual(expectedVisibilitySnapshot);
      });

    test(
      'should show Array fields inside Group',
      async () => {
        await selectDxListValue('Option2', selectName, this.page);
        await this.page.waitForSelector(selectors.b2);
        await this.page.waitFor(200);

        await this.page.click(selectors.m2);
        await this.page.click('#checkbox-label-b2');

        let a2IsVisibleActual = await this.page.evaluate(
          s => document.querySelector(s) !== null,
          selectors.a2
        );

        expect(a2IsVisibleActual).toBe(true);
      })
  });
});
