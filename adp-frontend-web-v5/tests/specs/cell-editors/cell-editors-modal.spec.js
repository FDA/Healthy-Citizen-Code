const puppeteer = require('puppeteer');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  object: { clickObject, },
  array: {
    clickArrayItem,
    addArrayItem,
  }
} = require('../../utils');

const {
  waitForGridLoaded,
} = require('./cell-editors.utils');

const PAGE_TO_TEST = 'cellEditingModalsComplex';

describe('Cell Editors: modals', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    this.context = await this.browser.createIncognitoBrowserContext();
    this.page = await this.context.newPage();
    await loginWithUser(this.page);

    await this.page.goto(getUrlFor(PAGE_TO_TEST));
    await waitForGridLoaded(this.page);
  });

  afterAll(async () => {
    await this.page.close();
    await this.browser.close();
  });

  test(
    'should create and record using Modal Cell Editors',
    async () => {
      await this.page.click('.dx-datagrid-addrow-button');
      await this.page.waitForSelector('.cellEditingModalsComplex');

      await clickObject('o', this.page);
      const objectTextS1 = `object text s1 ${Date.now()}`;
      await this.page.type('[adp-qaid-field-control="o.s1"]', objectTextS1);

      await this.page.click('[type="submit"]');
      await waitForGridLoaded(this.page);

      const objectCellSelector = '.dx-data-row:first-child .name-o'
      const objectTextS1FromCell = await this.page.$eval(objectCellSelector, e => e.innerText);
      const expectedObjectValue = expect.stringContaining(objectTextS1FromCell);
      expect(objectTextS1FromCell).toEqual(expectedObjectValue);


      const arrayCellSelector = '.dx-data-row:first-child .name-a'
      await this.page.click(arrayCellSelector);
      await this.page.waitForSelector('.cellEditingModalsComplex');

      await clickArrayItem('a', 0, this.page);
      const arrayTextS1 = `array text s1 ${Date.now()}`;
      await this.page.type('[adp-qaid-field-control="a[0].s1"]', arrayTextS1);

      await addArrayItem('a', this.page);
      await clickArrayItem('a', 1, this.page);

      const arrayTextS2 = `array text s2 ${Date.now()}`;
      await this.page.type('[adp-qaid-field-control="a[1].s1"]', arrayTextS2);

      await this.page.click('[type="submit"]');
      await waitForGridLoaded(this.page);

      const arrayTextFromCell = await this.page.$eval(arrayCellSelector, e => e.innerText);
      const expected1 = expect.stringContaining(arrayTextS1);
      expect(arrayTextFromCell).toEqual(expected1);

      const expected2 = expect.stringContaining(arrayTextS2);
      expect(arrayTextFromCell).toEqual(expected2);
    }
  )
});
