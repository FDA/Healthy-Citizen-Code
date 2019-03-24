/**
 * Transformers to be called by the BACKEND ONLY
 * WARNING: do not use lambda-functions, only function(param) {}, NOT (param) => {}. Lambda functions do not preserve "this"
 * each transformer receives "this" pointing to the document to be altered and 3 parameters:
 * path - string containing path to the element being altered (compatible with lodash _.set and _.get
 * next - callback to be called in the end of transformation
 */

module.exports = mongoose => {
  const _ = require('lodash');
  const async = require('async');
  const log = require('log4js').getLogger('helpers/transformers');
  const { ObjectID } = require('mongodb');

  const m = {
    trim(path, appModelPart, userContext, next) {
      const val = _.get(this, path);
      if (val && typeof val.trim === 'function') {
        _.set(this, path, val.trim());
      }
      next();
    },
    heightImperialToMetric(path, appModelPart, userContext, next) {
      const val = _.get(this, path);
      if (val && Array.isArray(val) && val.length > 1) {
        const newVal = Math.round(val[0] * 30.48 + val[1] * 2.54);
        _.set(this, path, Number.isNaN(newVal) ? 0 : newVal);
      }
      next();
    },
    heightMetricToImperial(path, appModelPart, userContext, next) {
      const val = _.get(this, path);
      if (val) {
        const totalInches = Math.round(val / 2.54);
        const inches = totalInches % 12;
        const feet = (totalInches - inches) / 12;
        _.set(this, path, [feet, inches]);
      }
      next();
    },
    // TODO: write tests for imperialWeightWithOz
    weightImperialWithOzToMetric(path, appModelPart, userContext, next) {
      const val = _.get(this, path);
      if (val && Array.isArray(val) && val.length > 1) {
        const newVal = Math.round(val[0] * 453.59237 + val[1] * 28.349523125);
        _.set(this, path, Number.isNaN(newVal) ? 0 : newVal);
      }
      next();
    },
    weightMetricToImperialWithOz(path, appModelPart, userContext, next) {
      const val = _.get(this, path);
      if (val) {
        const totalOzs = Math.round(val / 28.349523125);
        const ozs = totalOzs % 16;
        const lbs = (totalOzs - ozs) / 16;
        _.set(this, path, [lbs, ozs]);
      }
      next();
    },
    weightImperialToMetric(path, appModelPart, userContext, next) {
      const val = _.get(this, path);
      if (val) {
        _.set(this, path, (val * 1000) / 2.2046226218); // note: now storing in grams
      }
      next();
    },
    weightMetricToImperial(path, appModelPart, userContext, next) {
      const val = _.get(this, path);
      if (val) {
        _.set(this, path, Math.round((val * 2.20462) / 1000)); // note: now storing in grams
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
            model.findOne(
              { [appModelPart.lookup.foreignKey]: id },
              { [appModelPart.lookup.label]: 1 },
              (err, data) => {
                let val;
                if (err || !data) {
                  log.error(
                    `Unable to find lookup record for lookup ${JSON.stringify(
                      appModelPart.lookup,
                      null,
                      4
                    )} ID: ${id}`
                  );
                } else {
                  val = data[appModelPart.lookup.label];
                }
                cb(err, val);
              }
            );
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
    rewritePasswordAndAddSalt(path, appModelPart, userContext, next) {
      // TODO: rewrite this temporary fix
      // fix for updating user via admin panel (no password sent in body)
      if (userContext.method.toLowerCase() === 'put') {
        const { url } = userContext;
        const [schemaName, id] = url.slice(1).split('/');
        const userIdToUpdate = new ObjectID(id);
        return mongoose.connection.db
          .collection(schemaName)
          .findOne({ _id: userIdToUpdate })
          .then(doc => {
            this.password = doc.password;
            this.salt = doc.salt;
            next();
          })
          .catch(err => {
            log.error(err);
            next(`Error rewritePasswordAndAddSalt`);
          });
      }

      if (this.passwordSet) {
        const plainPassword = _.get(this, path);
        // for setters inside setPassword func
        this.set = function(field, val) {
          this[field] = val;
        };
        const setPassword = mongoose.model('users').prototype.setPassword.bind(this);
        setPassword(plainPassword, () => {
          delete this.set;
          delete this.passwordSet;
          next();
        });
        return;
      }

      return next();
    },
    cleanupPassword(path, appModelPart, userContext, next) {
      if (userContext.method.toLowerCase() === 'get') {
        delete this[path];
        delete this.salt;
      }
      next();
    },
  };
  return m;
};
