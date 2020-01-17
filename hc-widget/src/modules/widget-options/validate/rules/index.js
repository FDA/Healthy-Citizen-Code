import { throwOptionValidationError } from '../../utils/error.utils';
import { ConfigurationError } from '../../../../lib/exceptions';
import { get } from '../../../../lib/utils/utils';

function validateList(optionParams) {
  const { list } = optionParams.schema.validate;
  return list.includes(optionParams.value);
}

function validateRegex(optionParams) {
  const { regex } = optionParams.schema.validate;
  const regexToMatch = new RegExp(regex);
  return regexToMatch.test(optionParams.value);
}

export const rules = {
  list: validateList,
  regex: validateRegex,
  pattern: validatePattern
};

function validatePattern(optionParams) {
  const patterns = {
    'url': urlPattern
  };
  const { pattern } = optionParams.schema.validate;
  const patternFn = patterns[pattern];

  if (patternFn === undefined) {
    const patternsList = Object.keys(patterns).join(', ');
    const message = `Pattern with name ${pattern} not found. Available patterns: ${patternsList}`;
    throw new ConfigurationError(message);
  }

  return patternFn(optionParams.value);
}

function urlPattern(value) {
  // https://stackoverflow.com/a/17773849/4575370
  const regExp = /^https?:\/\/([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/gi;
  return regExp.test(value);
}

function listError(optionParams) {
  const { list } = optionParams.schema.validate;
  const stringList = `one of ${list.join(', ')}`;

  throwOptionValidationError(optionParams, stringList);
}

function regexError(optionParams) {
  const { regex } = optionParams.schema.validate;
  const stringList = `to match regex ${regex}`;

  throwOptionValidationError(optionParams, stringList);
}

function patternError(optionParams) {
  const expectedTexts = {
    'url': 'URL'
  };
  const pattern = get(optionParams, 'schema.validate.pattern');
  const expected = expectedTexts[pattern];

  throwOptionValidationError(optionParams, expected);
}

export const errorsForRules = {
  list: listError,
  regex: regexError,
  pattern: patternError
};
