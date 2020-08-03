const puppeteer = require("puppeteer");
const _ = require("lodash");

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
  },
  submit: {
    clickSubmit,
  }
} = require("../../../utils");

const PAGE_TO_TEST = "bpmnProcesses";
const waitForGridLoaded = async (page) => page.waitFor(2000);
const ensureAtLeastOneRecordExistToDisplayActions = async (page) => {
  const hasData = await page.$(".dx-data-row td");
  if (hasData) {
    return;
  }

  const nameInputSelector = "#name input";
  await clickCreateNewButton(page);
  await page.waitFor(nameInputSelector);
  await page.type(nameInputSelector, "autoTestingDmn001");
  await clickSubmit(page);
}

describe("BPMN business processes page", () => {
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
    "should open diagram editor by action click and load element id into props panel header",
    async () => {
      const ruleEditorSelector = ".dx-data-row:first-child [data-action-name=\"rulesEditor\"]"
      await this.page.waitFor(ruleEditorSelector);
      const linkAction = await this.page.$(ruleEditorSelector);

      expect(linkAction).toBeTruthy();

      await this.page.click(ruleEditorSelector);

      const editorSvgSelector = "#editor-container #bpm-canvas svg";
      const toolPaletteSelector = "#editor-container #bpm-canvas .djs-palette";
      const propsPanelSelector = "#editor-container #bpm-properties";
      const diagramElementSelector = editorSvgSelector + " .djs-group .djs-element"

      await this.page.waitFor(editorSvgSelector);
      await this.page.waitFor(toolPaletteSelector);
      await this.page.waitFor(propsPanelSelector);
      await this.page.waitFor(diagramElementSelector);   // This test requires at least one element to be present on diagram!

      const firstElementId = await this.page.$eval(diagramElementSelector, elem => {
        return elem.dataset.elementId
      });

      await this.page.click(diagramElementSelector);

      const propsPanelHeaderSelector = propsPanelSelector + " .bpp-properties-header .label";

      await this.page.waitFor(propsPanelHeaderSelector);

      const propsHeader = await this.page.$eval(propsPanelHeaderSelector, elem => elem.innerText);

      expect(propsHeader).toEqual(firstElementId);
    });
});
