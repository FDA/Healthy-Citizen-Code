import Handlebars from 'handlebars/runtime';
import sanitize from 'sanitize-html-x';
import lodashIsArray from 'lodash.isarray';

const helpers = [
  {
    name: 'sanitize',
    fn: function (text) {
      const textParsed = lodashIsArray(text) ? text.join('') : text;
      const sanitizeOptions = {
        allowedTags: [
          'a',
          'img',
          'b', 'i', 'u',
          'table', 'thead', 'tbody', 'tr', 'td', 'th',
          'p', 'quote', 'hr', 'br'
        ],
        allowedAttributes: {
          'img': ['src', 'width', 'height'],
          'a': ['href', 'target']
        },
      };

      const sanitizedHTML = sanitize(textParsed, sanitizeOptions);
      return new Handlebars.SafeString(sanitizedHTML);
    }
  },
  {
    name: 'times',
    fn: function (n, block) {
      let result = '';
      for (let i = 0; i < n; ++i) {
        block.data.index = i;
        block.data.first = i === 0;
        block.data.last = i === (n - 1);

        result += block.fn(i);
      }

      return result;
    }
  },
  {
    name: 'for',
    fn: function(from, to, data, block) {
      let acc = '', inc = 1;
      let keys;
      if (!lodashIsArray(data)) {
        keys = Object.keys(data);
      }

      for(let i = from; i < to; i += inc) {
        block.data.index = i;
        block.data.first = i === 0;

        if (lodashIsArray(data)) {
          block.data.current =  data[i];
        } else {
          let key = keys[i];
          block.data.current =  data[key];
          block.data.key =  key;
        }

        acc += block.fn(i);
      }

      return acc;
    }
  },
  {
    name: 'xif',
    fn: function (v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
          return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
          return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
          return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
          return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
          return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
          return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
          return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
          return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
          return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    }
  },
  {
    name: 'inc',
    fn: (v) => v + 1
  },
  {
    name: 'dashcase',
    fn: (value) => value.split(/\s/).map(i => i.toLowerCase()).join('-')
  }
];

export default function registerHandlebarsHelpers() {
  helpers.forEach(helper => Handlebars.registerHelper(helper.name, helper.fn))
};