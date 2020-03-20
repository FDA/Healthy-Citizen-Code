const puppeteer = require("puppeteer");

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {clickCreateNewButton},
  submit: {clickSubmit},
  interceptor: {
    getResponseForCreatedRecord,
  }
} = require("../../utils");

const collectionName = "gridOptions";
const loaderInFadedFormSelector = ".modal-content adp-form.adp-disabled-form adp-page-loader > div";
const formIsPresentSelector = "[name='string']";

describe("submit form", () => {
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
    await this.page.goto(getUrlFor(collectionName));
    await clickCreateNewButton(this.page);
  });

  afterEach(async () => {
    await this.page.close();
  });

  test(
    "should disable form while submit",
    async () => {
      await this.page.waitForSelector(formIsPresentSelector);

      let res = await Promise.all([
        this.page.waitForSelector(loaderInFadedFormSelector),
        clickSubmit(this.page),
      ]);

      expect(res[0])
        .toBeTruthy();

      await getResponseForCreatedRecord(collectionName, this.page);

      res = await this.page.$(loaderInFadedFormSelector);

      expect(res)
        .toBeFalsy();
    });
});

