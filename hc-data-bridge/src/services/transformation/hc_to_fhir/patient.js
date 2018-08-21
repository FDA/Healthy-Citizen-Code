const _ = require('lodash');
const helper = require('./../../../lib/helper');

module.exports = {
  piisToName (piis) {
    // skip nulls
    const nameObject = _.omitBy({
      given: piis.firstName ? [piis.firstName] : [],
      family: piis.lastName,
    }, _.isNil);
    return [nameObject];
  },
  emailToTelecom (email) {
    return [
      {
        system: 'email',
        value: email,
      }];
  },
  piisToAddress (piis) {
    const geographicRegion = _.get(piis, 'demographics[0].geographicRegion');
    if (!geographicRegion) {
      return null;
    }
    const countryMatch = geographicRegion.match(new RegExp('Country: (\\w+)'));
    const stateMatch = geographicRegion.match(new RegExp('State: (\\w+)'));
    const cityMatch = geographicRegion.match(new RegExp('City: (\\w+)'));
    const country = _.get(countryMatch, '[1]', null);
    const state = _.get(stateMatch, '[1]', null);
    const city = _.get(cityMatch, '[1]', null);

    const zip = _.get(piis, 'demographics[0].zip', null);
    const addressObject = _.omitBy({
      country,
      state,
      city,
      postalCode: zip,
    }, _.isNil);
    return [addressObject];
  },
  piisToExtension (piis) {
    const extension = [];
    const guid = _.get(piis, 'demographics[0].guid');
    if (guid) {
      const guidExtension = helper.buildStringExtension('piis.demographics.guid', guid);
      extension.push(guidExtension);
    }
    const deidentifiedFlag = _.get(piis, 'demographics[0].shareDeidentifiedDataWithResearchers');
    if (deidentifiedFlag) {
      const deidentifiedFlagExtension = helper.buildStringExtension(
        'piis.demographics.shareDeidentifiedDataWithResearchers',
        deidentifiedFlag
      );
      extension.push(deidentifiedFlagExtension);
    }
    return extension.length ? extension : null;
  },
};
