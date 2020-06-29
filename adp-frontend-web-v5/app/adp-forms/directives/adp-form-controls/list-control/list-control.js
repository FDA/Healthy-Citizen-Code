;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('listControl', listControl);

  function listControl(
    AdpValidationUtils,
    AdpFieldsService,
    AdpListsService,
    AdpUnifiedArgs
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/list-control/list-control.html',
      require: '^^form',
      link: function (scope, element) {
        (function init() {
          scope.args = unifiedApproachArgs();
          scope.config = getConfig(scope.args);
          scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
          scope.isMultiple = scope.field.type.includes('[]');

          bindWatcher(scope.field);
        })();

        function getConfig(args) {
          var defaults = getDefaults(args);
          return AdpFieldsService.configFromParameters(args.modelSchema, defaults);
        }

        function getDefaults(args) {
          return {
            valueExpr: 'value',
            displayExpr: 'label',
            elementAttr: {
              class: 'adp-select-box',
              id: 'list_id_' + args.modelSchema.fieldName,
            },
            showClearButton: true,
            dataSource: AdpListsService.getDataSource(args),
            onOpened: function (e) {
              var ds = getDataSource();
              (ds instanceof DevExpress.data.DataSource) && ds.reload();
            }
          };
        }

        function getInstance() {
          var componentName = scope.isMultiple ? 'dxTagBox' : 'dxSelectBox';
          return DevExpress.ui[componentName].getInstance(element.find('[ng-model]'));
        }

        function getDataSource() {
          var instance = getInstance();
          return instance.option('dataSource');
        }

        function bindWatcher(field) {
          if (field.dynamicList) {
            return;
          }

          scope.$watch(
            function () { return scope.isRequired() },
            function (newVal) {
              var keys = _.keys(field.list);
              var hasSingleValue = _.keys(keys).length === 1;

              if (newVal && hasSingleValue) {
                var singleValue = keys[0];
                var valueToAssign = scope.isMultiple ? [singleValue] : singleValue;

                getInstance().option('value', valueToAssign);
              }
            }
          );
        }

        function unifiedApproachArgs() {
          var formParams = scope.validationParams.formParams;

          return AdpUnifiedArgs.getHelperParamsWithConfig({
            path: formParams.path,
            formData: formParams.row,
            action: formParams.action,
            schema: formParams.modelSchema,
          });
        }
      }
    }
  }
})();
