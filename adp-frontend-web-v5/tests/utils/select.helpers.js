module.exports = {
  selectLookupValue,
  selectLookupTable,
  clickLookupAction,
  getMultipleLookupValue,
  getSingleLookupValue,
  getImperialUnitMultipleValue,
  selectImperialUnitMultipleValue,

  selectDxListValue,
  getDxSingleListValue,
  getDxMultipleListValue,
  clearDxListValue,
  removeDxMultiSelectValue,
};

async function selectLookupValue(value, lookupName, page, parentSelector) {
  let lookupSelector = `.lookup-name-${lookupName} .adp-lookup-selector`;
  if (parentSelector) {
    lookupSelector = `${parentSelector} ${lookupSelector}`;
  }
  await page.click(lookupSelector);

  const inputSelector = `${lookupSelector} .dx-texteditor-input`;
  await page.$eval(inputSelector, el => el.value = '');
  await page.type(inputSelector, value);
  await page.waitFor(1000);

  await clickDxOptionByText(value, lookupSelector, page);
}

async function selectLookupTable(tableName, lookupName, page) {
  let selector = `.lookup-name-${lookupName} [table-selector="true"]`;
  await page.click(selector);

  await clickDxOptionByText(tableName, selector, page);
}

async function getSingleLookupValue(lookupName, page) {
  const lookupSelector = `.lookup-name-${lookupName} .adp-lookup-selector .adp-text-box-label`;
  return page.$eval(lookupSelector, el => el.innerText);
}

async function getMultipleLookupValue(lookupName, page) {
  const lookupTagSelector = `.lookup-name-${lookupName} .adp-lookup-selector .dx-tag span`;

  return page.$$eval(
    lookupTagSelector,
    els => els.map(el => el.innerText)
  );
}

async function clickLookupAction(lookupName, actionName, page) {
  const actionStrategies = {
    async create() {
      const actionSelector = `.lookup-name-${lookupName} [lookup-action="${actionName}"]`;
      await page.click(actionSelector);
    },

    async edit() {
      await page.click(`.lookup-name-${lookupName} .adp-lookup-selector`);
      await page.waitForSelector('[lookup-action="update"]');
      await page.click('[lookup-action="update"]');
    }
  };
  const clickFn = actionStrategies[actionName];

  await clickFn(lookupName);
}

async function selectImperialUnitMultipleValue(values, fieldName, page, idPrefix) {
  await selectDxListValue(values[0], `${fieldName}_${0}`, page, idPrefix);
  await selectDxListValue(values[1], `${fieldName}_${1}`, page, idPrefix);
}

async function getImperialUnitMultipleValue(fieldName, page) {
  const first = await getDxSingleListValue(`${fieldName}_${0}`, page);
  const second = await getDxSingleListValue(`${fieldName}_${1}`, page);

  return [first, second];
}

async function selectDxListValue(value, fieldName, page, idPrefix = 'list_id') {
  const listSelector = `#${idPrefix}_${fieldName}`;
  await page.click(listSelector);

  await clickDxOptionByText(value, listSelector, page);
}

async function getDxSingleListValue(fieldName, page, idPrefix = 'list_id') {
  const listSelector = `#${idPrefix}_${fieldName}`;

  return await page.$eval(
    `${listSelector} .dx-texteditor-input`,
    el => el.value
  )
}

async function getDxMultipleListValue(fieldName, page) {
  const listTagSelector = `#list_id_${fieldName} .dx-tag-content span`;

  return page.$$eval(
    listTagSelector,
    els => els.map(el => el.innerText)
  );
}

async function clearDxListValue(fieldName, page) {
  const listSelector = `#list_id_${fieldName}`;
  await page.click(`${listSelector} .dx-icon-clear`);
}


async function removeDxMultiSelectValue(fieldName, value, page) {
  const listTagSelector = `#list_id_${fieldName} .dx-tag span`;
  const values = await page.$$eval(
    listTagSelector,
    el => el.map(a => a.innerText)
  );

  let indexToClick = values.indexOf(value) + 1;
  await page.click(`#list_id_${fieldName} .dx-tag:nth-child(${indexToClick}) .dx-tag-remove-button`);
}

async function clickDxOptionByText(value, listSelector, page) {
  const selectorId = await page.$eval(listSelector, el => {
    return el.getAttribute('aria-owns');
  });
  const optionsSelector = `#${selectorId} .dx-item.dx-list-item .dx-item-content`;

  const texts = await page.$$eval(
    optionsSelector,
    els => els.map(el => el.innerText)
  );

  const indexToClick = texts.findIndex(t => t.indexOf(value) > -1);
  const selectorToClick = `#${selectorId} .dx-item.dx-list-item:nth-child(${indexToClick + 1}) .dx-item-content`;
  await page.click(selectorToClick);
}
