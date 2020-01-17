import {
  OptionConversionError,
  OptionValidationError,
} from '../../../lib/exceptions';

export function throwOptionConversionError(optionsParams, expected) {
  const errorOptions = getErrorsOptions(optionsParams, expected);
  const message = generateMessage(errorOptions);
  throw new OptionConversionError(message, errorOptions);
}

export function throwOptionValidationError(optionsParams, expected) {
  const errorOptions = getErrorsOptions(optionsParams, expected);
  const message = generateMessage(errorOptions);
  throw new OptionValidationError(message, errorOptions);
}

function getErrorsOptions(optionsParams, expected) {
  const { value, schema, name } = optionsParams;
  return {
    actual: value, expected,
    schema, name,
  };
}

export function generateMessage(errorOptions) {
  const { name, actual, expected } = errorOptions;

  return `Can't interpret widget option from data-attribute from "${name}": expected "${expected}", got "${actual}".`;
}

export function generateConfigurationErrorMessage(names) {
  return `Incorrect widget configuration. Please contact this website's administrator and ask to provide correct required parameters: ${names} in the widget loading code.`;
}
