(function () {
  "use strict";

  angular
    .module('app.adpForms')
    .directive('adpAce', adpAce);

  function adpAce(
    PythonEditorMode,
    Json5onEditorMode,
    adpAceJshintOptions
  ) {
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
          setOptions(editorsInstance, config);
          bindEvents(config.mode);
          setMode(config.mode);

          if (isJsonMode(config.mode)) {
            (ngModel.$viewValue !== '') && editorsInstance.session.setValue(JSON5.stringify(ngModel.$viewValue, null, 4));
          } else {
            editorsInstance.session.setValue(ngModel.$viewValue);
          }
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

          var modes = {
            'ace/mode/python': PythonEditorMode,
            'ace/mode/json5': Json5onEditorMode,
          };
          // ace caches session, { path, v } allows to force set mode
          // details: https://stackoverflow.com/a/22175976/4575370
          var defaultMode = { path: mode, v: Date.now() };

          var selectedMode = !!modes[mode] ? (new modes[mode]()) : defaultMode;
          editorsInstance.session.setMode(selectedMode);
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
                  setJsonValue(newValue) :
                  ngModel.$setViewValue(newValue);
              });
            }
          });

          // https://stackoverflow.com/a/10667290/4575370
          session.on('changeAnnotation', function () {
            var valid = editor.getSession().getAnnotations().length === 0;
            ngModel.$setValidity('syntaxCodeEditorError', valid);
          });

          scope.$on('$destroy', function () {
            editor.destroy();
          });

          session.on('changeMode', function () {
            if ('ace/mode/javascript' !== session.getMode().$id) {
              return;
            }

            session.$worker && session.$worker.send('setOptions', [adpAceJshintOptions]);
          });
        }

        function isJsonMode(mode) {
          return mode === 'ace/mode/json5';
        }

        function setJsonValue(value) {
          if (!value) {
            ngModel.$setViewValue(null);
            return;
          }

          var parsed = _.attempt(JSON5.parse, value);
          if (_.isError(parsed)) {
            return;
          }

          ngModel.$setViewValue(parsed);
        }
      }
    };
  }
})();
