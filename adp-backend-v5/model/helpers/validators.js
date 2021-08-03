/**
 * Validators for various fields in the app model
 * See metaschema for details
 *
 * Each validators accepts variable number or arguments:
 * @param this is binded to the actual data to validate
 * @param lodashPath path in lodash format to the element of the data being validated
 * @param appModelPart is the part of the app model defining the elment being verified
 * @param handler spec is the specification containing the validator specification and containing the following fields:
 *  validator - the name of the validator (matches the function name
 *  arguments - the argumetns of the validator (always in associative, not positional)
 *  errorMessages - error messages suggested for returning in the case of error. It may have the following placeholders:
 *    $val - replaced with the value being validated (don't name the arguments "val")
 *    $<variableName> - replaced with the value of the corresponding named argument
 *    #<lodashPath> - if argument is a data attribute name then replaced with the value of that attribute according to this loadsh path and attribute type, otherwise just replaced with value
 *    @<lodashPath> - if argument is a data attribute name then replaced with the name of that attribute according to this loadsh path and attribute type, otherwise just replaced with value
 * The model may contain validators specified as an array in one of the two formats (you can mix them in one array):
 * Extended format:
 *  "validate": [{
 *      "validator": "notEqual",
 *      "arguments": {
 *          "value": "2017-01-01T00:00:00",
 *          "value2": "$otherFieldInRecord"
 *      },
 *      "errorMessages": {
 *          "default": "The date should not be equal to Jan 1st, 2017 midnight"
 *      }
 *  }]
 *  Simplefied format:
 *  ["min(6)", "max(25)", "notEqual(9)"]
 *  Simplified format is always extended before passing to validators using validatorShortcuts file explaining how to do this mapping
 *  NOTE: you have to have lodash for this to work. Lodash is available for both web browser and ReactNative
 */

module.exports = (appLib) => {
  const _ = require('lodash');
  const log = require('log4js').getLogger('helpers/validators');
  const { getParentInfo } = require('../../lib/util/unified-approach');
  const { difference } = require('../../lib/util/set-helpers');
  const { Decimal128 } = require('bson');
  const { schemaKeyRegExp } = require('../../lib/util/model');
  const ms = require('ms');
  const isValidDecimal128 = (value) => {
    try {
      if (value instanceof Decimal128) {
        return true;
      }
      // if able to cast string to decimal without an error so it's a valid value
      Decimal128.fromString(value);
      return true;
    } catch (e) {
      return false;
    }
  };
  const vutil = appLib.appModelHelpers.ValidatorUtils;

  function isIntegerString(val) {
    return /^\d+$/.test(val);
  }

  function isArrayWithTwoIntegers(arr) {
    return _.isArray(arr) && arr.length === 2 && arr.findIndex((val) => !Number.isInteger(val)) === -1;
  }

  function isValidDate(cb) {
    const { path, handlerSpec, fieldSchema, modelSchema, data, row } = this;
    const { schemaName } = modelSchema;
    const date = new Date(data);
    if (date === 'Invalid Date') {
      return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, data, row, path, fieldSchema));
    }
    return cb();
  }

  const m = {
    minLength(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const castToType = 'Number';
      const length = vutil.getArgumentValue(handlerSpec.arguments, 'length', row, lodashPath, appModelPart, castToType);

      if (val && length) {
        const argType = typeof length;
        const valType = typeof val.length;
        const isValidTypes = argType === 'number' && valType === argType;
        if (!isValidTypes) {
          return cb(
            `Type mismatch for length of val=${JSON.stringify(val)} and length of validator=${JSON.stringify(
              val
            )}. Both must be of number type.`
          );
        }

        if (val.length < length) {
          return cb(
            vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart)
          );
        }
      }
      cb();
    },
    maxLength(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const castToType = 'Number';
      const length = vutil.getArgumentValue(handlerSpec.arguments, 'length', row, lodashPath, appModelPart, castToType);

      if (val && length) {
        const argType = typeof length;
        const valType = typeof val.length;
        const isValidTypes = argType === 'number' && valType === argType;
        if (!isValidTypes) {
          return cb(
            `Type mismatch for length of val=${JSON.stringify(val)} and length of validator=${JSON.stringify(
              val
            )}. Both must be of number type.`
          );
        }

        if (val.length > length) {
          return cb(
            vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart)
          );
        }
      }
      cb();
    },
    notEqual(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const argVal = vutil.getArgumentValue(handlerSpec.arguments, 'value', row, lodashPath, appModelPart);

      if (val && argVal && val === argVal) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }
      cb();
    },
    equal(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const argVal = vutil.getArgumentValue(handlerSpec.arguments, 'value', row, lodashPath, appModelPart);
      if (val && argVal && val === argVal) {
        return cb();
      }
      cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
    },
    regex(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = vutil.getValue(row, appModelPart, lodashPath, true);
      const regex = vutil.getArgumentValue(handlerSpec.arguments, 'regex', row, lodashPath, appModelPart);
      const regexOptions = vutil.getArgumentValue(handlerSpec.arguments, 'regexOptions', row, lodashPath, appModelPart);
      if (val && regex !== undefined && regexOptions !== undefined && !new RegExp(regex, regexOptions).test(val)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }
      cb();
    },
    notInFuture(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      // TODO: replace with max(date) and $now/@now?
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const limit = vutil.getDatePartValue(new Date());
      if (val instanceof Date && !Number.isNaN(val.valueOf()) && val > limit) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }
      cb();
    },
    notInPast(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      // TODO: replace with max(date) and $now/@now?
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const limit = vutil.getDatePartValue(new Date());
      if (val instanceof Date && !Number.isNaN(val.valueOf()) && val < limit) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }
      cb();
    },
    min(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const limit = vutil.getArgumentValue(handlerSpec.arguments, 'limit', row, lodashPath, appModelPart);
      if (val && limit) {
        const isValidTypes = typeof limit === typeof val;
        if (!isValidTypes) {
          return cb(`Type mismatch for val=${JSON.stringify(val)} and validator=${JSON.stringify(limit)}`);
        }

        if (val < limit) {
          return cb(
            vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart)
          );
        }
      }
      cb();
    },
    max(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const limit = vutil.getArgumentValue(handlerSpec.arguments, 'limit', row, lodashPath, appModelPart);
      if (val && limit) {
        const isValidTypes = typeof limit === typeof val;
        if (!isValidTypes) {
          return cb(`Type mismatch for val=${JSON.stringify(val)} and validator=${JSON.stringify(limit)}`);
        }

        if (val > limit) {
          return cb(
            vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart)
          );
        }
      }
      cb();
    },
    imperialHeightRange(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = _.get(row, lodashPath);
      if (!val) {
        return cb();
      }

      if (!isArrayWithTwoIntegers(val)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }

      const limit = _.get(handlerSpec, 'arguments', []);
      const { from, to } = limit;
      if (!isArrayWithTwoIntegers(from) || !isArrayWithTwoIntegers(to)) {
        return cb();
      }

      const [valFeet, valInches] = val;
      const [fromFeet, fromInches] = from;
      const [toFeet, toInches] = to;
      const valInInches = valFeet * 12 + valInches;
      const fromInInches = fromFeet * 12 + fromInches;
      const toInInches = toFeet * 12 + toInches;

      if (valInInches >= fromInInches && valInInches <= toInInches) {
        cb();
      } else {
        cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }
    },
    imperialWeightWithOz(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = _.get(row, lodashPath);
      if (!val) {
        return cb();
      }

      if (!isArrayWithTwoIntegers(val)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }

      const limit = _.get(handlerSpec, 'arguments', []);
      const { from, to } = limit;
      if (!isArrayWithTwoIntegers(from) || !isArrayWithTwoIntegers(to)) {
        return cb();
      }

      const [valPounds, valOunces] = val;
      const [fromPounds, fromOunces] = from;
      const [toPounds, toOunces] = to;
      const valInOunces = valPounds * 16 + valOunces;
      const fromInOunces = fromPounds * 16 + fromOunces;
      const toInOunces = toPounds * 16 + toOunces;

      if (valInOunces >= fromInOunces && valInOunces <= toInOunces) {
        cb();
      } else {
        cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }
    },
    /**
     * Validates 'required' field presented as string (dynamic value depends on current item value).
     * For example: 'row[type] == "inline"'
     * Generated required function supports following signatures(old and new for backward compatibility):
     * - no context and 'data, row, modelSchema, $action' as params.
     * - context with properties 'data, row, modelSchema, action, arrIndexes, parentData, index, path'
     * and 'moment, _, ObjectID, and, or' as params
     * @param cb
     */
    required(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, userContext, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = vutil.getValue(row, appModelPart, lodashPath);
      const { type } = appModelPart;
      const isMultipleType = type.endsWith('[]');
      const isAssociativeArray = type === 'AssociativeArray';
      const isArray = type === 'Array';
      const isMixedType = type === 'Mixed';
      const isString = type === 'String';
      const isBoolean = type === 'Boolean';
      const isEmptyVal =
        _.isNil(val) ||
        (isString && val === '') ||
        ((isArray || isAssociativeArray || isMultipleType) && _.isEmpty(val)) ||
        (isMixedType && _.isNil(val)) ||
        (isBoolean && val === false); // this is not supposed (agreement)

      let isRequired;

      if (_.isBoolean(appModelPart.required)) {
        const pathToParent = lodashPath.split('.').slice(0, -1);
        // if lodashPath is of 1 length, i.e. in root then count as parent presented
        const isParentPresented = _.isEmpty(pathToParent) ? true : !!_.get(row, pathToParent);
        isRequired = isParentPresented && appModelPart.required;
      } else if (_.isString(appModelPart.required)) {
        try {
          const { action } = userContext;

          if (appModelPart.required.includes('this.')) {
            const { indexes, index, parentData } = getParentInfo(appLib.appModel.models[schemaName], row, lodashPath);
            const context = {
              path: lodashPath,
              data: val,
              row,
              fieldSchema: appModelPart,
              action,
              indexes,
              index,
              parentData,
            };
            const inlineCode = appLib.butil.getDefaultArgsAndValuesForInlineCode();
            isRequired = new Function(inlineCode.args, `return ${appModelPart.required}`).apply(
              context,
              inlineCode.values
            );
          } else {
            const requiredFunc = new Function('data, row, modelSchema, $action', `return ${appModelPart.required}`);
            isRequired = requiredFunc(val, row, appModelPart, action);
          }
        } catch (e) {
          return cb(
            `Error occurred during validating required field ${appModelPart.fullName} for condition ${appModelPart.required}`
          );
        }
      }

      if (isRequired && isEmptyVal) {
        cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      } else {
        cb();
      }
    },
    int32(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = _.get(row, lodashPath);
      if (_.isNil(val)) {
        return cb();
      }

      const INT32_MAX = 0x7fffffff;
      const INT32_MIN = -0x80000000;

      const getErrorForValue = (value) =>
        vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, value, row, lodashPath, appModelPart);

      const isMultiple = appModelPart.type.endsWith('[]');
      if (isMultiple) {
        for (const elem of val) {
          const elemNum = Number(elem);
          if (!Number.isInteger(elemNum)) {
            return cb(getErrorForValue(elemNum));
          }
          if (elemNum < INT32_MIN || elemNum > INT32_MAX) {
            // outside of the range
            return cb(getErrorForValue(elemNum));
          }
        }
        return cb();
      }

      const valNum = Number(val);
      if (!Number.isInteger(valNum)) {
        return cb(getErrorForValue(valNum));
      }
      if (valNum < INT32_MIN || valNum > INT32_MAX) {
        // outside of the range
        return cb(getErrorForValue(valNum));
      }

      cb();
    },
    int64(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = _.get(row, lodashPath);
      if (_.isNil(val)) {
        return cb();
      }
      const getErrorForValue = (value) =>
        vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, value, row, lodashPath, appModelPart);

      const isMultiple = appModelPart.type.endsWith('[]');
      if (isMultiple) {
        for (const elem of val) {
          if (!Number.isInteger(elem)) {
            return cb(getErrorForValue(elem));
          }
          if (elem < Number.MIN_SAFE_INTEGER || elem > Number.MAX_SAFE_INTEGER) {
            // outside of the range
            return cb(getErrorForValue(elem));
          }
        }
        return cb();
      }

      if (!Number.isInteger(val)) {
        return cb(getErrorForValue(val));
      }
      if (val < Number.MIN_SAFE_INTEGER || val > Number.MAX_SAFE_INTEGER) {
        // outside of the range
        return cb(getErrorForValue(val));
      }
      cb();
    },
    decimal128(cb) {
      const { path: lodashPath, fieldSchema: appModelPart, handlerSpec, modelSchema, row } = this;
      const { schemaName } = modelSchema;
      const val = _.get(row, lodashPath);
      if (_.isNil(val)) {
        return cb();
      }

      const isMultiple = appModelPart.type.endsWith('[]');
      if (isMultiple) {
        if (!_.isArray(val)) {
          return cb(
            vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart)
          );
        }
        const invalidIndex = val.findIndex((elem) => !isValidDecimal128(elem));
        if (invalidIndex !== -1) {
          const invalidElem = val[invalidIndex];
          return cb(
            vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, invalidElem, row, lodashPath, appModelPart)
          );
        }
        return cb();
      }

      if (!isValidDecimal128(val)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
      }
      cb();
    },
    validateAssociativeArray(cb) {
      const { path: lodashPath, row } = this;
      const assocArray = _.get(row, lodashPath);
      const isValidFormat = _.isNil(assocArray) || _.isPlainObject(assocArray);
      if (!isValidFormat) {
        return cb(`Invalid data format`);
      }
      const invalidKeys = _.keys(assocArray).filter((key) => !schemaKeyRegExp.test(key));
      if (!_.isEmpty(invalidKeys)) {
        const formattedKeys = invalidKeys.map((k) => `'${k}'`).join(', ');
        const keyMsg =
          invalidKeys.length === 1 ? `Key '${formattedKeys}' is invalid` : `Keys ${formattedKeys} are invalid`;
        return cb(`${keyMsg}. Every key must start with _a-zA-Z and contain only _a-zA-Z0-9 characters`);
      }
      return cb();
    },
    array(cb) {
      const { path, fieldSchema: appModelPart, handlerSpec, modelSchema, data, row } = this;
      const { schemaName } = modelSchema;
      if (!_.isNil(data) && !_.isArray(data)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, data, row, path, appModelPart));
      }
      const hasInvalidElem = _.find(data, (elem) => !_.isPlainObject(elem));
      if (hasInvalidElem) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, data, row, path, appModelPart));
      }
      return cb();
    },
    object(cb) {
      const { path, handlerSpec, fieldSchema, modelSchema, data, row } = this;
      const { schemaName } = modelSchema;
      if (!_.isNil(data) && !_.isPlainObject(data)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, data, row, path, fieldSchema));
      }
      const schemaFieldNames = _.keys(fieldSchema.fields);
      const dataFieldNames = _.keys(data);
      const invalidFieldNames = difference(dataFieldNames, schemaFieldNames);
      if (invalidFieldNames.size > 0) {
        let msg = invalidFieldNames.size === 1 ? `Invalid object field name ` : `Invalid object field names: `;
        msg += [...invalidFieldNames].map((f) => `'${f}'`).join(', ');
        return cb(msg);
      }

      return cb();
    },
    string(cb) {
      const { path, handlerSpec, fieldSchema, modelSchema, data, row } = this;
      const { schemaName } = modelSchema;
      if (!_.isNil(data) && !_.isString(data)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, data, row, path, fieldSchema));
      }
      return cb();
    },
    objectId(cb) {
      const { path, handlerSpec, fieldSchema, modelSchema, data, row } = this;
      const { schemaName } = modelSchema;
      if (!appLib.butil.isValidObjectId(data)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, data, row, path, fieldSchema));
      }
      return cb();
    },
    date(cb) {
      return isValidDate.call(this, cb);
    },
    dateTime(cb) {
      return isValidDate.call(this, cb);
    },
    location(cb) {
      const { path, handlerSpec, fieldSchema, modelSchema, data, row } = this;
      const { schemaName } = modelSchema;

      if (_.isNil(data)) {
        return cb();
      }
      const [longitude, latitude] = data.coordinates || [];
      const isValidLongitude = _.isNumber(longitude) && Math.abs(longitude) <= 180;
      const isValidLatitude = _.isNumber(latitude) && Math.abs(latitude) <= 90;

      if (!isValidLongitude || !isValidLatitude) {
        return cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, data, row, path, fieldSchema));
      }
      return cb();
    },
    validateScheme(cb) {
      const { data, action } = this;
      const { schemaName } = data;
      if (!schemaName) {
        return cb(`Scheme must have 'schemaName' field`);
      }
      const isActionsCreatesScheme = action === 'create' || action === 'clone';
      if (isActionsCreatesScheme && appLib.appModel.models[schemaName]) {
        return cb(`Scheme with schemaName '${schemaName}' already exists`);
      }

      try {
        const { errors } = appLib.mutil.validateNewModel(data, schemaName);
        if (errors.length) {
          return cb(`Scheme has errors:\n${errors.join('\n')}`);
        }
      } catch (e) {
        const msg = 'Unable to validate scheme';
        log.error(msg, e.stack);
        return cb(msg);
      }

      cb();
    },
    boolean(cb) {
      const { data } = this;
      if (_.isUndefined(data) || _.isBoolean(data)) {
        return cb();
      }
      cb(`Invalid value`);
    },
    triStateBoolean(cb) {
      const { data } = this;
      if (_.isUndefined(data) || _.isNull(data) || _.isBoolean(data)) {
        return cb();
      }
      cb(`Invalid value`);
    },
    intString(cb) {
      const { data } = this;
      if (!data) {
        return cb();
      }
      return isIntegerString(data) ? cb() : cb(`Invalid value`);
    },
    booleanString(cb) {
      const { data } = this;
      if (!data) {
        return cb();
      }
      const val = data.toLowerCase();
      if (val === 'true' || val === 'false') {
        return cb();
      }
      return cb(`Invalid value`);
    },
    msString(cb) {
      const { data } = this;
      if (!data) {
        return cb();
      }
      const milliseconds = ms(data);
      if (milliseconds === undefined) {
        return cb(`Invalid value`);
      }
      return Number.isInteger(milliseconds) ? cb() : cb(`Invalid value`);
    },
  };

  return m;
};
