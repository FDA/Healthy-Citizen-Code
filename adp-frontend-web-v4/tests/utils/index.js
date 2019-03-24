const config = require('../test_config');
const {apiUrl} = require('../../api_config').CONSTANTS;

const TEST_TIMEOUT = 20000;
const SELECTOR_TIMEOUT = 2000;

function getLaunchOptions() {
  return config.showBrowser
    ? {
        headless: false,
        slowMo: 0,
      }
    : {};
}

function getUrlFor(section) {
  return `${config.hostUrl}/#/${section}`;
}

function getUserCredentials() {
  return config.user;
}

function getBasicAuth() {
  return config.basicAuth || {};
}

async function loginWithUser(page) {
  await page.authenticate(getBasicAuth());
  await page.goto(getUrlFor('login'));
  await page.waitForSelector('#login');

  const { login, password } = getUserCredentials();
  await page.type('#login', login);
  await page.type('#password', password);
  await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation()]);
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
  return `[name='${obj}'] [name='${field}']`;
}

async function clickCreateNewButton(page) {
  const createBtnSelector = '.btn.page-action';
  await page.waitFor(createBtnSelector, { timeout: SELECTOR_TIMEOUT });
  await page.click(createBtnSelector);
  await page.waitFor('form', { timeout: SELECTOR_TIMEOUT });
}

async function clickEditButton(recordId, page) {
  let btnSelector = `[adp-${recordId}][data-action="update"]`;
  await page.waitFor(btnSelector, { timeout: SELECTOR_TIMEOUT });
  // await page.click(btnSelector, {delay: 100});
  await page.evaluate(
    selector => document.querySelector(selector).click(),
    btnSelector
  );

  await page.waitFor('form', { timeout: SELECTOR_TIMEOUT });
}

async function clickSubmit(page) {
  await page.click('button[type=submit]');
}

async function getSubmitMsg(page) {
  const successfulSubmitMsgSelector = `#divSmallBoxes .textoFull span`;
  await page.waitFor(successfulSubmitMsgSelector, { timeout: SELECTOR_TIMEOUT });
  return page.evaluate(
    selector => document.querySelector(selector).innerText,
    successfulSubmitMsgSelector
  );
}

async function addAbortImages(page) {
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.resourceType() === 'image') {
      return request.abort();
    }
    request.continue();
  });
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
  return `[name='${arr}[${index}]'] [name='${field}']`;
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

async function selectOptionByValue(value, selector, page) {
  await page.click(selector);

  const texts = await page.$$eval(
    '.select2-drop .select2-result-label',
      el => el.map(a => a.innerText)
  );

  let indexToClick = texts.indexOf(value) + 1;
  await page.click(`.select2-drop .select2-result:nth-child(${indexToClick})`);
}

async function singleSelectValue(selector, page) {
  return await page.evaluate(
    s => document.querySelector(s).innerText,
    `${selector} .select2-chosen`
  );
}

async function clearSelectValue(selector, page) {
  await page.click(`${selector} .select2-search-choice-close`);
}

async function multiSelectValue(selector, page) {
  return await page.evaluate(
    s => [...document.querySelectorAll(s)].map(el => el.innerText),
    `${selector} .select2-search-choice div`
  );
}

async function removeMultiSelectValue(selector, value, page) {
  const values = await page.$$eval(
    `${selector} .select2-search-choice div`,
    el => el.map(a => a.innerText)
  );

  let indexToClick = values.indexOf(value) + 1;
  await page.click(`${selector} .select2-search-choice:nth-child(${indexToClick}) .select2-search-choice-close`);
}

async function getRecordIdFromCreateResponse(path, page) {
  const response = await page.waitForResponse(`${apiUrl}/${path}`);
  const { id } = await response.json();
  return id;
}

module.exports = {
  getLaunchOptions,
  getUrlFor,
  getUserCredentials,
  getBasicAuth,
  loginWithUser,
  removeSpaceChars,
  getCollapseSelector,
  TEST_TIMEOUT,
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
  form: {
    clickCreateNewButton,
    clickEditButton,
    selectOptionByValue,
    singleSelectValue,
    clearSelectValue,
    multiSelectValue,
    removeMultiSelectValue
  },
  submit: {
    clickSubmit,
    getSubmitMsg,
  },
  interceptor: {
    addAbortImages,
    getRecordIdFromCreateResponse
  },
};
