const puppeteer = require('puppeteer');
const urlParse = require('url-parse');
const {
  getLaunchOptions,
  getUrlFor,
  loginWithUser,
} = require('../../utils');

describe('login', () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
  });

  afterAll(async () => {
    await this.browser.close();
  });

  beforeEach(async () => {
    const context = await this.browser.createIncognitoBrowserContext();
    this.page = await context.newPage();
    await this.page.goto(getUrlFor('login'));
    await this.page.waitForSelector('#login');
  });

  afterEach(async () => {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
    await this.page.close();
  });

  test(
    'successful login on correct input',
    async () => {
      await loginWithUser(this.page);

      const url = urlParse(this.page.url(), true);
      expect(url.pathname).toBe('/home');

      const hasLocalStorageVals = await this.page.evaluate(
        () => !!localStorage.getItem('ls.user') && !!localStorage.getItem('ls.token')
      );

      expect(hasLocalStorageVals).toBe(true);
    });

  test(
    'should fail login on incorrect input',
    async () => {
      const login = '12345';
      const password = '12345';
      await this.page.type('#login input', login);
      await this.page.type('#password input', password);
      const errorBoxSelector = '.toast-error .toast-message';
      const formWithErrorSelector = 'form.ng-submitted';

      const [_action, errorNode, formWithError] = await Promise.all([
        this.page.click('button[type="submit"]'),
        this.page.waitForSelector(errorBoxSelector),
        this.page.waitForSelector(formWithErrorSelector),
      ]);

      const errorMessageText = await errorNode.evaluate(node => node.innerText)
      expect(errorMessageText).toBe('Invalid credentials.');
      expect(formWithError).toBeTruthy();
    });
});
