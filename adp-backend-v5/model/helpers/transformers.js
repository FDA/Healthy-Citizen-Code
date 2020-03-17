/**
 * Transformers to be called by the BACKEND ONLY
 * WARNING: do not use lambda-functions, only function(param) {}, NOT (param) => {}. Lambda functions do not preserve "this"
 * each transformer receives "this" pointing to the document to be altered and 3 parameters:
 * path - string containing path to the element being altered (compatible with lodash _.set and _.get
 * next - callback to be called in the end of transformation
 */

const {
  heightImperialToMetric,
  heightMetricToImperial,
  weightImperialWithOzToMetric,
  weightMetricToImperialWithOz,
  weightImperialToMetric,
  weightMetricToImperial,
} = require('./transformers_util');

// eslint-disable-next-line no-unused-vars
module.exports = appLib => {
  const _ = require('lodash');
  const { hashPassword, bcryptHashRegex } = require('../../lib/util/password');
  const { getTime } = require('../../lib/util/date');

  const m = {
    /** Special transformer doing nothing, allows to specify 'null' in transformer array ['null', 'postTransformer'].
     * Value null is not appropriate since .xls transformer has null values cast to 'null'.
     */
    null(path, appModelPart, userContext, next) {
      // do nothing
      next();
    },
    toString(path, appModelPart, userContext, next) {
      const value = _.get(this, path);
      if (value) {
        _.set(this, path, value.toString());
      }
      next();
    },
    trim(path, appModelPart, userContext, next) {
      const val = _.get(this, path);
      if (val && typeof val.trim === 'function') {
        _.set(this, path, val.trim());
      }
      next();
    },
    heightImperialToMetric(path, appModelPart, userContext, next) {
      const imperialHeight = _.get(this, path);
      const metricHeight = heightImperialToMetric(imperialHeight);
      if (metricHeight !== undefined) {
        _.set(this, path, metricHeight);
      }
      next();
    },
    heightMetricToImperial(path, appModelPart, userContext, next) {
      const metricHeight = _.get(this, path);
      const imperialHeight = heightMetricToImperial(metricHeight);
      if (imperialHeight !== undefined) {
        _.set(this, path, imperialHeight);
      }
      next();
    },
    weightImperialWithOzToMetric(path, appModelPart, userContext, next) {
      const imperialWeight = _.get(this, path);
      const metricWeight = weightImperialWithOzToMetric(imperialWeight);
      if (metricWeight !== undefined) {
        _.set(this, path, metricWeight);
      }
      next();
    },
    weightMetricToImperialWithOz(path, appModelPart, userContext, next) {
      const metricWeight = _.get(this, path);
      const imperialWeight = weightMetricToImperialWithOz(metricWeight);
      if (imperialWeight !== undefined) {
        _.set(this, path, imperialWeight);
      }
      next();
    },
    weightImperialToMetric(path, appModelPart, userContext, next) {
      const imperialWeight = _.get(this, path);
      const metricWeight = weightImperialToMetric(imperialWeight);
      if (metricWeight !== undefined) {
        _.set(this, path, metricWeight);
      }
      next();
    },
    weightMetricToImperial(path, appModelPart, userContext, next) {
      const metricWeight = _.get(this, path);
      const imperialWeight = weightMetricToImperial(metricWeight);
      if (imperialWeight !== undefined) {
        _.set(this, path, imperialWeight);
      }
      next();
    },
    async hashPassword(path, appModelPart, userContext, next) {
      const password = _.get(this, path);
      const isBcryptHash = bcryptHashRegex.test(password);
      if (!password || isBcryptHash) {
        return next();
      }

      const hash = await hashPassword(password);
      _.set(this, path, hash);
      next();
    },
    cleanupPassword(path, appModelPart, userContext, next) {
      if (['view', 'viewDetails'].includes(userContext.action)) {
        _.unset(this, path);
      }
      next();
    },
    time(path, appModelPart, userContext, next) {
      const value = _.get(this, path);
      _.set(this, path, getTime(value));
      next();
    },
  };

  return m;
};
