;(function () {
  "use strict";

  angular
    .module("app.adpDataGrid")
    .factory("DatabaseFieldFilter", DatabaseFieldFilter);

  /** @ngInject */
  function DatabaseFieldFilter(
    AdpFieldsService,
    DxEditorMixin,
    CustomFilterTypesValidatorService
  ) {
    return function () {
      return DxEditorMixin({
        editorName: "dxSelectBox",

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
      var items = params.args.modelSchema.fields;

      items = _.filter(items, function (item) {
        return item.showInDatatable && item.fieldName !== params.dataField
      });
      items = _.map(items, function (item) {
        return {
          value: item.fieldName,
          text: item.fullName
        }
      })

      return {
        items: items,
        onValueChanged: params.onValueChanged,
        value: params.args.data,
        valueExpr: "value",
        displayExpr: "text",
        valueChangeEvent: "blur input",
        placeholder: params.placeholder,
        elementAttr: {
          class: "adp-custom-type-value-controller adp-database-field-text-box"
        },
      }
    }

    function getValidators(params) {
      return [{
        type: "async",
        message: "",
        validationCallback: function (event) {
          var valueToValidate = [params.dataField, params.filterOperation, event.value];

          return CustomFilterTypesValidatorService(params.args.modelSchema.schemaName, "Database Field", valueToValidate, event.rule);
        }
      }]
    }
  }
})();
