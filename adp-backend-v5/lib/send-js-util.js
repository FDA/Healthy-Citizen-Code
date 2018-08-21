const _ = require('lodash');

module.exports = function (appLib) {
  const m = {};

  /* This returns processed .js files for the client side */
  m.getJsPrefix = (name) => {
    return 'if (\'undefined\' === typeof _) {_ = require(\'lodash\');}' +
      'if (\'undefined\' === typeof appModelHelpers) {appModelHelpers = {};};' +
      `if ('undefined' === typeof appModelHelpers['${name}']) {appModelHelpers['${name}'] = {};};appModelHelpers['${name}']={\n`;
  };

  m.getJsObjectString = (obj) => {
    let items = [];
    for (let i in obj) {
      if ('function' === typeof obj[i]) {
        items.push(`"${i}": ${obj[i].toString()}`);
      } else {
        items.push(`"${i}": ${JSON.stringify(obj[i])}`);
      }
    }
    return items.join(',\n');
  };

  m.sendJavascript = (res, body, next) => {
    res.writeHead(200, {'Content-Type': 'application/javascript'});
    res.write(body);
    res.end();
    next();
  };

  /**
   * Returns string representing all code for the application as a string
   */
  m.getAppModelCodeStr = (req) => {
    return '' +
      m.getJsPrefix('Renderers') + m.getJsObjectString(appLib.appModelHelpers.Renderers) + '};' +
      m.getJsPrefix('CustomActions') + m.getJsObjectString(appLib.appModelHelpers.CustomActions) + '};' +
      m.getJsPrefix('FormRenderers') + m.getJsObjectString(appLib.appModelHelpers.FormRenderers) + '};' +
      m.getJsPrefix('LabelRenderers') + m.getJsObjectString(appLib.appModelHelpers.LabelRenderers) + '};' +
      'vutil={' + m.getJsObjectString(appLib.appModelHelpers.ValidatorUtils) + '};' +
      m.getJsPrefix('Validators') + m.getJsObjectString(appLib.appModelHelpers.Validators) + '};'
      ;
  };

  return m;
};
