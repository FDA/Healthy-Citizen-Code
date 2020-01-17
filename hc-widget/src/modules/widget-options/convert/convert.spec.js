import { convertOptions } from './convert';
import { ConfigurationError } from '../../../lib/exceptions';

describe('Options conversion', () => {
  test(
    'Should pick and convert only options from Schema',
    () => {
      const schema = {
        a: { type: 'Number' }
      };
      const options = {
        a: '120',
        b: 'random',
      };

      const [actualValues, actualErrors] = convertOptions(options, schema);
      expect(actualValues).toStrictEqual({ a: 120 });
      expect(actualErrors).toStrictEqual([]);
    }
  );

  test(
    'Should convert all types',
    () => {
      const schema = {
        a: { type: 'Number' },
        b: { type: 'String[]' },
        c: { type: 'String' },
      };
      const options = {
        a: '120',
        b: 'a,b,c',
        c: 'c'
      };

      const [actualValues, actualErrors] = convertOptions(options, schema);
      const expected = {
        a: 120,
        b: ['a', 'b', 'c'],
        c: 'c'
      };

      expect(actualValues).toStrictEqual(expected);
      expect(actualErrors).toStrictEqual([]);
    }
  );

  test(
    'Should return errors for each option',
    () => {
      const schema = {
        convertsToNan: { type: 'Number' },
        stringExpected: { type: 'String[]' },
      };
      const options = {
        convertsToNan: 'a120',
        stringExpected: [1],
      };

      const [actualValues, actualErrors] = convertOptions(options, schema);
      expect(actualValues).toStrictEqual({});

      const expectedMessages = [
        'Can\'t interpret widget option from data-attribute from "convertsToNan": expected "Number", got "a120".',
        'Can\'t interpret widget option from data-attribute from "stringExpected": expected "String[]", got "1".',
      ];
      const actualErrorMessages = actualErrors.map(e => e.message);
      expect(actualErrorMessages).toStrictEqual(expectedMessages);
    }
  );

  test(
    'Should throw error, trying to convert option to UnknownType',
    () => {
      const schema = {
        a: { type: 'Number' },
        b: { type: 'UnknownType' },
        c: { type: 'String[]' },
      };
      const options = {
        a: 'a120',
        b: 'someString',
        c: 'a,b,c',
      };

      const shouldThrow = () => convertOptions(options, schema);
      const expectedMessage = 'Cannot find "type" validator with name "UnknownType"';

      expect(shouldThrow).toThrowError(expectedMessage);
      expect(shouldThrow).toThrowError(ConfigurationError);
    }
  );
});
