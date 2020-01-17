const _ = require('lodash');

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

module.exports = {
  getUTCDate,
  getTime,
};
