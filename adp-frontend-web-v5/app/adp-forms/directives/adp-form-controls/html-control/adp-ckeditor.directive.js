(function () {
  "use strict";

  angular
    .module('app.adpForms')
    .directive('adpCkeditor', adpCkeditor);

  function adpCkeditor($timeout, CKEDITOR_TOOLBAR) {
    return {
      restrict: 'E',
      scope: {
        ngModel: '=ngModel',
        disabled: '=',
        editorsConfig: '=',
        editorId: '=',
      },
      link: function (scope, elem) {
        elem[0].innerHTML = [
          '<div ',
          'class="adp-html-editor form-control clearfix"',
          'contenteditable="true"',
          'id="' + scope.editorId + '"',
          'adp-qaid-field-control="' + scope.editorId + '"',
          '>'
        ].join(' ')

        scope.$watch('editorsConfig', initEditor);

        function initEditor(config) {
          var oldInstance = getEditorInstance();
          if (oldInstance) {
            oldInstance.destroy();
          }

          var editor = createEditor(getEditorElement(), config);
          bindEvents(editor);
          setStylesForEditor(config);
        }

        function createEditor(editorElem, userConfig) {
          var editorsDefaults = {
            readOnly: scope.disabled,
            resize_enabled: true,
            toolbarCanCollapse: true,
            toolbarStartupExpanded: true,
            removePlugins: 'flash,sourcearea',
            extraPlugins: 'collapse',
            resize_dir: 'both',
            toolbar: CKEDITOR_TOOLBAR,
            resize_minHeight: 300,
            resize_maxHeight: 600,
        };
          var opts = _.assign({}, editorsDefaults, userConfig);

          return CKEDITOR.inline(editorElem, opts);
        }

        function getEditorElement() {
          return elem[0].querySelector('.adp-html-editor');
        }

        function getEditorInstance() {
          return CKEDITOR.instances[scope.editorId];
        }

        function bindEvents(editor) {
          editor.on('instanceReady', function (e) {
            $('.cke_button__sourcedialog_label').hide();
            editor.setData(scope.ngModel() || '');

            $(editor.element.$).css(scope.editorStyles)
          });

          var inputEvents = [
            'input.ckeditor' + scope.editorId,
            'cut.ckeditor' + scope.editorId,
          ].join(' ');

          var editorEl = elem.find('.adp-html-editor');
          editorEl.on(inputEvents, function (e) {
            scope.ngModel($(e.target).html());
          });

          editor.on('change', function () {
            scope.ngModel(editorEl.html());
          });

          editor.on('paste', function (e) {
            scope.ngModel(e.data.dataValue);
          });

          editor.on('blur', function (e) {
            scope.ngModel(e.editor.getData());
          });

          scope.$on('$destroy', function () {
            editor.destroy();
            editorEl.off(inputEvents);
          });
        }

        function setStylesForEditor(config) {
          scope.editorStyles = {};
          if (_.isNumber(config.resize_minHeight)) {
            scope.editorStyles.minHeight = config.resize_minHeight + 'px';
          }

          if (_.isNumber(config.resize_maxHeight)) {
            scope.editorStyles.maxHeight = config.resize_maxHeight + 'px';
          }
        }
      }
    };
  }
})();
