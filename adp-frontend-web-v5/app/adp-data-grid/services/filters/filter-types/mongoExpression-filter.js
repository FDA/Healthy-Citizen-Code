;(function () {
  "use strict";

  window.ace.require("mongodb-ace-mode/index");
  window.ace.require("mongodb-ace-theme");

  angular
    .module("app.adpDataGrid")
    .factory("MongoExpressionFilter", MongoExpressionFilter);

  /** @ngInject */
  function MongoExpressionFilter(
    AdpFieldsService,
    DxEditorMixin,
    CustomFilterTypesValidatorService
  ) {
    return function () {
      return DxEditorMixin({
        editorName: "dxTextArea",

        create: function (params) {
          var options = {
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: false,
            enableSnippets: true,
            maxLines: 10,
            minLines: 4,
          };
          var initialValue = params.args.data;
          var $editorEl = $("<div class='adp-mongo-editor'>").text(initialValue);
          var $validationEl = $("<div class='adp-mongo-validation'>");
          var aceEditor = window.ace.edit($editorEl[0]);

          aceEditor.setTheme("ace/theme/mongodb");
          aceEditor.session.setMode("ace/mode/mongodb");
          aceEditor.setOptions(options);

          this.element = $("<div>")
            .addClass("adp-custom-type-value-controller adp-mongo-expression-box")
            .on("remove", function () {
              aceEditor && aceEditor.destroy();
            })
            .append($editorEl)
            .append($validationEl);

          aceEditor.session.on("change", function () {
            var value = aceEditor.getValue();
            var fakeEvent = {value:value};

            doValidation($validationEl, value);

            params.onValueChanged(fakeEvent);
          });

          if (initialValue) {
            doValidation($validationEl, initialValue);
          }

          function doValidation($elem, value){
            var rule = {message: ""};

            if (value) {
              CustomFilterTypesValidatorService(params.schema.schemaName, "Mongo Expression", value, rule)
                .then(
                  function (isValid) {
                    $elem.text(rule.message)
                                 .toggleClass("adp-is-invalid", !isValid)
                  })
            }
          }
        }
      });
    };

  }
})();
