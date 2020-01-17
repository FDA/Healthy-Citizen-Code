import {
  forEachInObject,
  pickFromObject,
  hasIn,
  pick,
} from '../../../lib/utils/utils';
import {ConfigurationError} from '../../../lib/exceptions';

export function pickOptionsInSchema(options, optionsSchema) {
  return pickFromObject(
    options,
    (_o, optionName) => hasIn(optionName, optionsSchema)
  );
}

export function flattenSchema(options, schema) {
  const newSchema = {};

  forEachInObject(schema, (optionSchema, name) => {
    newSchema[name] = pick(optionSchema, 'type', 'required', 'validate');
    const optionsSubset = getSchemaSubset(name, options, schema);

    if (optionSchema) {
      Object.assign(newSchema, optionsSubset);
    }
  });

  return newSchema;
}

function getSchemaSubset(name, options, schema) {
  const optionSchema = schema[name];
  const { requires } = optionSchema;
  if (requires === undefined) {
    return;
  }

  checkSubsetErrors(name, options, schema);
  return getSubsetOfOptions(name, options, schema);
}

function checkSubsetErrors(name, options, schema) {
  const optionSchema = schema[name];
  const { requires } = optionSchema;

  const optionValue = options[name];
  if (!hasIn(optionValue, requires)) {
    const list = Object.keys(requires).join(', ');
    const message = `Option "${name}" value should be one of "${list}", got "${optionValue}".`;
    throw new ConfigurationError(message);
  }
}

function getSubsetOfOptions(name, options, schema) {
  const optionValue = options[name];
  const optionSchema = schema[name];
  const { requires } = optionSchema;

  return requires[optionValue];
}
