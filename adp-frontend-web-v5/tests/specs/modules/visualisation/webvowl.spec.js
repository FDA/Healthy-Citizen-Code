const puppeteer = require("puppeteer");
const _ = require("lodash");

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
} = require("../../../utils");

const PAGE_TO_TEST = "dataGraph2d";

describe("2D visualisation(WEBVOWL) page", () => {
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
  })

  test(
    "should open 2d vis (webvowl) page",
    async () => {
      const canvasSelector = ".well vowl iframe";

      await this.page.waitForSelector(canvasSelector);

    });
});
