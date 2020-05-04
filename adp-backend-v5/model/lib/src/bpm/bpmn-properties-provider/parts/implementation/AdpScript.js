'use strict';

var utils = require('bpmn-js-properties-panel/lib/Utils'),
  escapeHTML = utils.escapeHTML;

module.exports = function (scriptValuePropName, isFormatRequired, translate) {

  return {
    template:
      '<div class="bpp-row">' +
      '<label for="cam-script-val">' + escapeHTML(translate('Expression')) + '</label>' +
      '<div class="bpp-field-wrapper">' +
      '<textarea id="cam-script-val" type="text" name="scriptValue"></textarea>' +
      '</div>' +
      '</div>',

    get: function (element, bo) {
      var values = {};
      var boScript = bo.get(scriptValuePropName);

      values.scriptValue = boScript;

      return values;
    },

    set: function (element, values) {
      var scriptValue = values.scriptValue;
      var update = {};

      update[scriptValuePropName] = scriptValue || '';
      update.scriptFormat = 'Javascript';

      return update;
    }
  };
};
