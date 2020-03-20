const _ = require('lodash');

module.exports = function (_source) {
  let source = _source;
  let parts;

  if (!(parts = source.match(/^[;\s]{0,}\(function\s{0,}\(\)\s{0,}{(.*?)}\)\(\);\s{0,}$/s))) {
    console.error('FATAL: Module seems to be not a ADP module: ', this.resourcePath);
    console.log(source);
    return source;
  }
  source = parts[1];

  const angularModuleReg = /angular\s{0,}\.\s{0,}module\s{0,}\((.*?)\)([^;]+)/s;

  if (!(parts = source.match(angularModuleReg))) {
    console.error('FATAL: Cannot find Angular module declarations in: ', this.resourcePath);
    return source;
  }

  const moduleExport = '/** ADPEXPORT **/\nmodule.exports = {\n' +
    _.compact(parts[2].split(/\.\s{0,}(?=factory|controller|directive)/)
      .map(
        line => line.trim().replace(/^(\w+)\(\s{0,}['"](\w+)['"]\,(.*?)\)$/,
          (m, type, name, func) => name + ':' + func + (type === 'factory' ? '()' : '') + ` /* ${type} */`,
        ),
      ))
      .join(',\n')
    + '\n}';

  return source.replace(angularModuleReg, moduleExport);
};
