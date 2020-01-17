/**
 * https://confluence.conceptant.com/display/DEV/Examples+of+Source+Data+Records - example with
 *  "receivedateformat": "102", "receivedate": "20040319"
 *  but it doesn't match sql formats: https://www.mssqltips.com/sqlservertip/1145/date-and-time-conversions-using-sql-server/
 *  Example of doc 102 format: '20181031'
 */
function getDateYYYYMMDD(date) {
  return date ? new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`) : undefined;
}

/** Example: '04/19/2011' */
function getDateMMDDYYYY(date) {
  if (!date) {
    return undefined;
  }
  const [month, day, year] = date.split('/');
  return new Date(`${year}-${month}-${day}`);
}

function getDate(date) {
  const date1 = getDateYYYYMMDD(date);
  if (date1 instanceof Date && date1.toString() !== 'Invalid Date') {
    return date1;
  }
  return getDateMMDDYYYY(date);
}

module.exports = {
  getDate,
};
