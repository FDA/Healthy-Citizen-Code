const puppeteer = require('puppeteer');
const urlParse = require('url-parse');
const { TEST_TIMEOUT, getLaunchOptions, getUrlFor, getUserCredentials } = require('../../utils');

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
    // await this.page.authenticate(getBasicAuth());
    await this.page.goto(getUrlFor('login'));
    await this.page.waitForSelector('#login');
  }, TEST_TIMEOUT);

  afterEach(async () => {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
    await this.page.close();
  });

  test(
    'successful login on correct input',
    async () => {
      const { login, password } = getUserCredentials();
      await this.page.type('#login', login);
      await this.page.type('#password', password);
      await Promise.all([this.page.click('button[type="submit"]'), this.page.waitForNavigation()]);

      const url = urlParse(this.page.url(), true);
      expect(url.hash).toBe('#/home');
      const hasLocalStorageVals = await this.page.evaluate(
        () => !!localStorage.getItem('ls.user') && !!localStorage.getItem('ls.token')
      );
      expect(hasLocalStorageVals).toBe(true);
    },
    TEST_TIMEOUT
  );

  test(
    'should fail login on incorrect input',
    async () => {
      const login = '12345';
      const password = '12345';
      await this.page.type('#login', login);
      await this.page.type('#password', password);
      const errorBoxSelector = '.bigBox';
      await Promise.all([
        this.page.click('button[type="submit"]'),
        this.page.waitForSelector(errorBoxSelector),
      ]);

      const errorMessageSelector = '.bigBox span';
      const errorMessageText = await this.page.$eval(errorMessageSelector, el => el.innerText);
      expect(errorMessageText).toBe('Invalid credentials.');
    },
    TEST_TIMEOUT
  );

  test(
    'should show login minLength message on short login',
    async () => {
      const threeCharLogin = '123';
      await this.page.type('#login', threeCharLogin);
      const minLenMessageSelector = 'adp-messages [ng-message="minLength"]';
      await this.page.waitForSelector(minLenMessageSelector);
      const messageText = await this.page.$eval(minLenMessageSelector, el => el.innerText);
      expect(messageText).toBe('Value is too short, should be at least 5 characters long');
    },
    TEST_TIMEOUT
  );
});
