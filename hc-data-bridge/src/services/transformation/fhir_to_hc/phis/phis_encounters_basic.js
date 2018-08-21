const moment = require('moment');
const _ = require('lodash');

module.exports = {
  serviceProviderToSourceType (serviceProvider) {
    // need to change schema first
    return null;
  },
  periodToAdmissionDate (period) {
    const start = moment(_.get(period, 'start', null));
    return start.isValid() ? start.utc().format() : null;
  },
  periodToDischargeDate (period) {
    const end = moment(_.get(period, 'end', null));
    return end.isValid() ? end.utc().format() : null;
  },
  serviceProviderToProviderId (serviceProvider) {
    return null;
  },
  serviceProviderToProviderName (serviceProvider) {
    return null;
  },
  classToEncounterType (encounterClass) {
    return null;
  },
  hospitalizationToDischargeDisposition (hospitalization) {
    return _.get(hospitalization, 'dischargeDisposition', null);
  },
  hospitalizationToDischargeStatus (hospitalization) {
    const display = _.get(hospitalization, 'dischargeDisposition.coding[0].display', null);
    const text = _.get(hospitalization, 'dischargeDisposition.text', null);
    return display || text;
  },
};
