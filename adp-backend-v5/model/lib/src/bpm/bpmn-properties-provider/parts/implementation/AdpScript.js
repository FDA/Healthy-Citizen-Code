'use strict';

var utils = require('bpmn-js-properties-panel/lib/Utils'),
  escapeHTML = utils.escapeHTML;

module.exports = function (scriptValuePropName, isFormatRequired, translate) {

  return {
    template: function (className, label) {
      return '' +
        '<div class="bpp-row">' +
        '<label for="cam-script-format">' + escapeHTML(translate('Format')) + '</label>' +
        '<div class="bpp-field-wrapper">' +
        '<select id="cam-script-type" name="scriptFormat" data-value>' +
        '<option value="Javascript" selected>' + escapeHTML(translate('Javascript')) + '</option>' +
        '</select>' +
        '</div>' +
        '</div>' +
        '<div class="bpp-row ' + className + '">' +
        '<label for="cam-script-val">' + escapeHTML(translate(label)) + '</label>' +
        '<div class="bpp-field-wrapper ' + className + '">' +
        '<textarea id="cam-script-val" type="text" name="scriptValue"></textarea>' +
        '</div>' +
        '</div>'
    },

    get: function (element, bo) {
      var values = {};

      values.scriptValue = bo.get(scriptValuePropName);
      values.scriptFormat = bo.get('scriptFormat');

      return values;
    },

    set: function (element, values) {
      var scriptValue = values.scriptValue;
      var update = {};

      update[scriptValuePropName] = scriptValue || '';
      update.scriptFormat = values.scriptFormat;

      return update;
    }
  };
};
