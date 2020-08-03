const puppeteer = require("puppeteer");
const _ = require("lodash");

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
} = require("../../../utils");

const PAGE_TO_TEST = "dataGraph3d";

describe("3D visualisaton page", () => {
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
    "should open 3d vis page with all panels",
    async () => {
      const canvasSelector = "#fg3d-container #fg3d-box canvas";
      const configSelector = "#fg3d-container .fg3d-left-panel .fg3d-config";
      const lenegSelector = "#fg3d-container .fg3d-left-panel .fg3d-legend";

      await this.page.waitFor(canvasSelector);
      await this.page.waitFor(configSelector);
      await this.page.waitFor(lenegSelector);
    });
});
