import { forEachInObject } from '../../../lib/utils/utils';
import { ConfigurationError } from '../../../lib/exceptions';
import { rules, errorsForRules } from './rules'
import { validateType } from './types';

export function validate(optionParams) {
  validateType(optionParams);
  validateRules(optionParams);

  return optionParams.value;
}

function validateRules(optionParams) {
  const { validate } = optionParams.schema;
  if (validate === undefined) {
    return;
  }

  forEachInObject(validate, (ruleOption, ruleName) => {
    const ruleFn = rules[ruleName];
    if (ruleFn === undefined) {
      throw new ConfigurationError(`Unknown validation rule "${ruleName}"`);
    }

    const isValid = applyRule(optionParams, ruleFn);
    if (!isValid) {
      throwErrorForRule(optionParams, ruleName);
    }
  });
}

function applyRule(optionParams, ruleFn) {
  if (isArrayType(optionParams.schema.type)) {
    return applyRuleForEveryItem(optionParams, ruleFn);
  } else {
    return ruleFn(optionParams);
  }
}

function applyRuleForEveryItem(optionParams, ruleFn) {
  return optionParams.value.every(v => ruleFn({ ...optionParams, value: v }));
}

function throwErrorForRule(optionParams, ruleName) {
  const throwErrorFn = errorsForRules[ruleName];
  throwErrorFn(optionParams);
}

/**
 * @param {String} type
 * @return {boolean}
 */
function isArrayType(type) {
  return /.+\[\]$/.test(type);
}
