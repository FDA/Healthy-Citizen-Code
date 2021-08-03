const Promise = require('bluebird');
const _ = require('lodash');
const xlsx = require('node-xlsx');
const csv = require('fast-csv');
const writeToString = Promise.promisify(csv.writeToString);
const fs = require('fs-extra');
const { NESTING_CHAR, SHEET_TYPES, META_INFO_COLUMN_NAME } = require('../consts');

function findColumnNameIndex(sheet, columnName) {
  const firstRow = _.get(sheet, 'data[0]');
  if (_.isEmpty(firstRow)) {
    return -1;
  }
  for (let columnIndex = 0; columnIndex < firstRow.length; columnIndex++) {
    if (firstRow[columnIndex] === columnName) {
      return columnIndex;
    }
  }
  return -1;
}

/*

function generateRowName(sheetName) {
  const nestedLvl = getNestedLvl(sheetName);
  // For 'Interface.footer' ending is 'footer'
  const lastIndexOfDot = sheetName.lastIndexOf('.');

  const beginning = NESTING_CHAR.repeat(nestedLvl);
  const ending = lastIndexOfDot === -1 ? sheetName : sheetName.substring(lastIndexOfDot + 1);
  const newRowName = `${beginning} ${ending}`;
  return newRowName;
}

function getNestedLvl(sheetName) {
  const numberOfDots = countEntries(sheetName, '.');
  // For 'Interface.footer' nestedLvl is 2: '-- footer'
  return numberOfDots + 1;
}

function countEntries(string, searchString) {
  const escapedSearchString = escapeRegExp(searchString);
  return (string.match(new RegExp(escapedSearchString, 'g')) || []).length;
}

function escapeRegExp(regExpString) {
  return regExpString.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
*/

function createEmptyValuesArray(valuesNumber) {
  return Array(valuesNumber).fill('');
}


function modifyNameColumnsForSchemaSheet(sheet, sheetInfo) {
  const { nameColumnIndex, sheetNameForCsv, sheetType } = sheetInfo;
  if (sheetType !== SHEET_TYPES.SCHEMA) {
    return;
  }

  /** handle case when there is not nesting Name in first row
   * Example, we have following excel:
   *    Name          Type
   *    * testField  MenuItem
   *    clients      Schema
   *    * name
   *    * id
   *
   * For example first row with Name '* testField' in interface.mainMenu
   * should be renamed to 'interface.mainMenu.fields.testField'.
   * Following rows with Name starting with '*' (NESTING_CHAR) and having not nested Name before it should not be renamed
   * */
  const isFirstDataRowNested = _.get(sheet, `data.1.${nameColumnIndex}`, '').charAt(0) === NESTING_CHAR;
  let dataRowsStart = 1;
  if (isFirstDataRowNested) {
    const schemeNameRow = [];
    schemeNameRow[nameColumnIndex] = `${sheetNameForCsv}`;
    sheet.data.splice(1, 0, schemeNameRow);
    dataRowsStart++;
  }

  // skip headers
  for (let rowI = dataRowsStart; rowI < sheet.data.length; rowI++) {
    const row = sheet.data[rowI];
    // define new column name
    const nameColumn = row[nameColumnIndex] || '';
    if (nameColumn.startsWith('#')) {
      // ignore row which 'Name' column starts with '#'
      sheet.data.splice(rowI, 1);
      rowI--;
    }
    let newNameColumn;
    if (sheetInfo.isFieldsSheet) {
      newNameColumn = nameColumn.startsWith(NESTING_CHAR)
        ? NESTING_CHAR + nameColumn
        : `${NESTING_CHAR} ${nameColumn}`;
      row[nameColumnIndex] = newNameColumn;
      continue;
    }
    if (sheetInfo.isReferringRoot) {
      row[nameColumnIndex] = nameColumn;
      continue;
    }
    if (!nameColumn.startsWith(NESTING_CHAR)) {
      newNameColumn = `${sheetNameForCsv}.${nameColumn}`;
      row[nameColumnIndex] = newNameColumn;
    }
  }
}

function addMetaInfo(sheet, sheetInfo, options) {
  // add meta column
  const columnNamesData = sheet.data[0];
  columnNamesData.push(META_INFO_COLUMN_NAME);
  const metaInfoColumnIndex = columnNamesData.length - 1;
  const metaInfo = getMetaInfo(sheet, sheetInfo);

  for (let rowIndex = 1; rowIndex < sheet.data.length; rowIndex++) {
    const row = sheet.data[rowIndex];
    row[metaInfoColumnIndex] = metaInfo;
  }

  function getMetaInfo(_sheet, _sheetInfo) {
    const info = {
      sheetType: _sheetInfo.sheetType,
    };
    if (_sheetInfo.sheetType === SHEET_TYPES.ETL_DATA_SEED) {
      info.collection = _sheet.name.split('.')[1];
    }
    return JSON.stringify(info);
  }
}

function getAllHeaders(parsedXls) {
  let headers = [META_INFO_COLUMN_NAME];
  for (let sheetIndex = 0; sheetIndex < parsedXls.length; sheetIndex++) {
    const sheetName = parsedXls[sheetIndex].name;
    if (sheetName.startsWith('#')) {
      // console.log(`Skipping sheet headers ${sheetName}`);
      continue;
    }
    const sheetHeaders = _.get(parsedXls, `[${sheetIndex}].data[0]`, []);
    headers = _.union(headers, sheetHeaders);
  }
  return headers;
}

function createRowsWithResultHeaders(resultHeaders, sheet) {
  const resultRows = [];
  // skip headers
  const sheetHeaders = sheet.data[0];
  for (let rowIndex = 1; rowIndex < sheet.data.length; rowIndex++) {
    const rowWithResultHeaders = createRowWithResultHeaders(
      resultHeaders,
      sheetHeaders,
      sheet.data[rowIndex]
    );
    resultRows.push(rowWithResultHeaders);
  }
  return resultRows;
}

function createRowWithResultHeaders(resultHeaders, srcHeaders, srcRow) {
  const resultRow = createEmptyValuesArray(resultHeaders.length);
  _.forEach(srcHeaders, (srcHeader, srcIndex) => {
    const resultHeaderIndex = resultHeaders.indexOf(srcHeader);
    if (resultHeaderIndex !== -1) {
      resultRow[resultHeaderIndex] =
        typeof srcRow[srcIndex] === 'undefined' ? '' : srcRow[srcIndex];
    }
  });
  return resultRow;
}

function getSheetInfo(sheet) {
  const sheetInfo = {};
  sheetInfo.sheetType = getSheetType(sheet);

  const sheetName =
    sheetInfo.sheetType === SHEET_TYPES.IGNORED ? sheet.name : sheet.name.split('#')[0];
  sheetInfo.isReferringRoot = sheetName === '.';
  sheetInfo.nameColumnIndex = findColumnNameIndex(sheet, 'Name');

  const indexOfFields = sheetName.toLowerCase().indexOf('.fields');
  sheetInfo.isFieldsSheet = indexOfFields !== -1;
  sheetInfo.sheetNameForCsv = sheetInfo.isFieldsSheet
    ? sheetName.substring(0, indexOfFields)
    : sheetName;

  return sheetInfo;

  function getSheetType(_sheet) {
    const { name } = _sheet;
    const lowerCasedSheetName = name.toLowerCase();
    if (lowerCasedSheetName.startsWith('#')) {
      return SHEET_TYPES.IGNORED;
    }
    if (_.isEmpty(_sheet.data)) {
      return SHEET_TYPES.EMPTY;
    }
    if (lowerCasedSheetName === '!etl') {
      return SHEET_TYPES.ETL_SPEC;
    }
    if (lowerCasedSheetName.startsWith('!data')) {
      return SHEET_TYPES.ETL_DATA_SEED;
    }
    if (lowerCasedSheetName.startsWith('!')) {
      return SHEET_TYPES.ACTION;
    }
    return SHEET_TYPES.SCHEMA;
  }
}

function filterEmptyRows(xlsData) {
  for (const sheet of xlsData) {
    sheet.data = sheet.data.filter(arr => arr.length);
  }
}

async function xlsToCsv(xlsInputPath, csvOutputPath, options) {
  // {raw: false} is necessary for get strings values for Dates
  const xlsData = xlsx.parse(xlsInputPath, {raw: false});
  // TODO: fill empty values
  // looping through all sheets
  filterEmptyRows(xlsData);
  const allHeaders = getAllHeaders(xlsData);
  // write all headers to result csv
  await fs.ensureFile(csvOutputPath);
  await writeToCsv(csvOutputPath, [allHeaders]);

  for (let sheetIndex = 0; sheetIndex < xlsData.length; sheetIndex++) {
    const sheet = xlsData[sheetIndex];
    const sheetName = sheet.name;
    const sheetInfo = getSheetInfo(sheet);

    if (sheetInfo.sheetType === SHEET_TYPES.IGNORED) {
      console.log(`Skipping sheet '${sheetName}'.`);
      continue;
    }
    if (sheetInfo.sheetType === SHEET_TYPES.EMPTY) {
      console.log(`Skipping empty sheet '${sheetName}'.`);
      continue;
    }

    if (sheetInfo.nameColumnIndex === -1 && sheetInfo.sheetType === SHEET_TYPES.SCHEMA) {
      console.log(
        `Error: no 'Name' column found in sheet describing schema '${sheetName}'. It will be skipped.`
      );
      continue;
    }

    modifyNameColumnsForSchemaSheet(sheet, sheetInfo);
    addMetaInfo(sheet, sheetInfo, options);
    const resultRows = createRowsWithResultHeaders(allHeaders, sheet);
    await writeToCsv(csvOutputPath, resultRows);
  }
}

async function writeToCsv(csvOutputPath, data) {
  const csvData = await writeToString(data, { headers: false, quoteColumns: true });
  return fs.appendFile(csvOutputPath, `${csvData}\n`);
}

module.exports = {
  xlsToCsv,
  createRowWithResultHeaders,
  writeToCsv,
};
