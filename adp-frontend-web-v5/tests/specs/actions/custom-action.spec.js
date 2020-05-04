const puppeteer = require('puppeteer');
const _ = require('lodash');

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
} = require('../../utils');
const { waitForGridLoaded } = require('../../utils/grid.helpers');

const PAGE_TO_TEST = 'customActions';

const ensureAtLeastOneRecordExistToDisplayActions = async (page) => {
  const hasData = await page.$('.dx-data-row td');
  if (hasData) {
    return;
  }

  await clickCreateNewButton(page);
  await clickSubmit(page);
}

describe('Custom Actions', () => {
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

  const rowActionsSnapshot = [
    {
      "tag": "BUTTON",
      "type": "delete",
      "action": "delete",
      "iconClass": "fa fa-fw fa-trash"
    },
    {
      "tag": "BUTTON",
      "type": "update",
      "action": "update",
      "iconClass": "fa fa-fw fa-pencil"
    },
    {
      "tag": "BUTTON",
      "type": "AdpEchoTest.forRow",
      "action": "AdpEchoTest.forRow",
      "iconClass": "fa fa-fw fa-bolt"
    },
    {
      "tag": "BUTTON",
      "type": "showRowContents",
      "action": "showRowContents",
      "iconClass": "fa fa-fw fa-bolt"
    },
    {
      "tag": "A",
      "type": "/#/test/:_id/test-page",
      "action": "/#/test/:_id/test-page",
      "iconClass": "fa fa-fw fa-link"
    },
    {
      "tag": "BUTTON",
      "type": "clone",
      "action": "clone",
      "iconClass": "fa fa-fw fa-clone"
    },
    {
      "tag": "BUTTON",
      "type": "viewDetails",
      "action": "viewDetails",
      "iconClass": "fa fa-fw fa-eye"
    }
  ];

  const toolbarActionsSnapshot = [
    {
      "action": "customHelperAction",
      "iconClass": "dx-icon fa fa-bolt",
      "customItemClass": ""
    },
    {
      "action": "chooseColumns",
      "iconClass": "dx-icon fa fa-columns",
      "customItemClass": ""
    },
    {
      "action": "customModuleAction",
      "iconClass": null,
      "customItemClass": ""
    },
    {
      "action": "manageViews",
      "iconClass": "dx-icon dx-icon-detailslayout",
      "customItemClass": ""
    },
    {
      "action": "syntheticGenerate",
      "iconClass": "dx-icon fa fa-magic",
      "customItemClass": ""
    },
    {
      "action": "import",
      "iconClass": "dx-icon fa fa-upload",
      "customItemClass": ""
    },
    {
      "action": "export",
      "iconClass": "dx-icon fa fa-download",
      "customItemClass": " table-top-custom-class-export"
    },
    {
      "action": "create",
      "iconClass": null,
      "customItemClass": null
    },
    {
      "action": "group",
      "iconClass": null,
      "customItemClass": null
    },
    {
      "action": "quickFilter",
      "iconClass": "dx-icon fa fa-filter",
      "customItemClass": " table-top-custom-class-qfilter"
    },
    {
      "action": "print",
      "iconClass": "dx-icon fa fa-print",
      "customItemClass": ""
    },
    {
      "action": "customLink",
      "iconClass": "dx-icon fa fa-fw fa-bolt",
      "customItemClass": ""
    },
    {
      "action": "search",
      "iconClass": null,
      "customItemClass": null
    }
  ];

  test(
    'should click to custom Link action',
    async () => {
      const linkAction = await this.page.$('.dx-data-row:first-child [data-action-name="link"]');
      expect(linkAction).toBeTruthy();
    });

  test(
    'should click to custom Action action',
    async () => {
      const linkAction = await this.page.$('.dx-data-row:first-child [data-action-name="action"]');
      expect(linkAction).toBeTruthy();
    });

  test(
    'should have toolbar actions to be as in snapshot, should have row actions to be as in snapshot',
    async () => {
      let actionsSnapshot = await this.page.$$eval('.dx-toolbar-items-container .dx-toolbar-item',
        elems => elems.map(el=>{
          var icon = el.querySelector('i');
          var itemContent = el.querySelector('.dx-menu-item-content');
          return {
            action: el.className.replace(/^.*?adp-toolbar-action-(\w+).*?$/, '$1'),
            iconClass: icon && icon.className,
            customItemClass:itemContent
              && itemContent.className.replace('dx-item-content dx-menu-item-content', ''),
          }}))
      expect(actionsSnapshot).toEqual(toolbarActionsSnapshot);

      actionsSnapshot = await this.page.$$eval('.dx-data-row:first-child .actions-column-container > *',
        elems => elems.map(el=>{
          return {
            tag: el.tagName,
            type: el.dataset.action,
            action: el.dataset.action,
            iconClass: el.children[0].className
          }}))

      expect(actionsSnapshot).toEqual(rowActionsSnapshot);
    }
  )

  const toolbarHelperActionSelector = '.adp-toolbar-action-customHelperAction .dx-menu-item-content'
  const toolbarModuleActionSelector = '.adp-toolbar-action-customModuleAction .dx-menu-item-content'
  const successMessageSelector = '#toast-container-success .toast-message';

  test(
    "should call echo & module actions from toolbar",
    async () => {
      const alertPromise = new Promise(resolve =>
        this.page.on("dialog", async dialog => {
          resolve(dialog.message());
          await dialog.dismiss();
        })
      );

      await this.page.waitFor(toolbarHelperActionSelector);
      await this.page.click(toolbarHelperActionSelector);
      const helperMessage = await alertPromise;

      expect(helperMessage)
        .toEqual("schema,customGridOptions,gridOptions,actionOptions");

      await this.page.waitFor(toolbarModuleActionSelector);
      await this.page.click(toolbarModuleActionSelector);

      await this.page.waitFor(successMessageSelector);
      const resultMessage = await this.page.$eval(successMessageSelector, elem => elem.innerText);

      expect(resultMessage)
        .toEqual("Call in context of [schema, customGridOptions, gridOptions, actionOptions]");
    }
  )

  const rowHelperActionSelector = '.dx-data-row:first-child .actions-column-container [data-action="showRowContents"]'
  const rowModuleActionSelector = '.dx-data-row:first-child .actions-column-container [data-action="AdpEchoTest.forRow"]'

  test(
    "should call echo & module actions from row",
    async () => {
      const alertPromise = new Promise(resolve =>
        this.page.on("dialog", async dialog => {
          resolve(dialog.message());
          await dialog.dismiss();
        })
      );

      await this.page.waitFor(rowHelperActionSelector);
      await this.page.click(rowHelperActionSelector);
      const helperMessage = await alertPromise;

      expect(helperMessage.substr(0,10))
        .toEqual('{"field1":');

      await this.page.waitFor(rowModuleActionSelector);
      await this.page.click(rowModuleActionSelector);

      await this.page.waitFor(successMessageSelector);
      const resultMessage = await this.page.$eval(successMessageSelector, elem => elem.innerText);

      expect(resultMessage)
        .toBeTruthy();
    }
  )
});
