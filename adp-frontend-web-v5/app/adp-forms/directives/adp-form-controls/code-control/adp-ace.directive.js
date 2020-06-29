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
          bindEvents(config.mode);

          var initialValue = isJsonMode(config.mode) ?
            JSON.stringify(ngModel.$viewValue, null, 4) :
            ngModel.$viewValue;

          editorsInstance.session.setValue(initialValue);
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

        function bindEvents(mode) {
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
                isJsonMode(mode) ?
                  setJsonValue(ngModel, newValue) :
                  ngModel.$setViewValue(newValue);
              });
            }
          });

          // https://stackoverflow.com/a/10667290/4575370
          session.on('changeAnnotation', function (){
            var valid = editor.getSession().getAnnotations().length === 0;
            ngModel.$setValidity('syntaxCodeEditorError', valid);
          });

          scope.$on('$destroy', function () {
            editor.destroy();
          });
        }

        function isJsonMode(mode) {
          return mode === 'ace/mode/json';
        }
        function setJsonValue(mode, value) {
          var parsed = _.attempt(function(jsonString) {
            return JSON.parse(jsonString);
          }, value);

          if (_.isError(parsed)) {
            return;
          }

          ngModel.$setViewValue(parsed);
        }
      }
    };
  }
})();
