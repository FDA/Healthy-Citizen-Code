import { convertOptions } from './convert/convert';
import { validateOptions } from './validate/validate-parameters';
import { ConfigurationError } from '../../lib/exceptions';
import { generateConfigurationErrorMessage } from './utils/error.utils';
import { flattenSchema, pickOptionsInSchema } from './utils/options.utils';

/**
 * TEMP
 * Merge options for widgets, that does NOT support WM-less mode.
 *
 * @param {Object} wmOptions
 * @param {DOMStringMap} attributeOptions
 * @param {Object} optionsSchema
 *
 * @return {Object}
 */
export function mergeOptions({ wmOptions = {}, attributeOptions = {} }) {
  const { udid, fhirId, fhirDataUrl } = attributeOptions;
  return { udid, fhirId, fhirDataUrl, ...wmOptions };
}

/**
 * @param {Object} options
 * @param {Object} optionsSchema
 *
 * @throws ConfigurationError
 *
 * @return {Object}
 */
export function validateOptionsBySchema(options, optionsSchema) {
  const compiledSchema = compileSchema(options, optionsSchema);
  const optionsInSchema = pickOptionsInSchema(options, compiledSchema);

  const [convertedOptions, conversionErrors] = convertOptions(optionsInSchema, compiledSchema);
  const [validatedOptions, validationErrors] = validateOptions(convertedOptions, compiledSchema);

  handleErrorsAndLogWarnings(conversionErrors, validationErrors);

  return validatedOptions;
}

function compileSchema(options, optionsSchema) {
  return flattenSchema(options, optionsSchema);
}

function handleErrorsAndLogWarnings(conversionErrors, validationErrors) {
  throwErrorAndShowForUser(validationErrors);
  logWarnings(conversionErrors.concat(validationErrors));
}

function throwErrorAndShowForUser(errors) {
  const treatAsErrors = errors.filter(err => err.schema.required);
  if (!treatAsErrors.length) {
    return;
  }

  const names = treatAsErrors.map(e => `"${e.optionName}"`).join(', ');
  const message = generateConfigurationErrorMessage(names);

  throw new ConfigurationError(message);
}

function logWarnings(warnings) {
  if (!warnings.length) {
    return;
  }

  warnings.forEach(warning => { console.warn(warning); });
}
