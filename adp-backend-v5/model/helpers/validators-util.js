const _ = require('lodash');
const {
  getDatePartValue,
  getTime,
  getDatePartString,
  getDateFromAmPmTime,
  getAmPmTimeFromDate,
} = require('../../lib/util/date');

/**
 * Utility functions used in various validators
 * WARNING: avoid using ES6 in this file as it will be used both on back and frontend.
 */

module.exports = appLib => {
  const m = {};

  function getShownVal(type, val) {
    if (type === 'Date') {
      return m.getDatePartString(val);
    }
    if (type === 'DateTime') {
      return val.toISOString();
    }
    if (type === 'Time') {
      return m.getAmPmTimeFromDate(val);
    }
    return val;
  }

  function getShownArgument(type, arg) {
    if (type === 'Date') {
      return m.getDatePartString(arg);
    }
    if (type === 'DateTime') {
      return new Date(arg).toISOString();
    }
    return arg;
  }

  /**
   * Extracts "templateName" error template from the validator specification "spec"
   * and returns a string with all placeholders replaced (see above)
   * @param modelName - model name
   * @param spec - validator extended specification
   * @param val - the value being checked
   * @param data - all data from the current record
   * @param lodashDataPath - lodash path to the data being validated
   * @param appModelPart - the application model part describing the element being validated
   * @param templateName - (optional) the name of the errorTemplate. Template called 'Date' (if available) will be used for values of type 'Date' and so on. Template called 'default' will be used by default.
   * @returns {string|XML}
   */
  m.replaceErrorTemplatePlaceholders = (modelName, spec, val, data, lodashDataPath, appModelPart, templateName) => {
    if (!templateName) {
      const type = appModelPart.type.toLowerCase();
      if (spec.errorMessages[type]) {
        templateName = type;
      }
    }
    if (!spec.errorMessages[templateName]) {
      templateName = 'default';
    }
    // console.log(`REPLACE: val: ${val}, spec: ${JSON.stringify(spec)} data: ${data}`);
    return spec.errorMessages[templateName]
      .replace(/\$val/, getShownVal(appModelPart.type, val))
      .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, p1) => _.get(spec.arguments, p1, `$${p1}`))
      .replace(/#([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, p1) => {
        const argument = _.get(spec.arguments, p1, `#${p1}`);
        // console.log(`REPLACE1: argument: ${argument}`);
        if (argument[0] !== '$') {
          return getShownArgument(appModelPart.type, argument);
        }
        // TODO: refactor and use getShownArgument for code below
        // var pos = lodashDataPath.lastIndexOf('.');
        // var pLodashDataPath = pos > -1 ? lodashDataPath.substr(0, pos + 1) : '';
        // console.log(`REPLACE2: argument: ${argument}, pLodashDataPath: ${pLodashDataPath}, pos: ${pos}`);
        // var pLodashDataPath = lodashDataPath.replace(/\.[^.]*$/, '.');
        const v = _.get(data, m.levelUp(lodashDataPath) + argument.substr(1), `$${argument}`);
        return appModelPart.type === 'Date' ? m.getDatePartString(v) : v; // TODO: UGLY, refactor this
      })
      .replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, p1) => {
        const argument = _.get(spec.arguments, p1, `@${p1}`);
        if (argument[0] !== '$') {
          return getShownArgument(appModelPart.type, argument);
        }
        // TODO: refactor and use getShownArgument for code below

        // var pos = lodashDataPath.lastIndexOf('.');
        // var pLodashDataPath = pos > -1 ? lodashDataPath.substr(0, pos + 1) : '';
        // var pLodashDataPath = lodashDataPath.replace(/\.[^.]*$/, '.');
        let modelPath = `${modelName}.fields.${m.levelUp(lodashDataPath)}${argument.substr(1)}`;
        modelPath = modelPath.replace(/\.\d+\./, '.fields.'); // TODO: this only works for arrays, but not objects, send full model path here
        // console.log(`REPLACE2: modelPath: ${modelPath}, argument: ${argument}, pLodashDataPath: ${pLodashDataPath}, pos: ${pos}, appModel: ${appModel}`);
        return _.get(appLib.appModel.models, `${modelPath}.fullName`, argument);
      })
      .replace(/@@/g, '@')
      .replace(/\$\$/g, '$');
  };

  m.getDateFromAmPmTime = getDateFromAmPmTime;
  m.getAmPmTimeFromDate = getAmPmTimeFromDate;

  /**
   * Used for casting helper(validator, transfromer, etc) arguments which are always strings into value of appropriate type
   * @param val
   * @param appModelPart
   * @param castToType - specify concrete schema type to cast input value. If true it will be casted by appModel type, else left untouched.
   * @returns {*}
   */
  m.getCastedArgumentValue = (val, appModelPart, castToType) => {
    if (!val || !castToType) {
      return val;
    }
    const type = castToType === true ? appModelPart.type : castToType;
    const valType = typeof val;

    if (valType !== 'string') {
      console.warn(`getCastedValue should receive string value instead got ${valType}. Val will be returned as is`);
      return val;
    }

    if (type === 'Date') {
      val = m.getDatePartValue(val);
    } else if (type === 'DateTime') {
      val = new Date(val);
    } else if (type === 'Time') {
      val = m.getDateFromAmPmTime(val);
    } else if (['Number', 'ImperialHeight', 'ImperialWeight', 'ImperialWeightWithOz', 'BloodPressure'].includes(type)) {
      val = Number(val);
    } else if (type === 'Boolean') {
      val = _.includes(['true', 'yes'], val.toLower());
    }
    return val;
  };

  m.levelUp = str => {
    const pos = str.lastIndexOf('.');
    return pos > -1 ? str.substr(0, pos + 1) : '';
  };

  m.getArgumentValue = (spec, lodashSpecPath, data, lodashDataPath, appModelPart, castToType) => {
    let val = _.get(spec, lodashSpecPath);
    if (typeof val === 'string') {
      val = val.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, p1) =>
        _.get(data, m.levelUp(lodashDataPath) + p1, `$${p1}`)
      );
      if (castToType === undefined) {
        castToType = true;
      }
      val = m.getCastedArgumentValue(val, appModelPart, castToType);
    }
    return val;
  };

  /**
   * Used for casting value from retrieved from client
   * @param val
   * @param appModelPart
   * @returns {*}
   */
  m.getCastedValue = (val, appModelPart) => {
    if (!val) {
      return val;
    }
    const { type } = appModelPart;
    const valType = typeof val;

    if (valType === 'string') {
      if (type === 'Date') {
        return m.getDatePartValue(val);
      }
      if (type === 'DateTime') {
        return new Date(val);
      }
      if (type === 'Time') {
        return getTime(val);
      }
    }

    return val;
  };

  /**
   * Extracts the value from the validator argument "str" according to its type
   * @param data
   * @param appModelPart
   * @param lodashPath
   * @param noCasting if true then not attempts to convert to appModelPart.type will be made
   */
  m.getValue = (data, appModelPart, lodashPath, noCasting) => {
    let val = _.get(data, lodashPath);
    if (!noCasting) {
      val = m.getCastedValue(val, appModelPart);
    }
    return val;
  };

  m.getDatePartValue = getDatePartValue;

  m.getDatePartString = getDatePartString;

  return m;
};
