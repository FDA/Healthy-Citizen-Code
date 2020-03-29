(function () {
  "use strict";

  angular
    .module('app.adpForms')
    .directive('adpCkeditor', adpCkeditor);

  function adpCkeditor($timeout) {
    return {
      restrict: 'E',
      scope: {
        ngModel: '=ngModel',
        disabled: '=',
        editorsConfig: '=',
        editorId: '=',
      },
      link: function (scope, elem) {
        elem[0].innerHTML =
          '<div class="adp-html-editor form-control" contenteditable="true" id="' + scope.editorId + '">';
        scope.$watch('editorsConfig', initEditor);
        addWatchers();

        function initEditor(config) {
          var oldInstance = getEditorInstance();
          if (oldInstance) {
            oldInstance.destroy();
          }

          var editor = createEditor(getEditorElement(), config);
          bindEvents(editor);
        }

        function createEditor(editorElem, userConfig) {
          var editorsDefaults = {
            readOnly: scope.disabled,
            resize_enabled: true,
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

        function onChange(data) {
          if(scope.change && typeof scope.change === 'function'){
            scope.change(data);
          }
        }

        function bindEvents(editor) {
          editor.on('change', function (e) {
            $timeout(function () {
              scope.ngModel = e.editor.getData();
            });

            onChange(e.editor.getData());
          });

          editor.on('focus', function (e) {
            if (scope.ngModel !== e.editor.getData()) {
              editor.setData(scope.ngModel);
            }
          });

          editor.on('key', function (e) {
            $timeout(function () {
              scope.ngModel = e.editor.getData();
              onChange(e.editor.getData());
            }, 0);
          });

          scope.$on('$destroy', function () {
            editor.destroy();
          });
        }

        function addWatchers() {
          scope.$watch('ngModel', function (value) {
            var editor = getEditorInstance();
            if (!editor) {
              return;
            }

            if(value !== editor.getData()){
              editor.setData(value || '');
            }
          });
        }
      }
    };
  }
})();
