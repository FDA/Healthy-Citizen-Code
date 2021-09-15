const puppeteer = require("puppeteer");
const _ = require("lodash");
const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  getToken,
  gql: {
    gqlEmptyRecord,
  },
  form: {
    fillInputById,
    clickButton,
    clickTableAction,
  },
  interceptor: {
    getResponseByPath,
  },
} = require("../../utils");

const {
  selectDxListValue,
} = require("../../utils/select.helpers");

async function clickSubmit(page) {
  await clickButton(page, `button[type="submit"]`);
}

describe("datasets", () => {
  const generatedName = "Rand " + (new Date).getTime();
  let datasetId;

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
  });

  afterEach(async () => {
    await this.page.close();
  });

  test(
    "should export basicTypes into DB collection",
    async () => {
      this.page = await this.context.newPage();
      await this.page.goto(getUrlFor("basicTypes"));

      await clickButton(this.page, ".adp-toolbar-action-export .dx-menu-item-content");
      await this.page.waitForSelector('#list_id_format');
      await selectDxListValue("Database dataset", "format", this.page);
      await fillInputById(this.page, generatedName, "name");
      await clickSubmit(this.page);

      datasetId = await getResponseByPath(this.page, "datasetsClone._id");
    });

  // commented due huge performance issues with dataset forms
  // form is not opened, when testTimeout is expired
  // test(
  //   "should clone previously created dataset and remove both datasets",
  //   async () => {
  //     this.page = await this.context.newPage();
  //     await this.page.goto(getUrlFor("datasets"));
  //
  //     await clickTableAction(datasetId, "clone", this.page);
  //
  //     const selector = "input#name";
  //     await this.page.waitForSelector(selector);
  //
  //     const value = await this.page.$eval(selector, el => el.value);
  //
  //     expect(value).toEqual(generatedName);
  //
  //     const [clonedDatasetId] =
  //       await Promise.all([
  //         getResponseByPath(this.page, "datasetsClone._id"),
  //         this.page.click("[type=submit][data-action-name=\"apply\"]"),
  //       ]);
  //
  //     const token = await getToken(this.page);
  //
  //     const [deleteResponse1, deleteResponse2] = await Promise.all([
  //       gqlEmptyRecord(token, "datasets", datasetId),
  //       gqlEmptyRecord(token, "datasets", clonedDatasetId)
  //     ]);
  //
  //     expect(_.get(deleteResponse1, "data.datasetsDeleteOne.deletedCount")).toEqual(1);
  //     expect(_.get(deleteResponse2, "data.datasetsDeleteOne.deletedCount")).toEqual(1);
  //   });
});

