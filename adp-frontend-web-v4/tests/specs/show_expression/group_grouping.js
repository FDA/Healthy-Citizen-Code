const puppeteer = require('puppeteer');

const {
  TEST_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    selectOptionByValue,
    clickEditButton
  },
  submit: {
    clickSubmit
  },
  group: {
    toggleGroup,
    isGroupCollapsed,
    dragGroupDown
  },
  interceptor: {
    getResponseForCreatedRecord
  }
} = require('../../utils');

const groupType = 'grouping';

const selectors = {
  fieldSelect: '#s2id_fieldSelect',
  g1: '[ng-group-name="g1"]',
  g2: '[ng-group-name="g2"]',
  g3: '[ng-group-name="g3"]',
  g4: '[ng-group-name="g4"]',
  s1: '#s1',
  b2: '[name="b2"]',
  a2: '[name="a2[0]"]',
  s3: '#s3',
  b3: '[name="b3"]',
  s4: '#s4',
};

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
    b2: hasDomElement(selectors.b2),
    a2: hasDomElement(selectors.a2),
    s3: hasDomElement(selectors.s3),
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
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await this.browser.close();
  });

  describe('show expression Group Grouping', () => {
    beforeEach(async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor('helperMethods_showAttributeGrouping'));
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
      },
      TEST_TIMEOUT
    );

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

        await selectOptionByValue('Option2', selectors.fieldSelect, this.page);
        await this.page.waitForSelector(selectors.b2);
        await this.page.waitFor(200);

        const actualSnapshot1 = await this.page.evaluate(getVisibilitySnapshot, selectors);
        expect(actualSnapshot1).toEqual(expectedSnapshot1);
      },
      TEST_TIMEOUT
    );

    test(
      'should show/hide field inside Group',
      async () => {
        await this.page.click('#checkbox-label-b3');

        let s3IsVisibleActual = await this.page.evaluate(
          s => document.querySelector(s) !== null,
          selectors.s3
        );

        expect(s3IsVisibleActual).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'should show correct fields for Group on edit action',
      async () => {
        await this.page.click('#checkbox-label-b3');
        await selectOptionByValue('Option2', selectors.fieldSelect, this.page);
        await this.page.waitForSelector(selectors.b2);

        await clickSubmit(this.page);
        const { id } = await getResponseForCreatedRecord('helperMethods_showAttributeGrouping', this.page);
        await clickEditButton(id, this.page);

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
      },
      TEST_TIMEOUT
    );

    test(
      'should be able to toggle group after show evaluation',
      async () => {
        await selectOptionByValue('Option2', selectors.fieldSelect, this.page);
        await this.page.waitForSelector(selectors.b2);

        await toggleGroup(selectors.g2, groupType, this.page);
        let group2IsCollapsedActual1 = await isGroupCollapsed(selectors.g2, this.page);
        expect(group2IsCollapsedActual1).toBe(true);

        await toggleGroup(selectors.g2, groupType, this.page);
        let group2IsCollapsedActual2 = await isGroupCollapsed(selectors.g2, this.page);
        expect(group2IsCollapsedActual2).toBe(false);
      },
      TEST_TIMEOUT
    );

    test(
      'should show Array fields inside Group',
      async () => {
        await selectOptionByValue('Option2', selectors.fieldSelect, this.page);
        await this.page.waitForSelector(selectors.b2);
        await this.page.waitFor(200);

        await this.page.click('#checkbox-label-b2');

        let a2IsVisibleActual = await this.page.evaluate(
          s => document.querySelector(s) !== null,
          selectors.a2
        );

        expect(a2IsVisibleActual).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'should be able to grad Group#2 after show evaluation',
      async () => {
        await selectOptionByValue('Option2', selectors.fieldSelect, this.page);
        await this.page.waitForSelector(selectors.b2);

        await dragGroupDown(selectors.g1, this.page);
        let actualGroupsOrder = await this.page.evaluate(
          () => [...document.querySelectorAll('[ng-group-name]')]
            .map(e => e.getAttribute('ng-group-name'))
        );
        expect(actualGroupsOrder).toEqual(['g2', 'g1', 'g3', 'g4']);
      },
      TEST_TIMEOUT
    )
  });
});

