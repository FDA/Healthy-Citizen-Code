const _ = require('lodash');
const moment = require('moment');

const ageRanges = [
  {
    value: '1',
    left: 0,
    right: 5,
  },
  {
    value: '2',
    left: 6,
    right: 10,
  },
  {
    value: '3',
    left: 11,
    right: 20,
  },
  {
    value: '4',
    left: 21,
    right: 30,
  },
  {
    value: '5',
    left: 31,
    right: 40,
  },
  {
    value: '6',
    left: 41,
    right: 50,
  },
  {
    value: '7',
    left: 51,
    right: 60,
  },
  {
    value: '8',
    left: 61,
    right: 70,
  },
  {
    value: '9',
    left: 71,
    right: 80,
  },
  {
    value: '10',
    left: 81,
    right: 90,
  },
  {
    value: '11',
    left: 91,
    right: 100,
  },
  {
    value: '12',
    left: 101,
    right: Number.MAX_VALUE,
  },
];

module.exports = {
  birthDateToAgeRange (birthDate) {
    if (!birthDate) {
      return null;
    }
    const yearsBetween = moment().diff(moment(birthDate), 'years', true);
    let rangeValue = 'invalid data';
    for (const range of ageRanges) {
      if (yearsBetween >= range.left && yearsBetween <= range.right) {
        rangeValue = range.value;
        break;
      }
    }
    return rangeValue;
  },
  addressToZip (address) {
    return _.get(address, '[0].postalCode', null);
  },
  addressToGeographicRegion (address) {
    const firstAddress = _.get(address, '[0]', null);
    if (!firstAddress) {
      return null;
    }
    const parts = [];
    if (firstAddress.country) {
      parts.push(`Country: ${firstAddress.country}`);
    }
    if (firstAddress.state) {
      parts.push(`State: ${firstAddress.state}`);
    }
    if (firstAddress.city) {
      parts.push(`City: ${firstAddress.city}`);
    }
    return _.join(parts, ', ') || null;
  },
  extensionToGuid (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/piis.demographics.guid';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToShareDeidentifiedDataWithResearchers (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/piis.demographics.shareDeidentifiedDataWithResearchers';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString.toString() === 'true' : null;
  },
};
