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

module.exports = mongoose => {
  const _ = require('lodash');
  const async = require('async');
  const log = require('log4js').getLogger('helpers/transformers');
  const { ObjectID } = require('mongodb');
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
    // TODO: write tests for imperialWeightWithOz
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
    addLookupDetails(path, appModelPart, userContext, next) {
      // TODO: bulletproof this method in case if lookup table record disappears, add validations to the schema
      log.trace(`addLookupDetails: ${path} ${JSON.stringify(appModelPart)}`);
      let model;
      try {
        model = mongoose.connection.model(appModelPart.lookup.table);
      } catch (e) {
        // do nothing
      }
      // TODO: See ADP-217. This is not the most elegant solution, but it should be rewritten when we better know what we need
      // from referring subschemas in lookups. This may also require refactoring the transformers (like getting rid of "this")
      if (model) {
        const ids = _.get(this, path);
        const addLabel = (idStr, cb) => {
          if (idStr.length === 24) {
            const id = new ObjectID(idStr);
            model.findOne({ [appModelPart.lookup.foreignKey]: id }, { [appModelPart.lookup.label]: 1 }, (err, data) => {
              let val;
              if (err || !data) {
                log.error(
                  `Unable to find lookup record for lookup ${JSON.stringify(appModelPart.lookup, null, 4)} ID: ${id}`
                );
              } else {
                val = data[appModelPart.lookup.label];
              }
              cb(err, val);
            });
          } else {
            log.error(`Unable to find label for malformed lookup ObjectID "${idStr}"`);
            cb();
          }
        };

        let newLabel = [];

        const doNext = function() {
          _.set(this, `${path}_label`, _.isArray(newLabel) ? _.uniq(newLabel) : newLabel);
          next();
        };

        if (_.isString(ids)) {
          async.series(
            [
              cb => {
                addLabel(ids, (err, val) => {
                  // addLabel ruins context
                  if (!err && val) {
                    newLabel = val;
                  }
                  cb();
                });
              },
            ],
            doNext.bind(this)
          );
        } else if (_.isArray(ids)) {
          async.eachSeries(
            ids,
            (id, cb) => {
              addLabel(id, (err, val) => {
                if (!err && val) {
                  newLabel.push(val);
                }
                cb();
              });
            },
            doNext.bind(this)
          ); // async loses context, this is why
        } else {
          log.error(`addLookupDetails expects either string or array, but got ${ids}`);
          next();
        }
      } else {
        // TODO: Using label as sent from the client is a security risk. Fix it later
        next();
      }
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
