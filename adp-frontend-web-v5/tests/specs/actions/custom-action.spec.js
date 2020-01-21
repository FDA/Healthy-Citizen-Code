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
  }
} = require('../../utils');
const { waitForGridLoaded } = require('../../utils/grid.helpers');

const PAGE_TO_TEST = 'customActions';

const ensureAtLeastOneRecordExistToDisplayActions = async (page) => {
  const hasData = await page.$('.dx-data-row td');
  if (hasData) {
    return;
  }

  await clickCreateNewButton(page);
  await clickSubmit(page);
}

describe('Custom Actions', () => {
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

  beforeEach(async () => {
    this.page = await this.context.newPage();
    await this.page.goto(getUrlFor(PAGE_TO_TEST));

    await waitForGridLoaded(this.page);
    await ensureAtLeastOneRecordExistToDisplayActions(this.page);
  })

  test(
    'should click to custom Link action',
    async () => {
      const linkAction = await this.page.$('.dx-data-row:first-child [data-action-name="link"]');
      expect(linkAction).toBeTruthy();
    });

  test(
    'should click to custom Action action',
    async () => {
      const linkAction = await this.page.$('.dx-data-row:first-child [data-action-name="action"]');
      expect(linkAction).toBeTruthy();
    });
});
