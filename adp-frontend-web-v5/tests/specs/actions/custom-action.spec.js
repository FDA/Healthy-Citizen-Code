const puppeteer = require('puppeteer');
const _ = require('lodash');

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  form: {
    clickCreateNewButton,
    clickTableAction,
    evaluateTableAction,
  },
  submit: {
    clickSubmit,
  }
} = require('../../utils');

const PAGE_TO_TEST = 'customActions';
const waitForGridLoaded = async (page) => page.waitForTimeout(2000);
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
      "action": "delete",
      "iconClass": "adp-icon fa fa-fw fa-trash"
    },
    {
      "action": "update",
      "iconClass": "adp-icon fa fa-fw fa-pencil"
    },
    {
      "action": "action1",
      "iconClass": "adp-icon fa fa-fw fa-bolt"
    },
    {
      "action": "action",
      "iconClass": "adp-icon fa fa-fw fa-bolt"
    },
    {
      "action": "link",
      "iconClass": "adp-icon fa fa-fw fa-link"
    },
    {
      "action": "clone",
      "iconClass": "adp-icon fa fa-fw fa-clone"
    },
    {
      "action": "viewDetails",
      "iconClass": "adp-icon fa fa-fw fa-eye"
    }
  ];

  const toolbarActionsSnapshot = [
    {
      "action": "customHelperAction",
      "iconClass": "adp-icon fa fa-fw fa-bolt dx-icon",
      "customItemClass": ""
    },
    {
      "action": "chooseColumns",
      "iconClass": "adp-icon fa fa-fw fa-columns dx-icon",
      "customItemClass": ""
    },
    {
      "action": "customModuleAction",
      "iconClass": null,
      "customItemClass": ""
    },
    {
      "action": "manageViews",
      "iconClass": "adp-icon dx-icon-detailslayout dx-icon",
      "customItemClass": ""
    },
    {
      "action": "syntheticGenerate",
      "iconClass": "adp-icon fa fa-fw fa-magic dx-icon",
      "customItemClass": ""
    },
    {
      "action": "import",
      "iconClass": "adp-icon fa fa-fw fa-upload dx-icon",
      "customItemClass": ""
    },
    {
      "action": "export",
      "iconClass": "adp-icon fa fa-fw fa-download dx-icon",
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
      "iconClass": "adp-icon fa fa-fw fa-filter dx-icon",
      "customItemClass": " table-top-custom-class-qfilter"
    },
    {
      "action": "print",
      "iconClass": "adp-icon fa fa-fw fa-print dx-icon",
      "customItemClass": ""
    },
    {
      "action": "customLink",
      "iconClass": "adp-icon fa fa-fw fa-bolt dx-icon",
      "customItemClass": ""
    },
    {
      "action": "search",
      "iconClass": null,
      "customItemClass": null
    },
    {
      "action": "filterBuilder",
      "customItemClass": "",
      "iconClass": "adp-icon fa fa-fw fa-search-plus dx-icon"
    }
  ];

  test(
    'should click to custom Link action',
    async () => {
      await evaluateTableAction(null, 'link', this.page);
    });

  test(
    'should click to custom Action action',
    async () => {
      await evaluateTableAction(null, 'action', this.page);
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
            customItemClass: itemContent
              && itemContent.className.replace('dx-item-content dx-menu-item-content', ''),
          }}))
      expect(actionsSnapshot).toEqual(toolbarActionsSnapshot);

      const confirmedActionsSetSelectors = await evaluateTableAction(null, null, this.page);

      actionsSnapshot = await this.page.$$eval(confirmedActionsSetSelectors,
        elems => elems.map(el=>{
          return {
            action: el.dataset.actionName,
            iconClass: el.querySelector('.adp-icon').className,
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

      await this.page.waitForSelector(toolbarHelperActionSelector);
      await this.page.click(toolbarHelperActionSelector);
      const helperMessage = await alertPromise;

      expect(helperMessage)
        .toEqual("data,row,fieldSchema,modelSchema,appSchema,action,parentData,path,schemaPath,index,indexes,config,customGridOptions,gridOptions,actionOptions");

      await this.page.waitForSelector(toolbarModuleActionSelector);
      await this.page.click(toolbarModuleActionSelector);

      await this.page.waitForSelector(successMessageSelector);
      const resultMessage = await this.page.$eval(successMessageSelector, elem => elem.innerText);

      expect(resultMessage)
        .toEqual("Call in context of [data, row, fieldSchema, modelSchema, appSchema, action, parentData, path, schemaPath, index, indexes, config, customGridOptions, gridOptions, actionOptions]");
    }
  )

  test(
    "should call echo & module actions from row",
    async () => {
      const alertPromise = new Promise(resolve =>
        this.page.on("dialog", async dialog => {
          resolve(dialog.message());
          await dialog.dismiss();
        })
      );

      await clickTableAction(null, 'action', this.page);
      const helperMessage = await alertPromise;

      expect(helperMessage.substr(0,10))
        .toEqual('{"field1":');

      await clickTableAction(null, 'action1', this.page);

      await this.page.waitForSelector(successMessageSelector);
      const resultMessage = await this.page.$eval(successMessageSelector, elem => elem.innerText);

      expect(resultMessage)
        .toBeTruthy();
    }
  )
});
