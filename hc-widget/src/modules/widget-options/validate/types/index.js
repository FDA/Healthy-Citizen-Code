import { throwOptionValidationError } from '../../utils/error.utils';
import {
  isString,
  isArray,
  isNumber
} from '../../../../lib/utils/utils';
import {ConfigurationError} from '../../../../lib/exceptions';

const types = {
  'String': checkString,
  'String[]': checkArrayOfStrings,
  'Number': checkNumber,
  'Boolean': checkBoolean
};

export function validateType(optionParams) {
  const { type } = optionParams.schema;
  if (type === undefined) {
    throw new ConfigurationError(`Property "type" is missing from option "${optionParams.name}".`);
  }
  const validator = types[type];

  validator(optionParams);
}

function checkString(optionParams) {
  const { value } = optionParams;
  const notString = !isString(value);

  if (notString || value === '') {
    throwOptionValidationError(optionParams, 'not empty String');
  }
}

function checkArrayOfStrings(optionParams) {
  const { value } = optionParams;

  if (!isArray(value)) {
    throwOptionValidationError(optionParams, 'Array');
  }

  const hasOnlyStringsInside = value.every(isString);

  if (!hasOnlyStringsInside) {
    throwOptionValidationError(optionParams, 'Array of strings');
  }
}

function checkNumber(optionParams) {
  const { value } = optionParams;

  if (!isNumber(value)) {
    throwOptionValidationError(optionParams, 'Number');
  }
}

function checkBoolean(optionParams) {
  const { value } = optionParams;

  if (typeof value !== 'boolean') {
    throwOptionValidationError(optionParams, 'Boolean');
  }
}
