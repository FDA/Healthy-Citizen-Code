const puppeteer = require('puppeteer');
const urlParse = require('url-parse');
const {

  getLaunchOptions,
  getUrlFor,
  loginWithUser,
} = require('../../utils');


describe('redirects for guest and user', () => {
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

  test(
    `should not allow to open inner page for Guest user`,
    async () => {
      await this.page.goto(getUrlFor('login'));
      await this.page.waitForSelector('#login');

      await this.page.goto(getUrlFor('basicTypes'));
      await this.page.waitForSelector('#login');

      const url = urlParse(this.page.url(), true);
      expect(url.hash).toBe(`#/login?returnUrl=%2FbasicTypes`);
    });

  const guestUrls = ['login', 'register', 'forgot-password'];
  for (let i = 0; i < guestUrls.length; i++) {
    test(
      `should not allow to open "${guestUrls[i]}" page for authorized user`,
      async () => {
        await loginWithUser(this.page);

        await this.page.goto(getUrlFor(guestUrls[i]));
        await this.page.waitForSelector('.page-app-home');

        const url = urlParse(this.page.url(), true);
        expect(url.hash).toBe(`#/home`);
      })
  }
});
