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
  const decimalFromString = require('bson/lib/decimal128.js').fromString;

  const vutil = appLib.appModelHelpers.ValidatorUtils;

  /**
   * Retrieves data necessary for context used in 'required' validator.
   * Examples:
   * - for path 'a1.1.a2.2.a3.3.s3' parentPath='a1.1.a2.2.a3', index=3, indexes=[1,2,3]
   * - for path 'a1.1.a2.2.a3.3.a4' parentPath='a1.1.a2.2.a3', index=3., indexes=[1,2,3]
   * More info: https://confluence.conceptant.com/display/DEV/Unified+Approach+to+Helper+Methods
   * @param modelName
   * @param lodashPath
   * @returns {{indexes: Array, index: number, parentPath: *}}
   */
  function getRequiredData(modelName, lodashPath) {
    const arrIndexes = [];
    let lastArrPath;
    const curPath = [];
    let curAppModelPart = appLib.appModel.models[modelName];
    const lodashPathArr = lodashPath.split('.');

    let index;
    for (let i = 0; i < lodashPathArr.length; i++) {
      const field = lodashPathArr[i];
      curPath.push(field);
      curAppModelPart = curAppModelPart.fields[field];
      if (curAppModelPart.type === 'Array') {
        if (i !== lodashPathArr.length - 1) {
          // if last elem is array then lastArrPath for it is penultimate array in the whole sequence
          lastArrPath = curPath.slice(0);
        }

        i++;
        index = lodashPathArr[i];
        if (index) {
          curPath.push(index);
          arrIndexes.push(index);
        }
      }
    }
    index = lastArrPath ? +lodashPathArr[lastArrPath.length] : null;
    return { indexes: arrIndexes, index, parentPath: lastArrPath };
  }

  const m = {
    minLength(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = vutil.getValue(this, appModelPart, lodashPath);
      const castToType = 'Number';
      const length = vutil.getArgumentValue(
        handlerSpec.arguments,
        'length',
        this,
        lodashPath,
        appModelPart,
        castToType
      );

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
            vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart)
          );
        }
      }
      cb();
    },
    maxLength(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = vutil.getValue(this, appModelPart, lodashPath);
      const castToType = 'Number';
      const length = vutil.getArgumentValue(
        handlerSpec.arguments,
        'length',
        this,
        lodashPath,
        appModelPart,
        castToType
      );

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
            vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart)
          );
        }
      }
      cb();
    },
    notEqual(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = vutil.getValue(this, appModelPart, lodashPath);
      const argVal = vutil.getArgumentValue(handlerSpec.arguments, 'value', this, lodashPath, appModelPart);

      if (val && argVal && val === argVal) {
        return cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }
      cb();
    },
    equal(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = vutil.getValue(this, appModelPart, lodashPath);
      const argVal = vutil.getArgumentValue(handlerSpec.arguments, 'value', this, lodashPath, appModelPart);
      if (val && argVal && val === argVal) {
        return cb();
      }
      cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
    },
    regex(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = vutil.getValue(this, appModelPart, lodashPath, true);
      const regex = vutil.getArgumentValue(handlerSpec.arguments, 'regex', this, lodashPath, appModelPart);
      const regexOptions = vutil.getArgumentValue(
        handlerSpec.arguments,
        'regexOptions',
        this,
        lodashPath,
        appModelPart
      );
      if (val && regex !== undefined && regexOptions !== undefined && !new RegExp(regex, regexOptions).test(val)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }
      cb();
    },
    notInFuture(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      // TODO: replace with max(date) and $now/@now?
      const val = vutil.getValue(this, appModelPart, lodashPath);
      const limit = vutil.getDatePartValue(new Date());
      if (val instanceof Date && !Number.isNaN(val.valueOf()) && val > limit) {
        return cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }
      cb();
    },
    notInPast(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      // TODO: replace with max(date) and $now/@now?
      const val = vutil.getValue(this, appModelPart, lodashPath);
      const limit = vutil.getDatePartValue(new Date());
      if (val instanceof Date && !Number.isNaN(val.valueOf()) && val < limit) {
        return cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }
      cb();
    },
    min(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = vutil.getValue(this, appModelPart, lodashPath);
      const limit = vutil.getArgumentValue(handlerSpec.arguments, 'limit', this, lodashPath, appModelPart);
      if (val && limit) {
        const isValidTypes = typeof limit === typeof val;
        if (!isValidTypes) {
          return cb(`Type mismatch for val=${JSON.stringify(val)} and validator=${JSON.stringify(limit)}`);
        }

        if (val < limit) {
          return cb(
            vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart)
          );
        }
      }
      cb();
    },
    max(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = vutil.getValue(this, appModelPart, lodashPath);
      const limit = vutil.getArgumentValue(handlerSpec.arguments, 'limit', this, lodashPath, appModelPart);
      if (val && limit) {
        const isValidTypes = typeof limit === typeof val;
        if (!isValidTypes) {
          return cb(`Type mismatch for val=${JSON.stringify(val)} and validator=${JSON.stringify(limit)}`);
        }

        if (val > limit) {
          return cb(
            vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart)
          );
        }
      }
      cb();
    },
    imperialHeightRange(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = _.get(this, lodashPath);
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
          cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
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
     * @param modelName
     * @param lodashPath
     * @param appModelPart
     * @param userContext
     * @param handlerSpec
     * @param cb
     */
    required(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = vutil.getValue(this, appModelPart, lodashPath);
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
        ((isArray || isAssociativeArray || isMixedType || isMultipleType) && _.isEmpty(val)) ||
        (isBoolean && val === false); // this is not supposed to be

      let isRequired;

      if (_.isBoolean(appModelPart.required)) {
        const pathToParent = lodashPath.split('.').slice(-1);
        // if lodashPath is of 1 length, i.e. in root then count as parent presented
        const isParentPresented = _.isEmpty(pathToParent) ? true : _.get(this, pathToParent);
        isRequired = isParentPresented && appModelPart.required;
      } else if (_.isString(appModelPart.required)) {
        try {
          const { action } = userContext;

          if (appModelPart.required.includes('this.')) {
            const requiredData = getRequiredData(modelName, lodashPath);
            const context = {
              data: val,
              row: this,
              modelSchema: appModelPart,
              action,
              indexes: requiredData.indexes,
              parentData: _.get(this, requiredData.parentPath),
              index: requiredData.index,
              path: lodashPath,
            };
            const inlineCode = appLib.butil.getDefaultArgsAndValuesForInlineCode();
            isRequired = new Function(inlineCode.args, `return ${appModelPart.required}`).apply(
              context,
              inlineCode.values
            );
          } else {
            const requiredFunc = new Function('data, row, modelSchema, $action', `return ${appModelPart.required}`);
            isRequired = requiredFunc(val, this, appModelPart, action);
          }
        } catch (e) {
          return cb(
            `Error occurred during validating required field ${appModelPart.fullName} for condition ${appModelPart.required}`
          );
        }
      }

      if (isRequired && isEmptyVal) {
        cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      } else {
        cb();
      }
    },
    int32(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = _.get(this, lodashPath);
      if (val === undefined) {
        return cb();
      }

      const INT32_MAX = 0x7fffffff;
      const INT32_MIN = -0x80000000;

      if (!Number.isInteger(val)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }
      if (val < INT32_MIN || val > INT32_MAX) {
        // outside of the range
        return cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }

      cb();
    },
    int64(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = _.get(this, lodashPath);
      if (val === undefined) {
        return cb();
      }

      if (!Number.isInteger(val)) {
        return cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }
      if (val < Number.MIN_SAFE_INTEGER || val > Number.MAX_SAFE_INTEGER) {
        // outside of the range
        return cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }

      cb();
    },
    decimal128(modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
      const val = _.get(this, lodashPath);
      if (val === undefined) {
        return cb();
      }
      try {
        // if can cast string to decimal without an error so it's a valid value
        decimalFromString(val);
      } catch (e) {
        cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
      }
      cb();
    },
  };

  return m;
};
