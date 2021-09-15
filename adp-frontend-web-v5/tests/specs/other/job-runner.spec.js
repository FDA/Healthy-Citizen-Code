const puppeteer = require("puppeteer");
const _ = require("lodash");
const $ = require("jquery");

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    fillInputById,
    clickButton,
    clickTableAction,
  },
  interceptor: {
    getResponseByPath,
  },
} = require("../../utils");

async function clickSubmit(page) {
  await clickButton(page, `button[type="submit"]`);
}

describe("SCG job run", () => {
  const generatedName = "Rand " + (new Date).getTime();
  let jobId;

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

  afterEach(async () => {
    await this.page.close();
  });

  test(
    "should run SCG to generate one new basicTypes record",
    async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor("basicTypes"));

      await clickButton(this.page, ".adp-toolbar-action-syntheticGenerate .dx-menu-item-content");

      await fillInputById(this.page, 1, "recordsNum");
      await fillInputById(this.page, generatedName, "batchName");

      [jobId] = await Promise.all([
        getResponseByPath(this.page, "jobId", "scgRun"),
        clickSubmit(this.page),
      ]);

      expect(jobId).toMatch(/^scgRunner-\w+$/);
    });

  test(
    "should find previously created job on BackgroundJobs page and remove it",
    async () => {
      this.page = await this.context.newPage();
      const paramsString = encodeURIComponent(`id=${jobId}&Operation=contains`);
      await this.page.goto(getUrlFor(`backgroundJobs?filter=${paramsString}`));

      const selector = ".dx-row.dx-data-row.dx-column-lines";
      await this.page.waitForSelector(selector);

      let rowsFound = await this.page.evaluate(jobId => $(`td.name-id:contains(${jobId})`).length, jobId);

      expect(rowsFound).toEqual(1);

      // This is very dirty since removing TOP job instead of created one.
      // Well, in most cases this is same record anyway...
      await clickTableAction(null, 'deleteBackgroundJob', this.page);
      await clickButton(this.page, ".modal-dialog button.adp-action-b-primary");
    });
});

