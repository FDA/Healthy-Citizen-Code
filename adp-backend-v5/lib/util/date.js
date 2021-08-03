const _ = require('lodash');
const dayjs = require('dayjs');

function getISODate(value) {
  if (_.isString(value)) {
    return new Date(Date.parse(value)).toISOString();
  }
  if (_.isDate(value)) {
    return value.toISOString();
  }
  throw new Error('Invalid value for ISO Date');
}

function getUTCDate({ year = 1970, month = 1, day = 1, hour = 0, minute = 0, second = 0, millisecond = 0 }) {
  // Years between 0 and 99 are converted to a year in the 20th century (1900 + year)
  // Weird thing:
  // new Date(1919, 6, 1, 1).toISOString() === "1919-06-30T20:28:41.000Z"
  // new Date(1919, 6, 2, 1).toISOString() === "1919-07-01T21:00:00.000Z"
  return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second, +millisecond));
}

function getTime(value) {
  if (!value) {
    return value;
  }
  const time = getISODate(value).split('T')[1];
  const [hour, minute] = time.split(':');
  return getUTCDate({ hour, minute });
}

/**
 * Returns human-readable date in US format mm/dd/yyyy
 * @param date
 * @returns {string}
 */
function getDatePartString(date) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * removes time part from datetime and returns only date part for clean date comparison
 * @param date
 */
function getDatePartValue(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateFromAmPmTime(time) {
  const preparedTime = time.trim().toLowerCase();
  const hoursMinutes = preparedTime
    .substr(0, preparedTime.length - 2)
    .split(':')
    .map(Number);
  let hours = hoursMinutes[0];
  const minutes = hoursMinutes[1];
  if (preparedTime.endsWith('pm') && hours !== 12) {
    hours += 12;
  }
  const datePart = new Date(1970, 0, 1);
  const timePart = 1000 * 60 * (hours * 60 + minutes);
  return new Date(+datePart + +timePart);
}

function getAmPmTimeFromDate(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours %= 12;
  hours = hours || 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

function isValidTimeZone(timezone) {
  try {
    dayjs().tz(timezone);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getUTCDate,
  getTime,
  getDatePartString,
  getDatePartValue,
  getDateFromAmPmTime,
  getAmPmTimeFromDate,
  isValidTimeZone,
};
