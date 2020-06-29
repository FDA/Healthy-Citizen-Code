const {
  selectDxListValue,
  selectLookupValue,
  selectImperialUnitMultipleValue,
}  = require('../../utils/select.helpers');
const _ = require('lodash');

function getGridCellSelector(fieldName) {
  return `tr.dx-data-row:first-child .name-${fieldName}`;
}

function getGridEditorSelector(fieldName) {
  return `${getGridCellSelector(fieldName)} .dx-texteditor-input`;
}

async function fillStringEditors(recordData, page) {
  for await (const [fieldName, value] of Object.entries(recordData)) {
    const gridEditorSelector = getGridEditorSelector(fieldName);

    await page.type(gridEditorSelector, value);
    await activateNextEditor(page);
  }
}

async function fillListEditor(val, fieldName, page) {
  await selectDxListValue(val, fieldName, page, 'cell_list_id')
}

async function fillListEditors(data, page) {
  for await (const [fieldName, values] of Object.entries(data)) {
    for await (const value of values.split(', ')) {
      await fillListEditor(value, fieldName, page);
    }

    await activateNextEditor(page);
  }
}

async function fillArrayEditors(data, page) {
  for await (const [fieldName, values] of Object.entries(data)) {
    const editorSelector = getGridEditorSelector(fieldName);

    for await (const value of values.split(', ')) {
      await page.type(editorSelector, value);
      await page.keyboard.press('Enter');
    }

    await activateNextEditor(page);
  }
}

async function fillLookupEditors(data, page) {
  for await (const [fieldName, values] of Object.entries(data)) {
    for await (const value of values.split(', ')) {
      await page.waitFor(200);
      await selectLookupValue(value, fieldName, page, '.dx-data-row');
    }

    await activateNextEditor(page);
  }
}

async function fillImperialUnitsEditors(data, page) {
  const selectorPrefix = 'cell_list_id';

  for await (const [fieldName, values] of Object.entries(data)) {
    const val = values.split(' ');
    if (val.length === 2) {
      await selectImperialUnitMultipleValue(val, fieldName, page, selectorPrefix)
    } else {
      await selectDxListValue(val[0], fieldName, page, selectorPrefix);
    }

    await activateNextEditor(page);
  }
}

async function waitForGridLoaded(page) {
  await page.waitFor(2000);
}

async function clickOutsideOfGridToTriggerSubmit(page) {
  await page.click('h1');
}

async function activateNextEditor(page) {
  await page.keyboard.press('Tab');
}

/**
 * Pseudo-random string generator
 * https://stackoverflow.com/a/27872144/4575370
 * Default: return a random alpha-numeric string
 *
 * @param {Integer} len Desired length
 * @param {String} an Optional (alphanumeric), "a" (alpha), "n" (numeric)
 * @return {String}
 */
function randomString(len = 10, an= 'a') {
  let min = an === 'a' ? 10 : 0;
  let max = an === 'n' ? 10 : 62;

  return _.range(len).map(() => {
    let r = Math.random() * (max - min) + min << 0;
    return String.fromCharCode(r += r > 9 ? r < 36 ? 55 : 61 : 48);
  }).join('');
}

// returns [min, max) range
function getRandomInt(min, max) {
  let minInt = Math.ceil(min);
  let maxInt = Math.floor(max);

  const number = Math.floor(Math.random() * (maxInt - minInt)) + minInt;
  return number.toString();
}

const randomInt32 = getRandomInt.bind(null, -0x80000000, 0x7fffffff);
const randomInt32Positive = getRandomInt.bind(null, 0, 0x7fffffff);
const randomInt64 = getRandomInt.bind(null, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
const randomInt64Positive = getRandomInt.bind(null, 0, Number.MAX_SAFE_INTEGER);

function randomDate() {
  const month = getRandomInt(10, 13);
  const day = getRandomInt(10, 32);
  const year = getRandomInt(1980, 2025);

  return [month, day, year].join('/');
}

function randomTime() {
  const zeroOrOne = Math.round(Math.random());
  const dayPart = ['am', 'pm'][zeroOrOne];
  return `${getRandomInt(10, 13)}:${getRandomInt(10, 61)} ${dayPart}`;
}

function randomDateTime() {
  return `${randomDate()} ${randomTime()}`;
}

module.exports = {
  fillStringEditors,
  fillListEditor,
  fillArrayEditors,
  fillListEditors,
  fillLookupEditors,
  fillImperialUnitsEditors,
  clickOutsideOfGridToTriggerSubmit,
  waitForGridLoaded,
  dataGenerators: {
    randomString,
    randomInt32,
    randomInt32Positive,
    randomInt64,
    randomInt64Positive,
    randomDate,
    randomTime,
    randomDateTime,
  }
};
