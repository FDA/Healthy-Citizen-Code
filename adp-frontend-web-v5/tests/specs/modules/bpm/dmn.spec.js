const puppeteer = require("puppeteer");
const _ = require("lodash");

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    clickTableAction,
  },
  submit: {
    clickSubmit,
  }
} = require("../../../utils");

const PAGE_TO_TEST = "businessRules";
const waitForGridLoaded = async (page) => page.waitForTimeout(2000);
const ensureAtLeastOneRecordExistToDisplayActions = async (page) => {
  const hasData = await page.$(".dx-data-row td");
  if (hasData) {
    return;
  }

  const nameInputSelector = "#name input";
  await clickCreateNewButton(page);
  await page.waitForSelector(nameInputSelector);
  await page.type(nameInputSelector, "autoTestingDmn_" + (new Date).getTime());
  await clickSubmit(page);
}

describe("DMN business processes page", () => {
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
    "should open diagram editor by action click with svg and tools panel",
    async () => {
      await clickTableAction(null, 'rulesEditor', this.page);

      const editorSvgSelector = "#editor-container #bpm-canvas svg";
      const toolPaletteSelector = "#editor-container #bpm-canvas .djs-palette";
      const diagramElementSelector = editorSvgSelector + " .djs-group .djs-element"

      await this.page.waitForSelector(editorSvgSelector);
      await this.page.waitForSelector(toolPaletteSelector);
      await this.page.waitForSelector(diagramElementSelector);  // This test requires at least one element to be present on diagram!
    });
});
