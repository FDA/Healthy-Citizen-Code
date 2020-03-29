(function () {
  "use strict";

  angular
    .module('app.adpForms')
    .directive('adpAce', adpAce);

  function adpAce(PythonEditorMode) {
    return {
      restrict: 'E',
      scope: {
        editorsConfig: '=',
        editorId: '=',
      },
      require: 'ngModel',
      link: function (scope, element, attrs, ngModel) {
        setHtmlForEditor();

        function getEditor() {
          return editorsInstance;
        }

        var editorsInstance = null;
        scope.$watch('editorsConfig', initEditor);

        function initEditor(config) {
          if (editorsInstance !== null) {
            editorsInstance.destroy();
          }

          editorsInstance = enableEditor();
          setMode(config.mode);
          setOptions(editorsInstance, config);
          bindEvents();

          editorsInstance.session.setValue(ngModel.$viewValue);
        }

        function setHtmlForEditor() {
          element[0].innerHTML = '<pre id="' + scope.editorId + '">\n</pre>';
        }

        function enableEditor() {
          var editorElement = element[0].querySelector('#' + scope.editorId);
          return window.ace.edit(editorElement);
        }

        function setOptions(editor, userConfig) {
          var defaults = {
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: false,
            enableSnippets: true,
            maxLines: 30,
            minLines: 10,
            useSoftTabs: true,
            autoScrollEditorIntoView: true,
          };

          var opts = _.assign({}, defaults, userConfig);

          editor.setOptions(opts);
        }

        function setMode(editorsMode) {
          var mode = editorsMode || 'ace/mode/python';
          if (mode === 'ace/mode/python') {
            mode = new PythonEditorMode();
          }

          editorsInstance.session.setMode(mode);
        }

        function bindEvents() {
          var editor = getEditor();
          var session = editor.session;

          session.on('change', function () {
            var newValue = session.getValue();

            if (ngModel && newValue !== ngModel.$viewValue &&
              // HACK make sure to only trigger the apply outside of the
              // digest loop 'cause ACE is actually using this callback
              // for any text transformation !
              !scope.$$phase && !scope.$root.$$phase) {
              scope.$evalAsync(function () {
                ngModel.$setViewValue(newValue);
              });
            }
          });

          scope.$on('$destroy', function () {
            editor.destroy();
          });
        }
      }
    };
  }
})();
