import { convertSingle } from './convert-single';
import {
  OptionConversionError,
  ConfigurationError,
} from '../../../lib/exceptions';

function expectedErrorMessage(name, expectedValue, actualValue) {
  return `Can\'t interpret widget option from data-attribute from "${name}": expected "${expectedValue}", got "${actualValue}".`;
}

describe('Attributes options type conversion', () => {
  test(
    'Should convert option to Number',
    () => {
      const optionsParams = {
        name: 'name',
        value: '12',
        schema: { type: 'Number' },
      };
      const actual = convertSingle(optionsParams);
      const expected = 12;

      expect(actual).toBe(expected);
    }
  );

  test(
    'Should throw OptionConversionError, trying to convert option to Number',
    () => {
      const optionsParams = {
        name: 'name',
        value: 'a12',
        schema: { type: 'Number' },
      };

      const convertWithError = () => convertSingle(optionsParams);
      const expectedMessage = expectedErrorMessage('name', 'Number', 'a12', );
      expect(convertWithError).toThrowError(expectedMessage);
      expect(convertWithError).toThrowError(OptionConversionError);
    }
  );

  test(
    'Should convert option to String[]',
    () => {
      const optionsParams = {
        name: 'name',
        value: 'a,b,c',
        schema: { type: 'String[]' },
      };

      const actual = convertSingle(optionsParams);
      expect(actual).toStrictEqual(['a', 'b', 'c']);
    }
  );

  test(
    'Should throw OptionConversionError, trying to convert option to String[]',
    () => {
      const optionsParams = {
        name: 'name',
        value: 12,
        schema: { type: 'String[]' },
      };

      const convertWithError = () => convertSingle(optionsParams);
      const expectedMessage = expectedErrorMessage('name', 'String[]', '12');
      expect(convertWithError).toThrowError(expectedMessage);
      expect(convertWithError).toThrowError(OptionConversionError);
    }
  );

  test(
    'Should not convert String type',
    () => {
      const optionsParams = {
        name: 'name',
        value: 'value',
        schema: { type: 'String' },
      };
      const actual = convertSingle(optionsParams);
      const expected = 'value';

      expect(actual).toBe(expected);
    }
  );

  test(
    'Should throw error, trying to convert option to UnknownType',
    () => {
      const optionsParams = {
        name: 'name',
        value: 'value',
        schema: { type: 'UnknownType' },
      };

      const convertWithError = () => convertSingle(optionsParams);
      const expectedMessage = `Cannot find "type" validator with name "UnknownType"`;
      expect(convertWithError).toThrowError(expectedMessage);
      expect(convertWithError).toThrowError(ConfigurationError);
    }
  );
});
