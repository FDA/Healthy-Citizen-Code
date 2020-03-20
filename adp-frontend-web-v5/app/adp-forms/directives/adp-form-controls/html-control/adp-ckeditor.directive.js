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
        disabled: '=disabled',
        config: '=config',
        editorId: '=editorId',
      },
      link: function (scope, elem) {
        elem[0].innerHTML = '<div class="editor" contenteditable="true" id="' + scope.editorId + '">';
        init();
        addWatchers();

        function init() {
          var editor = enableEditor(getEditorElement());
          bindEvents(editor);
        }

        function enableEditor(editorElem) {
          var editorsDefaults = {
            readOnly: scope.disabled,
            resize_enabled: true,
          };
          var config = _.assign({}, editorsDefaults, scope.config);

          return CKEDITOR.inline(editorElem, config);
        }

        function getEditorElement() {
          return elem[0].querySelector('.editor');
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
            console.log('onChange')
          });

          editor.on('focus', function (e) {
            if (scope.ngModel !== e.editor.getData()) {
              editor.setData(scope.ngModel);
            }

            console.log('focus')
          });

          editor.on('key', function (e) {
            $timeout(function () {
              scope.ngModel = e.editor.getData();
              onChange(e.editor.getData());
              console.log('key change')
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
