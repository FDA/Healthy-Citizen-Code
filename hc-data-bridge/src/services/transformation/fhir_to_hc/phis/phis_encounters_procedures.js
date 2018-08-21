const moment = require('moment');
const _ = require('lodash');

module.exports = {
  procedureToProcedureStartDate (procedure) {
    const performedDateTime = _.get(procedure, 'performedDateTime', null);
    const performedPeriodStart = _.get(procedure, 'performedPeriod.start', null);
    const start = performedDateTime || performedPeriodStart;
    return moment(start).isValid ? moment(start).utc().format() : null;
  },
  procedureToProcedureEndDate (procedure) {
    const end = moment(_.get(procedure, 'performedPeriod.end', null));
    return end.isValid ? end.utc().format() : null;
  },
  performerToProviderId (performer) {
    return _.get(performer, '[0].actor.reference', null);
  },
  codeToProcedureCode (code) {
    return _.get(code, 'coding[0].code', null);
  },
  codeToProcedureCodeType (code) {
    return _.get(code, 'coding[0].system', null);
  },
};
