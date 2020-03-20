const { default: sift } = require('sift');

function filterWithSift(filterable, condition) {
  if (Array.isArray(filterable)) {
    if (condition === true) {
      return filterable;
    }
    if (condition === false) {
      return [];
    }
    return filterable.filter(sift(condition));
  }

  if (condition === true) {
    return filterable;
  }
  if (condition === false) {
    return null;
  }
  return sift(condition)(filterable);
}

function getSiftFilteringFunc(condition) {
  if (condition === true || condition === false) {
    return () => condition;
  }
  return sift(condition);
}

module.exports = {
  filterWithSift,
  getSiftFilteringFunc,
};
