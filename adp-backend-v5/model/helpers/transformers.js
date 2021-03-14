/**
 * Transformers to be called by the BACKEND ONLY
 * WARNING: do not use lambda-functions, only function(param) {}, NOT (param) => {}. Lambda functions do not preserve "this"
 * each transformer receives "this" pointing to the document to be altered and 3 parameters:
 * path - string containing path to the element being altered (compatible with lodash _.set and _.get
 * next - callback to be called in the end of transformation
 */
const _ = require('lodash');
const sanitizeHtml = require('sanitize-html');
const { ObjectId } = require('mongodb');
const log = require('log4js').getLogger('helpers/transformers');
const { hashPassword, bcryptHashRegex } = require('../../lib/util/password');
const { getTime } = require('../../lib/util/date');

const {
  heightImperialToMetric,
  heightMetricToImperial,
  weightImperialWithOzToMetric,
  weightMetricToImperialWithOz,
  weightImperialToMetric,
  weightMetricToImperial,
} = require('./transformers_util');

module.exports = (appLib) => {
  function stringifyObjId(value) {
    return appLib.butil.isValidObjectId(value) ? value.toString() : value;
  }

  function objectId(value) {
    return appLib.butil.isValidObjectId(value) ? ObjectId(value) : value;
  }

  function getDecimalValue(val) {
    if (_.isString(val)) {
      return val;
    }
    // Decimal128 value is saved in cache as object. Example: { "$numberDecimal": "12.345" }
    if (_.isPlainObject(val) && val.$numberDecimal) {
      return val.$numberDecimal;
    }
    return val.toString();
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
      if (!_.isNil(data)) {
        const value = _.isArray(data) ? data.map((elem) => getDecimalValue(elem)) : getDecimalValue(data);
        _.set(row, path, value);
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
      if (typeof data === 'undefined' && row._id) {
        // this happens when users record is being updated, but the password is not a part of the update
        // in this case we need to read the existing hash and return it
        const { record: oldRecord } = await appLib.db
          .collection(modelName)
          .hookQuery('findOne', { _id: ObjectId(row._id) });
        if (!oldRecord) {
          throw `Unable to find record with _id=${row._id} while trying to preserve the password`;
        }
        const oldHash = _.get(oldRecord, path);
        if (oldHash) {
          _.set(row, path, oldHash);
        }
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
    objectId(next) {
      const { row, data, path } = this;
      if (!_.isNil(data)) {
        _.set(row, path, objectId(data));
      }
      next();
    },
    stringifyObjectId(next) {
      const { row, data, path } = this;
      if (!_.isNil(data)) {
        _.set(row, path, stringifyObjId(data));
      }
      next();
    },
    stringifyLookupObjectId(next) {
      const { row, data, path } = this;
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
      const { row, data, path } = this;
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
      const { row, data, path } = this;
      if (!_.isEmpty(data)) {
        _.each(data, (obj) => stringifyObjId(obj._id));
        _.set(row, path, data);
      }
      next();
    },
    objectIdTreeSelector(next) {
      const { row, data, path } = this;
      if (!_.isEmpty(data)) {
        _.each(data, (obj) => objectId(obj._id));
        _.set(row, path, data);
      }
      next();
    },
    setEpochIfNotSet(next) {
      const { row, data, path } = this;
      if (_.isNil(data)) {
        _.set(row, path, new Date(0));
      }
      next();
    },
    array(next) {
      const { row, data, path } = this;
      if (_.isNil(data)) {
        _.set(row, path, []);
      }
      _.each(data, (obj) => {
        obj._id = obj._id ? objectId(obj._id) : ObjectId();
      });
      next();
    },
    date(next) {
      const { row, data, path } = this;
      if (!_.isNil(data)) {
        _.set(row, path, new Date(data));
      }
      next();
    },
    dateTime(next) {
      const { row, data, path } = this;
      if (!_.isNil(data)) {
        _.set(row, path, new Date(data));
      }
      next();
    },
    location(next) {
      const { row, data, path } = this;
      if (!_.isNil(data) && data.type !== 'Point') {
        _.set(row, `${path}.type`, 'Point');
      }
      next();
    },
    htmlStringToHtmlObject(next) {
      const { row, data: html, path } = this;
      if (_.isString(html)) {
        let htmlNoTags = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
        // remove edge space chars and replace space chars with single space in the middle to sort and filter records properly
        htmlNoTags = htmlNoTags
          .replace(/^(\s)+/, '')
          .replace(/(\s)+$/, '')
          .replace(/(\s)+/g, ' ');

        _.set(row, path, {
          html,
          htmlNoTags,
        });
      }
      next();
    },
    htmlObjectToHtmlString(next) {
      const { row, data, path } = this;
      if (_.isPlainObject(data)) {
        _.set(row, path, data.html);
      }
      next();
    },
    transformScheme(next) {
      const { action, row, data, path } = this;
      const { schemaName } = data;
      if (!schemaName) {
        return next(`Scheme must have 'schemaName' field`);
      }

      // on 'update' the whole array value should be rewritten with user value
      try {
        const { errors } = appLib.mutil.upsertNewModel(data, schemaName, action);
        if (errors.length) {
          return next(`Scheme has errors:\n${errors.join('\n')}`);
        }
        _.set(row, path, data);
      } catch (e) {
        log.error('Unable to collect meta info for scheme', e.stack);
        return next('Unable to process scheme');
      }

      next();
    },
  };

  return m;
};
