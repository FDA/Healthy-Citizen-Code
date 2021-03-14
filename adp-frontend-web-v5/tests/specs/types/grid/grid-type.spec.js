const puppeteer = require("puppeteer");

const {
  SELECTOR_TIMEOUT,
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  getToken,
  form: {
    clickCreateNewButton,
    clickEditButton
  },
  interceptor: {
    getResponseForCreatedRecord,
  },
  gql:{
    gqlEmptyRecord
  }
} = require("../../../utils");

describe("Grid type", () => {
  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    this.context = await this.browser.createIncognitoBrowserContext();
    const page = await this.context.newPage();
    await loginWithUser(page);
    await page.waitForTimeout(700);
    await page.close();
  });

  afterAll(async () => {
    await this.browser.close();
  });

  const openNewPage = async url => {
    this.page = await this.context.newPage();
    await this.page.goto(getUrlFor(url));
  }

  afterEach(async () => {
    await this.page.close();
  });

  test(
    "basic Grid Control functionality",
    async () => {


      await openNewPage("gridType");
      await clickCreateNewButton(this.page);

      await this.page.waitForSelector(".adp-toolbar-action-gridCreateControl.dx-state-disabled", {timeout: SELECTOR_TIMEOUT});

      const disabledButtonsCount = await this.page.$$eval("form .dx-state-disabled.dx-toolbar-item.adp-toolbar-action-gridCreateControl  .dx-state-disabled.dx-menu-item button", $els => $els.length);

      expect(disabledButtonsCount).toBe(2);

      const addBtnSelector = "form.gridType button[data-action-name='submit']";

      await this.page.waitForSelector(addBtnSelector, {timeout: SELECTOR_TIMEOUT});
      await this.page.waitForTimeout(350);

      const recordData =
        await Promise.all([
          getResponseForCreatedRecord("gridType", this.page),
          this.page.click(addBtnSelector)
        ]);

      const {_id: mainRecordId} = recordData[0];
      await clickEditButton(mainRecordId, this.page)

      await this.page.waitForSelector("form.gridType", {timeout: SELECTOR_TIMEOUT});
      await this.page.waitForSelector(".adp-toolbar-action-gridCreateControl", {timeout: SELECTOR_TIMEOUT});

      const enabledButtonsCount = await this.page.$$eval("form.gridType .dx-toolbar-item.adp-toolbar-action-gridCreateControl:not(.dx-state-disabled) .dx-menu-item:not(.dx-state-disabled) button", $els => $els.length);

      expect(enabledButtonsCount).toBe(2);

      const gridTable1button = '.dx-overlay-wrapper .create-grid-control .dx-menu-item';
      await this.page.click("form.gridType grid-control .dx-toolbar button");

      await this.page.waitForSelector(gridTable1button, {timeout: SELECTOR_TIMEOUT});
      await this.page.click(gridTable1button);

      const linkedToFieldSelector = 'form.gridTable1 [field-name-input="linkedTo"]';
      await this.page.waitForSelector(linkedToFieldSelector, {timeout: SELECTOR_TIMEOUT});

      const linkedToId = await this.page.$eval(linkedToFieldSelector, el=>el.value);

      expect(linkedToId).toBe(mainRecordId);

      const relatedRecordData =
        await Promise.all([
          getResponseForCreatedRecord("gridTable1", this.page),
          this.page.click("form.gridTable1 button[data-action-name='submit']")
        ]);

      const {_id: relatedRecordId} = relatedRecordData[0];
      const gridControlEditButton =
        `form.gridType section[ng-field-name="multiTableGrid"] table.dx-datagrid-table div.actions-column-container[adp-${relatedRecordId}] button`;
      await this.page.waitForSelector(gridControlEditButton, {timeout: SELECTOR_TIMEOUT});
      await this.page.click(gridControlEditButton);

      await this.page.waitForSelector(linkedToFieldSelector);
      await this.page.type(linkedToFieldSelector, 'smth-wrong');

      await this.page.click("form.gridTable1 button[data-action-name='submit']");
      await this.page.waitForTimeout(1000); //wait grid control to reload

      const linkedRow = await this.page.$(`form.gridType section[ng-field-name="multiTableGrid"] table.dx-datagrid-table button`);

      expect(linkedRow).toBeFalsy();

      const token = await getToken(this.page);

      await gqlEmptyRecord(token, 'gridType', mainRecordId);
      await gqlEmptyRecord(token, 'gridTable1', relatedRecordId);
    });
});
