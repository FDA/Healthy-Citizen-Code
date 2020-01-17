const { ValidationError } = require('../../../lib/errors');
const { createFilter } = require('./util');

const oneDayInMillis = 86400000; // 1000 * 60 * 60 * 24

function getShiftDate(d, days) {
  const shiftInMillis = days * oneDayInMillis;
  return new Date(d.getTime() + shiftInMillis);
}

function date() {
  const { fieldPath, value } = this.data;
  const midnight = new Date(value); // frontend must send user timezone midnight date
  if (Number.isNaN(midnight.getTime())) {
    throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
  }

  const nextDay = getShiftDate(midnight, 1);

  return createFilter(this, {
    any: () => {},
    undefined: () => ({ [fieldPath]: { $exists: false } }),
    '=': () => ({ [fieldPath]: { $lt: nextDay, $gte: midnight } }),
    '<>': () => ({
      $or: [{ [fieldPath]: { $lt: midnight } }, { [fieldPath]: { $gte: nextDay } }],
    }),
    '<': () => ({ [fieldPath]: { $lt: midnight } }),
    '<=': () => ({
      [fieldPath]: {
        $lt: nextDay, // since [midnight-nextDay) is still today.
      },
    }),
    '>': () => ({ [fieldPath]: { $gte: nextDay } }),
    '>=': () => ({ [fieldPath]: { $gte: midnight } }),
  });
}

module.exports = date;
