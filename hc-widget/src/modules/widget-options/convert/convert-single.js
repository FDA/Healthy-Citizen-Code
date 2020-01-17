import { ConfigurationError } from '../../../lib/exceptions';
import { throwOptionConversionError } from '../utils/error.utils';
import { isArray, isString } from '../../../lib/utils/utils';

const types = {
  'Number': (optionParams) => {
    const converted = Number(optionParams.value);

    if (Number.isNaN(converted)) {
      throwOptionConversionError(optionParams, 'Number');
    }

    return converted;
  },
  'String[]': (optionParams) => {
    const { value } = optionParams;

    if (isArray(value) && value.every(isString)) {
      return value;
    }

    if (!isString(value)) {
      throwOptionConversionError(optionParams, 'String[]');
    }

    return value.split(',');
  },
  'Boolean': (optionParams) => {
    const { value } = optionParams;

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    throwOptionConversionError(optionParams, 'Boolean');
  },
  'String': skipConversion,
};

export function convertSingle(optionParams) {
  const { type } = optionParams.schema;
  if (!type) console.log(optionParams);
  const typeFn = types[type];

  if (typeFn === undefined) {
    throw new ConfigurationError(`Cannot find "type" validator with name "${type}"`);
  }

  return typeFn(optionParams);
}

function skipConversion(optionParams) {
  return optionParams.value;
}
