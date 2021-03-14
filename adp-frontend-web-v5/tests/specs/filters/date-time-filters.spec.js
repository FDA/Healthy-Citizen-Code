const puppeteer = require("puppeteer");
const _ = require("lodash");
const dayjs = require('dayjs');
const isSameOrAfterPlugin = require('dayjs/plugin/isSameOrAfter');
const isSameOrBeforePlugin = require('dayjs/plugin/isSameOrBefore');

dayjs.extend(isSameOrAfterPlugin);
dayjs.extend(isSameOrBeforePlugin);

const {
  getLaunchOptions,
  loginWithUser,
  getUrlFor,
  getToken,
  gql: {
    gqlEmptyRecord, gqlCreateRecord
  }
} = require("../../utils");

const PAGE_TO_TEST = "basicTypesDates";
const SAMPLES_COUNT = 5;
const QUICK_TIMEOUT = {timeout: 5000};
const DATETIME_FORMAT = "MM/DD/YYYY hh:mm a";
const DEBUG_MODE = 0; // Unlock this to trace which exact values are typed and filtered

const DATA_FIELDS = [
  {name: "date", interval: [123, "days"], format: "MM/DD/YYYY"},
//  {name: "time", interval: [456, "minutes"], format: "hh:mm a"},
  {name: "datetime", interval: [33 * 24 * 60 + 7 * 60 + 47, "minutes"], format: DATETIME_FORMAT}
];

const OPERATIONS_TO_TEST = [
  {
    test: (a, b) => !a.isSame(b),
    name: "not equal to",
    selector: "not-equals"
  },
  {
    test: (a, b) => a.isBefore(b),
    name: "less than",
    selector: "less"
  },
  {
    test: (a, b) => a.isAfter(b),
    name: "greater than",
    selector: "greater"
  },
  {
    test: (a, b) => a.isSameOrBefore(b),
    name: "less or equal",
    selector: "less-equal"
  },
  {
    test: (a, b) => a.isSameOrAfter(b),
    name: "greater or equal",
    selector: "greater-equal"
  },
  {
    test: (a, b) => a.isSame(b),
    name: "equal to",
    selector: "equals"
  },
];

async function fillCollection(token, data) {
  const saved = {};

  await Promise.all(
    data.map(async preset => {
      const {_id} = await gqlCreateRecord(token, PAGE_TO_TEST, preset);
      preset._id = _id;
      saved[_id] = preset;
    }));

  return saved;
}

async function emptyCollection(token, ids) {
  const promises = ids.map(id => gqlEmptyRecord(token, PAGE_TO_TEST, id));

  return Promise.all(promises);
}

function generateTimeData(baseTime) {
  const presets = [];

  for (let i = 0; i < SAMPLES_COUNT; i++) {
    const sample = {};
    _.each(DATA_FIELDS, field => {
      const time = baseTime.clone()
        .add(field.interval[0] * i, field.interval[1]);
      sample[field.name] = dayjs(time.format(field.format), field.format);
    });
    presets.push(sample)
  }
  return presets;
}

async function waitForDateToLoad(page) {
  await page.waitForTimeout(2000);
}

async function selectFilterOperation(page, field_name, operation_selector) {
  const operation_menu_selector = "tr.dx-datagrid-filter-row td.name-" + field_name + " .dx-menu-item-has-submenu";
  const operation_icon_selector = ".dx-overlay-wrapper .dx-context-menu.dx-filter-menu .dx-icon-filter-operation-" + operation_selector;

  await page.waitForSelector(operation_menu_selector, QUICK_TIMEOUT);
  await page.click(operation_menu_selector);

  await page.waitForSelector(operation_icon_selector);
  await page.click(operation_icon_selector);
}

async function typeIntoFilter(page, selector, value) {
  await page.waitForSelector(selector, QUICK_TIMEOUT);
  await page.type(selector, value);

  DEBUG_MODE && console.log("Typing [" + value + "] into " + selector)
}

async function simpleInputPreparer(page, operation, field, filter_moment) {
  const search_field_selector = "tr.dx-datagrid-filter-row td.name-" + field.name + " .dx-texteditor-container input";
  const filter_moment_formatted = filter_moment.format(field.format);

  await selectFilterOperation(page, field.name, operation.selector);
  await typeIntoFilter(page, search_field_selector, filter_moment_formatted);
}

function toPrint(preset) {
  let res = "";
  _.each(DATA_FIELDS, field => {
    res += field.name + ": " + preset[field.name].format(field.format) + "; ";
  });
  return res;
}

describe("filtering by date/time columns", () => {
  expect.extend({
    async toBeRow(preset, page) {
      const row_selector = ".actions-column-container[adp-" + preset._id + "]";
      const row = await page.$(row_selector, QUICK_TIMEOUT);

      if (row) {
        return {
          message: () => "Unexpected " + toPrint(preset) + " is present",
          pass: true,
        };
      } else {
        return {
          message: () => "Expected " + toPrint(preset) + " is absent",
          pass: false,
        };
      }
    },
  });

  beforeAll(async () => {
    this.browser = await puppeteer.launch(getLaunchOptions());
    this.context = await this.browser.createIncognitoBrowserContext();
    const page = await this.context.newPage();
    const base_time = dayjs("01/01/2021 00:15 am", DATETIME_FORMAT);
    // .add(Math.random() * 100, "d")
    // .add(Math.random() * 500, "m");

    await loginWithUser(page);

    this.token = await getToken(page);

    this.presets = await fillCollection(this.token, generateTimeData(base_time));
    await page.close();
  });

  afterAll(async () => {
    !DEBUG_MODE && await emptyCollection(this.token, _.keys(this.presets));
    await this.browser.close();
  });

  beforeEach(async () => {
    this.page = await this.context.newPage();
    await this.page.goto(getUrlFor(PAGE_TO_TEST), {waitUntil: "load"});
  });

  afterEach(async () => {
    await this.page.close();
  });

  const testCoveredColumns = _.map( DATA_FIELDS, field => field.name ).join(' & ');

  for (const operation of OPERATIONS_TO_TEST) {
    test(
      `should filter '${testCoveredColumns}' columns with '${operation.name}' operation`,
      async () => {
        const ids = _.keys(this.presets);
        const model_id = ids[Math.floor(ids.length / 2)];

        DEBUG_MODE && console.log(operation.name);

        for (const field of DATA_FIELDS) {
          const filter_moment = this.presets[model_id][field.name];

          await simpleInputPreparer(this.page, operation, field, filter_moment);
        }

        await waitForDateToLoad(this.page);

        for (const preset of _.values(this.presets)) {
          const isExpected = !_.find(DATA_FIELDS,
            field => !operation.test(preset[field.name], this.presets[model_id][field.name], field.format));

          if (DEBUG_MODE) {
            const row_selector = "button.table-action[adp-" + preset._id + "]";
            const row = await this.page.$(row_selector);

            console.log(toPrint(preset), isExpected ? " is Expected" : "is NOT expected", " & ", !!row ? "FOUND" : "absent");
          }

          if (isExpected) {
            await expect(preset)
              .toBeRow(this.page);
          } else {
            await expect(preset)
              .not
              .toBeRow(this.page);
          }
        }
      }
    )
  }

  /*
  test(
    "should filter date/time columns within range",
    async () => {
      const ids = _.map(
        _.values(this.presets)
          .sort((a, b) => a[DATA_FIELDS[0].name].unix() > b[DATA_FIELDS[0].name].unix() ? 1 : 0), p => p._id);
      const id1 = ids[Math.floor(ids.length / 3)];
      const id2 = ids[Math.min(Math.floor(ids.length * 2 / 3), ids.length - 1)];

      for (const field of DATA_FIELDS) {
        const filter_moment1 = this.presets[id1][field.name];
        const filter_moment2 = this.presets[id2][field.name];

        const search_start_selector = ".dx-datagrid-filter-range-start input.dx-texteditor-input";
        const search_end_selector =   ".dx-datagrid-filter-range-end   input.dx-texteditor-input";

        await selectFilterOperation(this.page, field.name, "between");
        await this.page.waitForTimeout(1000);
        await typeIntoFilter(this.page, search_start_selector, filter_moment1.format(field.format));
        await this.page.waitForTimeout(1000);
        await typeIntoFilter(this.page, search_end_selector, filter_moment2.format(field.format));
        await this.page.waitForTimeout(1000);
      }

      await waitForDateToLoad(this.page);

      for (const preset of _.values(this.presets)) {
        const isExpected = !_.find(DATA_FIELDS,
          field =>
            !preset[field.name].isSameOrAfter(this.presets[id1][field.name]) ||
            !preset[field.name].isSameOrBefore(this.presets[id2][field.name]));

        if (DEBUG_MODE) {
          const row_selector = "button.table-action[adp-" + preset._id + "]";
          const row = await this.page.$(row_selector);

          console.log(toPrint(preset), isExpected ? " is Expected" : "is NOT expected", " & ", !!row ? "FOUND" : "absent");
        }

        if (isExpected) {
          await expect(preset)
            .toBeRow(this.page);
        } else {
          await expect(preset)
            .not
            .toBeRow(this.page);
        }
      }
    });

   */
});
