import { validate } from './validate';
import {ConfigurationError, OptionValidationError} from '../../../lib/exceptions';

function expectedErrorMessage(name, expectedValue, actualValue) {
  return `Can\'t interpret widget option from data-attribute from "${name}": expected "${expectedValue}", got "${actualValue}".`;
}

describe('Options validation for single option', () => {
  test('Should pass validation for non empty value', () => {
    const optionsParams = {
      name: 'name',
      value: 12,
      schema: { type: 'Number' },
    };

    const actual = validate(optionsParams);
    const expected = 12;
    expect(actual).toBe(expected);
  });

  test('Should fail validation for non Number value', () => {
    const optionsParams = {
      name: 'name',
      value: 's',
      schema: { type: 'Number' },
    };
    const shouldThrow = () => validate(optionsParams);

    expect(shouldThrow).toThrow(OptionValidationError);
    const expectedMessage = expectedErrorMessage('name', 'Number', 's');
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should fail validation for empty String value', () => {
    const optionsParams = {
      name: 'name',
      value: '',
      schema: { type: 'String' },
    };
    const shouldThrow = () => validate(optionsParams);

    expect(shouldThrow).toThrow(OptionValidationError);
    const expectedMessage = expectedErrorMessage('name', 'not empty String', '');
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should fail validation for non String value', () => {
    const optionsParams = {
      name: 'name',
      value: ['a', 'b'],
      schema: { type: 'String' },
    };
    const shouldThrow = () => validate(optionsParams);

    expect(shouldThrow).toThrow(OptionValidationError);
    const expectedMessage = expectedErrorMessage('name', 'not empty String', ['a', 'b']);
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should fail validation for non String[] value', () => {
    const optionsParams = {
      name: 'name',
      value: 12,
      schema: { type: 'String[]' },
    };
    const shouldThrow = () => validate(optionsParams);

    expect(shouldThrow).toThrow(OptionValidationError);
    const expectedMessage = expectedErrorMessage('name', 'Array', 12);
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should fail validation for String[] if has non-string inside', () => {
    const optionsParams = {
      name: 'name',
      value: ['a', 1, 'b'],
      schema: { type: 'String[]' },
    };
    const shouldThrow = () => validate(optionsParams);

    expect(shouldThrow).toThrow(OptionValidationError);
    const expectedMessage = expectedErrorMessage('name', 'Array of strings', ['a', 1, 'b']);
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should pass validation for "list" rule', () => {
    const optionsParams = {
      name: 'name',
      value: 12,
      schema: {
        type: 'Number',
        validate: {
          list: [4, 6, 8, 10, 12, 14],
        }
      },
    };

    const actual = validate(optionsParams);
    const expected = 12;
    expect(actual).toBe(expected);
  });

  test('Should fail validation for "list" rule', () => {
    const list = [4, 6, 8, 10, 14];
    const optionsParams = {
      name: 'name',
      value: 12,
      schema: {
        type: 'Number',
        validate: { list },
      },
    };

    const shouldThrow = () => validate(optionsParams);
    expect(shouldThrow).toThrow(OptionValidationError);

    const oneOf = `one of ${list.join(', ')}`;
    const expectedMessage = expectedErrorMessage('name', oneOf, 12);
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should fail validation for option with "String[]" type and "list" validation rule', () => {
    const list = [4, 6, 8, 10, 14];
    const value = [2, 8];
    const optionsParams = {
      name: 'name',
      value,
      schema: {
        type: 'Number',
        validate: { list },
      },
    };

    const shouldThrow = () => validate(optionsParams);
    expect(shouldThrow).toThrow(OptionValidationError);

    const expectedMessage = expectedErrorMessage('name', 'Number', value);
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should pass validation for option with type "String[]" "list" rule', () => {
    const list = ['4', '6', '8', '10', '14'];
    const value = ['4', '6', '8'];
    const optionsParams = {
      name: 'name',
      value,
      schema: {
        type: 'String[]',
        validate: { list },
      },
    };

    const actual = validate(optionsParams);
    expect(actual).toBe(value);
  });

  test('Should throw "ConfigurationError" for unknown validation rule', () => {
    const unknownRule = 'unknownRule';
    const optionsParams = {
      name: 'name',
      value: 12,
      schema: {
        type: 'Number',
        validate: { unknownRule },
      },
    };

    const shouldThrow = () => validate(optionsParams);
    expect(shouldThrow).toThrow(ConfigurationError);
    expect(shouldThrow).toThrow(`Unknown validation rule "${unknownRule}"`);
  });

  test('Should pass validation for "regex" rule', () => {
    const regex = "^\\d+$";
    const schema = { type: 'String', validate: { regex } };
    const optionsParams = {
      name: 'a',
      value: '12',
      schema,
    };

    const actual = validate(optionsParams);
    const expected = '12';
    expect(actual).toBe(expected);
  });

  test('Should fail validation for "regex" rule', () => {
    const regex = "^\\d+$";
    const optionsParams = {
      name: 'a',
      value: '12a',
      schema: { type: 'String', validate: { regex }  },
    };

    const shouldThrow = () => validate(optionsParams);
    expect(shouldThrow).toThrow(OptionValidationError);
    const expectedMessage = expectedErrorMessage('a', `to match regex ${regex}`, '12a');
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should fail validation for "regex" rule against list of values', () => {
    const regex = "^\\d+$";
    const optionsParams = {
      name: 'a',
      value: ['12', '12a', '12333'],
      schema: { type: 'String[]', validate: { regex }  },
    };

    const shouldThrow = () => validate(optionsParams);
    expect(shouldThrow).toThrow(OptionValidationError);
    const expectedMessage = expectedErrorMessage('a', `to match regex ${regex}`, '12,12a,12333');
    expect(shouldThrow).toThrow(expectedMessage);
  });

  test('Should pass validation for "pattern: url"', () => {
    const optionsParams = {
      name: 'a',
      value: 'http://google.eu',
      schema: { type: 'String', validate: { pattern: 'url' } },
    };

    const actual = validate(optionsParams);
    const expected = 'http://google.eu';
    expect(actual).toBe(expected);
  });

  test('Should fail validation for "pattern: url"', () => {
    const optionsParams = {
      name: 'a',
      value: 'google.eu',
      schema: { type: 'String', validate: { pattern: 'url' } },
    };

    const shouldThrow = () => validate(optionsParams);
    const expectedMessage = expectedErrorMessage('a', `URL`, 'google.eu');

    expect(shouldThrow).toThrow(OptionValidationError);
    expect(shouldThrow).toThrow(expectedMessage);
  });
});
