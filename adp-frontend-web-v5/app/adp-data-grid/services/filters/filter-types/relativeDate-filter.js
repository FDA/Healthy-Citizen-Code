;(function () {
  "use strict";

  angular
    .module("app.adpDataGrid")
    .factory("RelativeDateFilter", RelativeDateFilter);

  /** @ngInject */
  function RelativeDateFilter(
    AdpFieldsService,
    CustomFilterTypesValidatorService,
    DxEditorMixin
  ) {
    return function () {
      return DxEditorMixin({
        editorName: "dxTextBox",

        create: function (params) {
          var options = getOptions(params);

          this.element = $("<div>");
          this.element[this.editorName](options)
            .dxValidator({
              validationRules: getValidators(params)
            });
        },
      });
    };

    function getOptions(params) {
      return {
        onValueChanged: params.onValueChanged,
        value: params.args.data,
        valueChangeEvent: "blur input",
        placeholder: params.placeholder,
        elementAttr: {
          class: "adp-custom-type-value-controller adp-relative-date-text-box"
        },
      }
    }

    function getValidators(params) {
      return [{
        type: "async",
        message: "",
        validationCallback: function (event) {
          var valueToValidate = [params.dataField, params.filterOperation, event.value];

          return CustomFilterTypesValidatorService(params.args.modelSchema.schemaName, "Relative Date", valueToValidate, event.rule);
        }
      }]
    }
  }
})();
