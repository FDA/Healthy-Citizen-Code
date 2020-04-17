;(function () {
  'use strict';

  angular.module('app.adpForms', [
    'ngMessages',
    'ui.bootstrap.datetimepicker',
    'ngTagsInput'
  ]);

  angular
    .module('app.adpForms')
    .config(function () {
      CKEDITOR.disableAutoInline = true;
      ace.config.set('workerPath', 'lib/ace-builds/src-noconflict');
      addCollapseButtonToCkeditor();
    });

  function addCollapseButtonToCkeditor() {
    var pluginName = 'collapse';

    CKEDITOR.plugins.add(pluginName, {
      init: function (editor) {
        if (!_.isArray(editor.config.toolbar)) {
          return;
        }

        var hasCollapseButton = _.find(editor.config.toolbar, function (group) {
          return _.find(group.items, function (i) {
            return i === 'Collapse';
          });
        });

        if (!hasCollapseButton) {
          return;
        }

        editor.ui.addButton('Collapse', {
          label: 'Show more buttons',
          command: 'CollapseAction',
          icon: 'Collapse',
          className: 'cke_button__moretools',
        });

        editor.addCommand('CollapseAction', {
          exec: function () {
            toggleButtons(editor);
          }
        });
      }
    });

    function toggleButtons(editor) {
      var selector = '#cke_' + editor.name + ' .cke_toolbar_last';
      $(document.querySelector(selector)).nextAll().toggle();
      $('#cke_' + editor.name + ' .cke_button__moretools .cke_button_icon').toggleClass('collapsed');
    }
  }
})();
