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
  const { getParentInfo } = require('../../lib/util/unified-approach');
  const Decimal128 = require('bson/lib/decimal128.js');
  const decimalFromString = Decimal128.fromString;
  const { schemaKeyRegExp } = require('../../lib/util/model');
  const isValidDecimal128 = (value) => {
    try {
      if (value instanceof Decimal128) {
        return true;
      }
      // if can cast string to decimal without an error so it's a valid value
      decimalFromString(value);
    } catch (e) {
      return false;
    }
    return true;
  };
  const vutil = appLib.appModelHelpers.ValidatorUtils;

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
      const limit = _.get(handlerSpec, 'arguments');
      if (
        Array.isArray(val) &&
        Array.isArray(limit.from) &&
        Array.isArray(limit.to) &&
        val.length === 2 &&
        limit.from.length === 2 &&
        limit.to.length === 2
      ) {
        // TODO: also check if these are integers?
        const valInIn = val[0] * 12 + val[1];
        const fromInIn = limit.from[0] * 12 + limit.from[1];
        const toInIn = limit.to[0] * 12 + limit.to[1];
        if (valInIn >= fromInIn && valInIn <= toInIn) {
          cb();
        } else {
          cb(vutil.replaceErrorTemplatePlaceholders(schemaName, handlerSpec, val, row, lodashPath, appModelPart));
        }
      } else {
        cb();
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
        const pathToParent = lodashPath.split('.').slice(-1);
        // if lodashPath is of 1 length, i.e. in root then count as parent presented
        const isParentPresented = _.isEmpty(pathToParent) ? true : _.get(row, pathToParent);
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
          if (!Number.isInteger(elem)) {
            return cb(getErrorForValue(elem));
          }
          if (elem < INT32_MIN || elem > INT32_MAX) {
            // outside of the range
            return cb(getErrorForValue(elem));
          }
        }
        return cb();
      }

      if (!Number.isInteger(val)) {
        return cb(getErrorForValue(val));
      }
      if (val < INT32_MIN || val > INT32_MAX) {
        // outside of the range
        return cb(getErrorForValue(val));
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
    validateAssociativeArrayKeys(cb) {
      const { path: lodashPath, row } = this;
      const assocArray = _.get(row, lodashPath);
      const invalidKeys = _.keys(assocArray).filter((key) => !schemaKeyRegExp.test(key));
      if (!_.isEmpty(invalidKeys)) {
        const formattedKeys = invalidKeys.map((k) => `'${k}'`).join(', ');
        const keyMsg =
          invalidKeys.length === 1 ? `Key '${formattedKeys}' is invalid` : `Keys ${formattedKeys} are invalid`;
        return cb(`${keyMsg}. Every key must start with _a-zA-Z and contain only _a-zA-Z0-9 characters`);
      }
      return cb();
    },
  };

  return m;
};
