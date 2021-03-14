const _ = require('lodash');
const { ValidationError } = require('../../../lib/errors');
const { createFilter } = require('../../../lib/filter/util');

const oneDayInMillis = 86400000; // 1000 * 60 * 60 * 24

function getShiftDate(d, days) {
  const shiftInMillis = days * oneDayInMillis;
  return new Date(d.getTime() + shiftInMillis);
}

function date() {
  const { fieldPath, value } = this.data;
  if (_.isNil(value)) {
    // for DX group query
    return { [fieldPath]: null };
  }

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
  }

  const nextDay = getShiftDate(dateValue, 1);

  return createFilter(this, {
    any: () => {},
    undefined: () => ({ [fieldPath]: { $exists: false } }),
    '=': () => ({ [fieldPath]: { $lt: nextDay, $gte: dateValue } }),
    '<>': () => ({
      $or: [{ [fieldPath]: { $lt: dateValue } }, { [fieldPath]: { $gte: nextDay } }],
    }),
    '<': () => ({ [fieldPath]: { $lt: dateValue } }),
    '<=': () => ({
      [fieldPath]: {
        $lt: nextDay, // since [midnight-nextDay) is still today.
      },
    }),
    '>': () => ({ [fieldPath]: { $gte: nextDay } }),
    '>=': () => ({ [fieldPath]: { $gte: dateValue } }),
  });
}

module.exports = date;
