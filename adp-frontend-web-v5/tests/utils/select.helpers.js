module.exports = {
  selectLookupValue,
  clickLookupAction,
  getMultipleLookupValue,
  getSingleLookupValue,
  selectOptionByValueForName,
  getSingleSelectValueByName,
  getImperialUnitMultipleValue,
  selectImperialUnitMultipleValue,

  selectDxListValue,
  getDxSingleListValue,
  selectDxListValueWithParent,
  getDxMultipleListValue,
  clearDxListValue,
  removeDxMultiSelectValue,
};

async function selectLookupValue(value, lookupName, page) {
  const lookupSelector = `.lookup-name-${lookupName} .adp-lookup-selector`;
  await page.click(lookupSelector);

  const inputSelector = `${lookupSelector} .dx-texteditor-input`;
  await page.$eval(inputSelector, el => el.value = '');
  await page.type(inputSelector, value);
  await page.waitFor(1000);

  await clickDxOptionByText(value, lookupSelector, page);
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

async function clickLookupAction(lookupName, actionName, parentSelector, page) {
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
  await page.waitForSelector(parentSelector);
}

async function selectOptionByValueForName(value, fieldName, page) {
  const selector = getSelectSelector(fieldName);
  await page.click(selector);
  await clickOptionByText(value, page);
}

function getSelectSelector(fieldName) {
  return `#s2id_${fieldName}`;
}

async function clickOptionByText(value, page) {
  const texts = await page.$$eval(
    '.select2-drop .select2-result-label',
    el => el.map(a => a.innerText)
  );

  let indexToClick = texts.indexOf(value) + 1;
  await page.click(`.select2-drop .select2-result:nth-child(${indexToClick})`);
}

async function getSingleSelectValueByName(fieldName, page) {
  const selector = getSelectSelector(fieldName);
  return page.$eval(`${selector} .select2-chosen`, el => el.innerText);
}

async function selectImperialUnitMultipleValue(values, fieldName, page) {
  await selectOptionByValueForName(values[0], `${fieldName}_${0}`, page);
  await selectOptionByValueForName(values[1], `${fieldName}_${1}`, page);
}

async function getImperialUnitMultipleValue(fieldName, page) {
  const first = await getSingleSelectValueByName(`${fieldName}_${0}`, page);
  const second = await getSingleSelectValueByName(`${fieldName}_${1}`, page);

  return [first, second];
}

async function selectDxListValue(value, fieldName, page) {
  const listSelector = `#list_id_${fieldName}`;
  await page.click(listSelector);

  await clickDxOptionByText(value, listSelector, page);
}

async function selectDxListValueWithParent(value, fieldName, parentSelector, page) {
  const listSelector = `${parentSelector} #list_id_${fieldName}`;
  await page.click(listSelector);

  await clickDxOptionByText(value, listSelector, page);
}

async function getDxSingleListValue(fieldName, page) {
  const listSelector = `#list_id_${fieldName}`;

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

  let indexToClick = texts.indexOf(value) + 1;
  await page.click(`#${selectorId} .dx-item.dx-list-item:nth-child(${indexToClick}) .dx-item-content`);
}
