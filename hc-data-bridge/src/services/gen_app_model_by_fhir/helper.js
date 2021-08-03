const _ = require('lodash');

const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);

const getFullNameByName = name => _.startCase(_.camelCase(name));

const getNameByFullName = fullName => _.camelCase(fullName);

const nthIndexOf = (wholeString, n, searchString) => {
  let i = -1;
  while (n-- > 0 && (i = wholeString.indexOf(searchString, i + 1)) !== -1);
  return i;
};

module.exports = {
  capitalizeFirstLetter,
  getFullNameByName,
  getNameByFullName,
  nthIndexOf,
};
