import { validateOptions } from './validate-parameters';

describe('Options validation', () => {
  test(
    'Should pass "a" options and fail for "b"',
    () => {
      const schema = {
        'a': { type: 'Number' },
        'b': { type: 'String' },
      };

      const options = {
        'a': 120,
        'b': undefined,
        'c': 'string'
      };

      const [actualValues, actualErrors] = validateOptions(options, schema);
      expect(actualValues).toStrictEqual({ 'a': 120 });

      const actualErrorMessages = actualErrors.map(e => e.message);
      expect(actualErrorMessages).toStrictEqual([
        'Can\'t interpret widget option from data-attribute from "b": expected "not empty String", got "undefined".'
      ]);
    }
  );

  test(
    'Should validate only options in schema',
    () => {
      const schema = {
        'a': { type: 'Number' },
      };
      const options = {
        'a': 120,
        'c': 'string'
      };

      const [actualValues, actualErrors] = validateOptions(options, schema);
      expect(actualValues).toStrictEqual({ 'a': 120 });

      const actualErrorMessages = actualErrors.map(e => e.message);
      expect(actualErrorMessages).toStrictEqual([]);
    }
  );
});