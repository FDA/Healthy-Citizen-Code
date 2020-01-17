import { forEachInObject } from '../../../lib/utils/utils';
import { validate } from './validate';
import { OptionValidationError } from '../../../lib/exceptions';

/**
 *
 * @param options
 * @param optionsSchema
 *
 * result - options that pass validation check
 * errors - Object containing OptionValidationError
 * @return {[{result}, [OptionValidationError]]}
 */
export function validateOptions(options, optionsSchema) {
  const result = {};
  const errors = [];

  forEachInObject(optionsSchema, (schema, name) => {
    try {
      const value = options[name];
      validate({ value, name, schema });
      result[name] = value;
    } catch (err) {
      handleError(err, errors);
    }
  });

  return [result, errors];
}

function handleError(err, errors) {
  if (err instanceof OptionValidationError) {
    errors.push(err);
  } else {
    throw err;
  }
}
