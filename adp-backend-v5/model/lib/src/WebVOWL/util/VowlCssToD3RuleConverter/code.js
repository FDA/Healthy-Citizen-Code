const css = require('css');
const fs = require('fs');

const filePath = '../../src/webvowl/css/vowl.css';

fs.readFile(filePath, { encoding: 'utf8' }, function(err, data) {
  if (err) {
    console.log(err);
  } else {
    console.log('// inline vowl styles');
    console.log(convertCssToD3Rules(data));
    console.log('\n// remove inline vowl styles');
    console.log(createInlineStyleRemoveCommand(data));
  }
});

function createInlineStyleRemoveCommand(cssText) {
  let selectors = [];
  const obj = css.parse(cssText);
  const { rules } = obj.stylesheet;

  rules.forEach(function(rule) {
    if (rule.type === 'rule') {
      selectors = selectors.concat(rule.selectors);
    }
  });

  return 'd3.selectAll("'.concat(selectors.join(', '), '")');
}

function convertCssToD3Rules(cssText) {
  let d3Rules = '';
  const obj = css.parse(cssText);
  const { rules } = obj.stylesheet;

  rules.forEach(function(rule) {
    if (rule.type === 'rule') {
      const builder = d3RuleBuilder();
      const { selectors } = rule;
      const { declarations } = rule;
      let declaration;

      builder.selectors(selectors);
      for (let i = 0, l = declarations.length; i < l; i++) {
        declaration = declarations[i];
        if (declaration.type === 'declaration') {
          builder.addRule(declaration.property, declaration.value);
        }
      }

      d3Rules = d3Rules.concat(builder.build(), '\n');
    }
  });

  return d3Rules;
}

function d3RuleBuilder() {
  const builder = {};
  let selector = '';
  const rules = [];

  builder.selectors = function(selectors) {
    if (!arguments.length) return selector;

    if (selectors instanceof Array) {
      selector = selectors.join(', ');
    } else {
      selector = selectors;
    }

    return builder;
  };

  builder.addRule = function(name, value) {
    rules.push({ name, value });
    return builder;
  };

  builder.build = function() {
    let result = `setStyleSensitively("${selector}", [`;

    for (let i = 0, l = rules.length; i < l; i++) {
      if (i > 0) {
        result = result.concat(', ');
      }
      const rule = rules[i];
      result = result.concat('{name:"', rule.name, '", value:"', rule.value, '"}');
    }
    result = result.concat(']);');

    return result;
  };

  return builder;
}
