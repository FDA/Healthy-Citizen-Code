const config = require('../test_config')();
const appConfig = require('../app_config')();
const fetch = require("node-fetch");

const SELECTOR_TIMEOUT = 15000;

const VIEW_DETAILS_SELECTOR = 'adp-record-details';
const ACTIONS_COLUMN_SELECTOR = '.actions-column';

function getLaunchOptions() {
  if (config.showBrowser) {
    return {
      headless: false,
      defaultViewport: null,
      slowMo: 20,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--window-size=2880,1800'
      ]
    };
  } else {
    return {
      slowMo: 0,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--headless',
        '--disable-gpu',
        '--window-size=2880,1800'
      ]
    }
  }
}

function getUrlFor(section) {
  return `${config.hostUrl}/${section}`;
}

function getUserCredentials() {
  return config.user;
}

function getBasicAuth() {
  return config.basicAuth || {};
}

async function loginWithUser(page) {
  await page.authenticate(getBasicAuth());

  await Promise.all([
    page.goto(getUrlFor('login')),
    page.waitForSelector('#login')
  ]);

  await fillLoginFormAndSubmit(page);
}

async function fillLoginFormAndSubmit(page) {
  const { login, password } = getUserCredentials();
  await page.type('#login', login);
  await page.type('#password', password);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('[type=submit]'),
  ]);
}

async function logout(page) {
  const headerDropdownListSelector = '.header-dropdown-list';
  await page.click(headerDropdownListSelector);
  await page.waitForSelector(`${headerDropdownListSelector} .open`);
  await page.click('[ng-click="vm.logout()"]');
  await page.waitForSelector('.modal-dialog');
  await page.click('[ng-click="vm.confirm()"]');

  await page.waitForSelector('#login');
}

/**
 * Workaround for resolving an issue with innerText containing white spaces (only in puppeteer)
 * More: https://github.com/GoogleChrome/puppeteer/issues/489, https://github.com/GoogleChrome/puppeteer/issues/825
 * @param str
 * @returns {*}
 */
function removeSpaceChars(str) {
  return str.replace(/\s+/g, ' ').trim();
}

function getCollapseSelector(name) {
  return `[name='${name}'] > .subform-frame > .subform-frame__title .subform-frame__collapse`;
}

async function clickObject(name, page) {
  const objectSelector = getCollapseSelector(name);
  await page.waitFor(objectSelector, { timeout: SELECTOR_TIMEOUT });
  await page.click(objectSelector);
}

function getFieldErrorSelector(obj, field) {
  return `[name='${obj}'] [ng-field-name='${field}'] adp-messages span[ng-message]`;
}

function getObjectErrorSelect(obj) {
  return `[name='${obj}'] > .subform-frame > .subform-frame__title > .ng-scope span:not(.ng-hide).ng-binding`;
}

function getFieldSelector(obj, field) {
  return `[name='${obj}'] [field-name-input='${field}']`;
}

async function clickCreateNewButton(page) {
  const createBtnSelector = '.btn.page-action';

  await page.waitFor(createBtnSelector, { timeout: SELECTOR_TIMEOUT });
  await page.waitFor(350);
  await page.click(createBtnSelector);
  await page.waitFor('form', { timeout: SELECTOR_TIMEOUT });
}

async function clickViewDetailsButton(recordId, page) {
  const btnSelector = `[adp-${recordId}][data-action="viewDetails"]`;
  await page.waitFor(btnSelector, { timeout: SELECTOR_TIMEOUT });

  await page.evaluate(
    selector => document.querySelector(selector).click(),
    btnSelector
  );

  await page.waitFor(VIEW_DETAILS_SELECTOR, { timeout: SELECTOR_TIMEOUT });
}

async function clickEditButton(recordId, page) {
  let btnSelector = `[adp-${recordId}][data-action="update"]`;
  await page.waitFor(btnSelector, { timeout: SELECTOR_TIMEOUT });

  await page.evaluate(
    selector => document.querySelector(selector).click(),
    btnSelector
  );

  await page.waitFor('form', { timeout: SELECTOR_TIMEOUT });
}

async function clickSubmit(page, parentSelector = '') {
  await page.click(`${parentSelector} [type=submit][data-actions-name="submit"]`);
}

async function getSubmitMsg(page) {
  const successfulSubmitMsgSelector = `.toast-success .toast-message`;
  await page.waitFor(successfulSubmitMsgSelector, { timeout: SELECTOR_TIMEOUT });

  return getTextForSelector(successfulSubmitMsgSelector, page);
}

async function getTextForSelector(selector, page) {
  return page.$eval(selector, el => el.innerText);
}

async function clickArrayItem(name, index, page) {
  const selector = getCollapseSelector(`${name}[${index}]`);
  await page.waitFor(selector, { timeout: SELECTOR_TIMEOUT });
  await page.click(selector);
}

function getArrayFieldErrorSelector(arr, index, field) {
  return `[name='${arr}[${index}]'] [ng-field-name='${field}'] adp-messages span[ng-message]`;
}

function getArrayFieldSelector(arr, index, field) {
  return `[name='${arr}[${index}]'] [field-name-input='${field}']`;
}

function getRemoveArrayElemSelector(arr, index) {
  return `[name='${arr}[${index}]'] .subform-frame__remove`;
}

/** It doesn't work if there is no first elem of array on the page
 * (if there is no array elems there is no 'array' selector in html to find addArrayItem button)
 * */
async function addArrayItem(arr, page) {
  await page.evaluate(
    arrSelector =>
      document
        .querySelector(`[name='${arrSelector}[0]']`)
        .closest('array-control')
        .querySelector('button[ng-click="addArrayItem()"]')
        .click(),
    arr
  );
}

async function getResponseForCreatedRecord(collectionName, page) {
  const response = await page.waitForResponse(`${appConfig.apiUrl}/graphql`);
  const json = await response.json();

  return json.data[`${collectionName}Create`];
}

async function getRequestForCreatedRecord(page) {
  const response = await page.waitForResponse(`${appConfig.apiUrl}/graphql`);
  const request = JSON.parse(response.request().postData());

  return request.variables.record;
}

async function toggleGroup(groupSelector, type, page) {
  const types = {
    'accordion': '.ui-accordion-header-icon',
    'grouping': '.jarviswidget-toggle-btn'
  };

  let collapseSelector = types[type];
  let toggleBtnSelector = `${groupSelector} ${collapseSelector}`;
  await page.click(toggleBtnSelector);
  await page.waitFor(210);
}

async function isGroupCollapsed(groupSelector, page) {
  let groupBodySelector = `${groupSelector} .adp-form-group-body`;

  // evaluate if hidden
  return await page.evaluate(
    s => document.querySelector(s).offsetParent === null,
    groupBodySelector
  );
}


async function dragGroupDown(groupSelector, page) {
  const dragHandleSelector = `${groupSelector} .ui-sortable-handle`;
  const dragHandle = await page.$(dragHandleSelector);
  const boundingBox = await dragHandle.boundingBox();

  let x = boundingBox.x + boundingBox.width / 2;
  let y = boundingBox.y + boundingBox.height / 2;

  // magic to prevent to fast movements
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitFor(100);
  await page.mouse.move(x + 0, y + 120);
  await page.waitFor(100);
  await page.mouse.move(x + 0, y + 240);
  await page.waitFor(100);
  await page.mouse.move(x + 0, y + 360);
  await page.mouse.up();
  // wait for debounce animation for group
  await page.waitFor(600);
}

async function getFormErrorCountMessage(page) {
  const selector = '.form-error-count';
  return page.$eval(selector, el => el.innerText);
}

async function waitForContentRemovedFromDom(selector, page) {
  await page.waitForFunction(s => document.querySelector(s) === null, {}, selector);
}

async function getToken(page) {
  return await page.evaluate(() => localStorage.getItem("ls.token"));
}

async function fetchPost(token, post) {
  return fetch(appConfig.apiUrl + "/graphql", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "JWT " + token,
    },
    body: JSON.stringify(post)
  })
    .then(res => res.json());
}

async function gqlCreateRecord(token, collectionName, data) {
  const post = {
    query: "mutation m($record: basicTypesDatesInputWithoutId) {" + collectionName + "Create (record: $record) { _id }}",
    variables: {
      record: data
    }
  };
  const json = await fetchPost(token, post);

  return json.data[collectionName + "Create"];
}

async function gqlEmptyRecord(token, collectionName, id) {
  const post = {
    query: "mutation m($filter: MongoIdInput!) {" + collectionName + "DeleteOne (filter: $filter) { deletedCount } }",
    variables: {
      filter: {
        _id: id
      }
    }
  };

  return fetchPost(token, post);
}

module.exports = {
  getLaunchOptions,
  getUrlFor,
  loginWithUser,
  logout,
  fillLoginFormAndSubmit,
  removeSpaceChars,
  waitForContentRemovedFromDom,
  getTextForSelector,
  getToken,
  SELECTOR_TIMEOUT,
  object: {
    clickObject,
    getFieldErrorSelector,
    getObjectErrorSelect,
    getFieldSelector,
  },
  array: {
    clickArrayItem,
    getArrayFieldErrorSelector,
    getArrayFieldSelector,
    addArrayItem,
    getRemoveArrayElemSelector,
  },
  group: {
    toggleGroup,
    isGroupCollapsed,
    dragGroupDown
  },
  form: {
    FORM_SELECTOR: '.smart-form',
    clickCreateNewButton,
    clickEditButton,
    getFormErrorCountMessage,
  },
  submit: {
    clickSubmit,
    getSubmitMsg,
  },
  table: {
    VIEW_DETAILS_SELECTOR,
    ACTIONS_COLUMN_SELECTOR,
    clickViewDetailsButton,
  },
  interceptor: {
    getRequestForCreatedRecord,
    getResponseForCreatedRecord,
  },
  gql:{
    fetchPost, gqlCreateRecord, gqlEmptyRecord
  }
};
