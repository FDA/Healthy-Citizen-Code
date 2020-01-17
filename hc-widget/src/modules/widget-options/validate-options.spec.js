import { validateOptionsBySchema } from './validate-options';
import { ConfigurationError } from '../../lib/exceptions';

function getConsoleWarnMessages(messages) {
  const originalWarn = global.console.warn;

  return jest.spyOn(console, 'warn').mockImplementation((...args) => {
    args.forEach(warn => { messages.push(warn.message) });
    originalWarn(...args);
  });
}

describe('Combined function for validation and merging widgets option', () => {
  test('Should merge options from attributes and Widget Manager', () => {
    const attributeOptions = {
      a: '12',
      b: 'a,b,c',
      c: 'string',
    };

    const schema = {
      a: { type: 'Number' },
      b: { type: 'String[]' },
      c: { type: 'String' },
    };

    const actual = validateOptionsBySchema(attributeOptions, schema);
    const expected = {
      a: 12,
      b: ['a', 'b', 'c'],
      c: 'string',
    };
    expect(actual).toStrictEqual(expected);
  });

  test('Should throw ConfigurationError for empty options', () => {
    const attributeOptions = {
      b: ['a' , 'b', 'c'],
      c: 'string',
    };

    const schema = {
      a: { type: 'Number', required: true },
      b: { type: 'String[]' },
      c: {
        type: 'String',
        required: true,
        validate: { list: ['a', 'b', 'c'] }
      },
    };

    const shouldThrow = () => validateOptionsBySchema(attributeOptions, schema);

    expect(shouldThrow).toThrow(ConfigurationError);

    const optionsWithErrors = '"a", "c"';
    expect(shouldThrow).toThrow(`Incorrect widget configuration. Please contact this website\'s administrator and ask to provide correct required parameters: ${optionsWithErrors} in the widget loading code.`);
  });

  test('Should warn about invalid options', () => {
    const schema = {
      b: {
        type: 'String',
        validate: { list: ['a', 'b', 'c'] }
      },
    };

    let actualMessages = [];
    const spy = getConsoleWarnMessages(actualMessages);
    validateOptionsBySchema({ b: 'notInlist' }, schema);

    const expectedMessages = [
      'Can\'t interpret widget option from data-attribute from "b": expected "one of a, b, c", got "notInlist".'
    ];
    expect(actualMessages).toStrictEqual(expectedMessages);
    spy.mockRestore();
  });

  test(
    'Should validate only values in that match compiled schema',
    () => {
      const schema = {
        root: {
          type: 'String',
          requires: {
            select1: {
              value1: { type: 'String[]' },
              value2: { type: 'Number' },
            },
            select2: {
              value1: { type: 'Number' },
              value2: { type: 'String[]' },
            },
          }
        }
      };

      const attributeOptions = {
        root: 'select2',
        value1: 12,
        value2: '1,2,3',
      };

      const actual = validateOptionsBySchema(attributeOptions, schema);
      const expected = {
        root: 'select2',
        value1: 12,
        value2: ['1', '2', '3'],
      };
      expect(actual).toStrictEqual(expected);
    }
  )
});
