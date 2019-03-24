// const _ = require('lodash');

module.exports = appLib => {
  const m = {};

  /* This returns processed .js files for the client side */
  m.getJsPrefix = name =>
    "if ('undefined' === typeof _) {_ = require('lodash');}" +
    "if ('undefined' === typeof appModelHelpers) {appModelHelpers = {};};" +
    `if ('undefined' === typeof appModelHelpers['${name}']) {appModelHelpers['${name}'] = {};};appModelHelpers['${name}']={\n`;

  m.getJsObjectString = obj => {
    const items = [];
    for (const i in obj) {
      if (typeof obj[i] === 'function') {
        items.push(`"${i}": ${obj[i].toString()}`);
      } else {
        items.push(`"${i}": ${JSON.stringify(obj[i])}`);
      }
    }
    return items.join(',\n');
  };

  m.sendJavascript = (res, body) => {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.write(body);
    res.end();
  };

  /**
   * Returns string representing all code for the application as a string
   */
  m.getAppModelCodeStr = () =>
    `
    ${m.getJsPrefix('Renderers') + m.getJsObjectString(appLib.appModelHelpers.Renderers)}};
    
    ${m.getJsPrefix('CustomActions')}${m.getJsObjectString(appLib.appModelHelpers.CustomActions)}};
    
    ${m.getJsPrefix('FormRenderers')}${m.getJsObjectString(appLib.appModelHelpers.FormRenderers)}};
    
    ${m.getJsPrefix('LabelRenderers')}${m.getJsObjectString(
      appLib.appModelHelpers.LabelRenderers
    )}};
    
    ${m.getJsPrefix('Validators')}${m.getJsObjectString(appLib.appModelHelpers.Validators)}};
    
    ${m.getJsPrefix('HeaderRenderers')}${m.getJsObjectString(
      appLib.appModelHelpers.HeaderRenderers
    )}};
    
    ${m.getJsPrefix('LookupLabelRenderers')}${m.getJsObjectString(
      appLib.appModelHelpers.LookupLabelRenderers
    )}};
    
    vutil={${m.getJsObjectString(appLib.appModelHelpers.ValidatorUtils)}};
    `;

  return m;
};
