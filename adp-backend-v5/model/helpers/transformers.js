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
module.exports = (appLib) => {
  const _ = require('lodash');
  const { ObjectId } = require('mongodb');
  const { hashPassword, bcryptHashRegex } = require('../../lib/util/password');
  const { getTime } = require('../../lib/util/date');

  function stringifyObjId(value) {
    return appLib.butil.isValidObjectId(value) ? value.toString() : value;
  }

  function objectId(value) {
    return appLib.butil.isValidObjectId(value) ? ObjectId(value) : value;
  }

  const m = {
    /** Special transformer doing nothing, allows to specify 'null' in transformer array ['null', 'postTransformer'].
     * Value null is not appropriate since .xls transformer has null values cast to 'null'.
     */
    null(next) {
      // do nothing
      next();
    },
    toString(next) {
      const { path, row } = this;
      const value = _.get(row, path);
      if (value) {
        _.set(row, path, value.toString());
      }
      next();
    },
    decimalToString(next) {
      const { path, row, data } = this;
      if (data) {
        if (_.isArray(data)) {
          _.set(
            row,
            path,
            data.map((elem) => elem.toString())
          );
        } else {
          _.set(row, path, data.toString());
        }
      }
      next();
    },
    trim(next) {
      const { path, row, data } = this;
      if (data && typeof data.trim === 'function') {
        _.set(row, path, data.trim());
      }
      next();
    },
    heightImperialToMetric(next) {
      const { path, row, data } = this;
      const metricHeight = heightImperialToMetric(data);
      if (metricHeight !== undefined) {
        _.set(row, path, metricHeight);
      }
      next();
    },
    heightMetricToImperial(next) {
      const { path, row, data } = this;
      const imperialHeight = heightMetricToImperial(data);
      if (imperialHeight !== undefined) {
        _.set(row, path, imperialHeight);
      }
      next();
    },
    weightImperialWithOzToMetric(next) {
      const { path, row, data } = this;
      const metricWeight = weightImperialWithOzToMetric(data);
      if (metricWeight !== undefined) {
        _.set(row, path, metricWeight);
      }
      next();
    },
    weightMetricToImperialWithOz(next) {
      const { path, row, data } = this;
      const imperialWeight = weightMetricToImperialWithOz(data);
      if (imperialWeight !== undefined) {
        _.set(row, path, imperialWeight);
      }
      next();
    },
    weightImperialToMetric(next) {
      const { path, row, data } = this;
      const metricWeight = weightImperialToMetric(data);
      if (metricWeight !== undefined) {
        _.set(row, path, metricWeight);
      }
      next();
    },
    weightMetricToImperial(next) {
      const { path, row, data } = this;
      const imperialWeight = weightMetricToImperial(data);
      if (imperialWeight !== undefined) {
        _.set(row, path, imperialWeight);
      }
      next();
    },
    async hashPassword(next) {
      const { path, row, data, modelName } = this;
      if (typeof data === 'undefined') {
        // this happens when users record is being updated, but the password is not a part of the update
        // in this case we need to read the existing hash and return it
        const oldRecord = await appLib.db.model(modelName).findOne(row._id).lean();
        if (!oldRecord) {
          throw `Unable to find record with _id=${row._id} while trying to preserve the password`;
        }
        const oldHash = _.get(oldRecord, path);
        if (oldHash.length < 10) {
          throw `Unable to obtain a valid hash for record _id=${row._id} while trying to preserve the password`;
        }
        _.set(row, path, oldHash);
        next();
      } else {
        const isBcryptHash = bcryptHashRegex.test(data);
        if (!data || isBcryptHash) {
          return next();
        }

        const hash = await hashPassword(data);
        _.set(row, path, hash);
        next();
      }
    },
    cleanupPassword(next) {
      const { action, row, path } = this;
      if (['view', 'viewDetails'].includes(action)) {
        _.unset(row, path);
      }
      next();
    },
    time(next) {
      const { path, row, data } = this;
      _.set(row, path, getTime(data));
      next();
    },
    stringifyLookupObjectId(next) {
      const { data, path, row } = this;
      if (!_.isNil(data) || !_.isEmpty(data)) {
        const isArrayVal = _.isArray(data);
        let formatted = _.castArray(data).map((obj) => {
          if (obj._id) {
            return { ...obj, _id: stringifyObjId(obj._id) };
          }
          return obj;
        });
        formatted = isArrayVal ? formatted : formatted[0];
        _.set(row, path, formatted);
      }
      next();
    },
    lookupObjectId(next) {
      const { data, path, row } = this;
      if (!_.isNil(data) || !_.isEmpty(data)) {
        const isArrayVal = _.isArray(data);
        let formatted = _.castArray(data).map((obj) => {
          if (obj._id) {
            return { ...obj, _id: objectId(obj._id) };
          }
          return obj;
        });
        formatted = isArrayVal ? formatted : formatted[0];
        _.set(row, path, formatted);
      }
      next();
    },
    stringifyTreeSelector(next) {
      const { data, path, row } = this;
      if (!_.isEmpty(data)) {
        _.each(data, (obj) => stringifyObjId(obj._id));
        _.set(row, path, data);
      }
      next();
    },
    objectIdTreeSelector(next) {
      const { data, path, row } = this;
      if (!_.isEmpty(data)) {
        _.each(data, (obj) => objectId(obj._id));
        _.set(row, path, data);
      }
      next();
    },
  };

  return m;
};
