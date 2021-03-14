const _ = require('lodash');

/**
 * posthtml plugin. Remove attrs which name starts with regex or matches string.
 * @param attrMatchers
 * @return {function(*): void}
 */
module.exports = (attrMatchers = []) => {
  const matcherFns = {
    string: (string, match) => string === match,
    regex: (string, regex) => regex.test(string),
  };

  return (tree) => {
    tree.walk((node) => {
      const result =_.omitBy(node.attrs, (val, name) => {
        return attrMatchers.some((matcher) => {
          const matcherFn = typeof matcher === 'string' ? 'string' : 'regex';
          return matcherFns[matcherFn](name, matcher);
        });
      });

      result && (node.attrs = result);

      return node;
    });
  };
};
