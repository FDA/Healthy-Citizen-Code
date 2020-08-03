;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('NumberArrayEditorConfig', NumberArrayEditorConfig);

  /** @ngInject */
  function NumberArrayEditorConfig(StringArrayEditorConfig) {
    return function (initialValue, onValueChangeCb) {
      var baseConfig = StringArrayEditorConfig(initialValue, onValueChangeCb);

      var prevCb = baseConfig.onValueChanged;
      baseConfig.onValueChanged = function (e) {
        prevCb(e);
        setComponentClass(e);
      }

      var numberEditorConfig = {
        onInitialized: setComponentClass,
        tagTemplate: tagTemplate,
      };

      return _.merge(baseConfig, numberEditorConfig);
    }

    function setComponentClass(e) {
      var value = e.component.option('value');
      e.element.toggleClass('not-empty', !_.isEmpty(value));
    }

    function tagTemplate(data, tagElement) {
      var component = this;
      var removeBtn = $('<div class="dx-tag-remove-button">');

      removeBtn.on('click', function () {
        var ids = component.option('value');
        _.remove(ids, function (id) {
          return id === data.id;
        });

        component.option('value', ids);
        removeBtn.off('click');
      });

      $('<div class="dx-tag-content">')
        .append(data.label, removeBtn)
        .appendTo(tagElement);
    }
  }
})();
