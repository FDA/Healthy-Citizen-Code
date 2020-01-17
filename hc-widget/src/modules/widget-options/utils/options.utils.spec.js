import { pickOptionsInSchema, flattenSchema } from './options.utils';
import { ConfigurationError } from '../../../lib/exceptions';

describe('Options utils', () => {
  test('Should pick only fields in schema', () => {
    const schema = {
      a: { type: 'Number' }
    };
    const options = {
      a: '120',
      b: 'random',
    };

    const actualOptions = pickOptionsInSchema(options, schema);
    expect(actualOptions).toStrictEqual({ a: '120' });
  });

  test('Should flatten fields for schema with "requires" property', () => {
    const schema = {
      a: {
        type: 'String',
        requires: {
          value1: {
            b: { type: 'String[]' },
          },
          value2: {
            c: { type: 'Number' },
          },
        }
      }
    };
    const options = {
      a: 'value1'
    };

    const actualSchema = flattenSchema(options, schema);
    const expectedSchema = {
      a: { type: 'String' },
      b: { type: 'String[]' },
    };
    expect(actualSchema).toStrictEqual(expectedSchema);
  });

  test(
    'Should throw error ConfigurationError, when field value does not match any key "requires" prop',
    () => {
      const schema = {
        a: {
          type: 'String',
          requires: {
            value1: {
              b: { type: 'String[]' },
            },
            value2: {
              c: { type: 'Number' },
            },
          }
        }
      };
      const options = {
        a: 'value3'
      };

      const shouldThrow = () => flattenSchema(options, schema);
      const message = 'Option "a" value should be one of "value1, value2", got "value3".';
      expect(shouldThrow).toThrow(new ConfigurationError(message));
    }
  );
});
