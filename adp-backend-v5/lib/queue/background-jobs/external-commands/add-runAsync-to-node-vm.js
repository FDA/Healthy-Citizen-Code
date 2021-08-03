const { NodeVM } = require('vm2');
const vm = require('vm');
const nodePath = require('path');

// Add 'runAsync' method based on 'run' method to catch errors from async context
NodeVM.prototype.runAsync = async function (code, filename) {
  const resolvedFilename = filename ? nodePath.resolve(filename) : null;
  const dirname = resolvedFilename ? nodePath.dirname(resolvedFilename) : null;
  const unresolvedFilename = filename || 'vm.js';
  const script = new vm.Script(
    `
  (async function (exports, require, module, __filename, __dirname) {
    ${this._compiler(code, unresolvedFilename)}
  })`,
    {
      filename: unresolvedFilename,
      displayErrors: true,
    }
  );

  try {
    const module = this._internal.Contextify.makeModule();
    const closure = script.runInContext(this._context, { displayErrors: true });
    const returned = await closure.call(
      this._context,
      module.exports,
      this._prepareRequire(dirname),
      module,
      resolvedFilename,
      dirname
    );
    return this._internal.Decontextify.value(this.options.wrapper === 'commonjs' ? module.exports : returned);
  } catch (e) {
    throw this._internal.Decontextify.value(e);
  }
};
