import { forEachInObject } from '../../../lib/utils/utils';
import { convertSingle } from './convert-single';
import { OptionConversionError } from '../../../lib/exceptions';

/**
 * @param {DOMStringMap} options
 * @param {Object} optionsSchema
 *
 * @return {[{result}, [OptionConversionError]]}
 */
export function convertOptions(options, optionsSchema) {
  return convertForEachInSchema(options, optionsSchema);
}

function convertForEachInSchema(options, optionsSchema) {
  const errors = [];
  const result = {};

  forEachInObject(optionsSchema, (schema, name) => {
    try {
      const value = options[name];
      result[name] = convertSingle({ value, name, schema });
    } catch (err) {
      handleError(err, errors);
    }
  });

  return [result, errors];
}

function handleError(err, errors) {
  if (err instanceof OptionConversionError) {
    errors.push(err);
  } else {
    throw err;
  }
}
