const puppeteer = require('puppeteer');
const urlParse = require('url-parse');
const {
  getLaunchOptions,
  getUrlFor,
  fillLoginFormAndSubmit,
  loginWithUser,
  logout,
} = require('../../utils');

async function openLoginPageWithReturnUrl(redirectUrl, page) {
  await page.goto(getUrlFor(`login?returnUrl=${redirectUrl}`));
  await page.waitForSelector('#login');
}

describe('login redirects', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
  });

  afterAll(async () => {
    await this.browser.close();
  });

  beforeEach(async () => {
    const context = await this.browser.createIncognitoBrowserContext();
    this.page = await context.newPage();
  });

  afterEach(async () => {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
    await this.page.close();
  });

  const testsDefinitions = [
    { redirectPage: 'basicTypes', expectedPage: 'basicTypes' },
    { redirectPage: 'noSuchPage', expectedPage: 'home' },
    { redirectPage: encodeURIComponent('basicTypes?action=create&string=abc'), expectedPage: 'basicTypes?action=create&string=abc' }
  ];

  for (const testDef of testsDefinitions) {
    test(
      `should redirect to "${testDef.expectedPage}" page on login`,
      async () => {
        await openLoginPageWithReturnUrl(testDef.redirectPage, this.page);
        await fillLoginFormAndSubmit(this.page);

        const url = urlParse(this.page.url(), true);
        expect(url.hash).toBe(`#/${testDef.expectedPage}`);
      });
  }

  test(
    `should logout from basicTypes page and on login redirected back`,
    async () => {
      await loginWithUser(this.page);

      const expectedPage = 'basicTypes';
      await this.page.goto(getUrlFor(expectedPage));
      await logout(this.page);

      await fillLoginFormAndSubmit(this.page);

      const url = urlParse(this.page.url(), true);
      expect(url.hash).toBe(`#/${expectedPage}`);
    });

  const testsDefinitionsForGuestUsers = [
    { expectedPage: 'basicTypes' },
    { expectedPage: 'basicTypes?action=create&string=abc' },
    { expectedPage: 'basicTypes?filter=string%253D123%2526stringOperation%253Dequals' },
  ];

  for (const testDef of testsDefinitionsForGuestUsers) {
    test(
      `should redirect to "${testDef.expectedPage}" page on user login for guest`,
      async () => {
        await this.page.goto(getUrlFor(testDef.expectedPage));
        await this.page.waitForSelector('#login');

        await fillLoginFormAndSubmit(this.page);

        const url = urlParse(this.page.url(), true);
        expect(url.hash).toBe(`#/${testDef.expectedPage}`);
      });
  }
});
