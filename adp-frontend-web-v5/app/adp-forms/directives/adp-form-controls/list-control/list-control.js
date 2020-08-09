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
      link: function (scope, element, attrs, formCtrl) {
        (function init() {
          scope.args = unifiedApproachArgs();
          scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
          scope.isMultiple = scope.field.type.includes('[]');

          bindWatcher(scope.field);

          (function init() {
            var config = getConfig(scope.args);
            element.find('div')[getWidgetName()](config);

            scope.$on('$destroy', function () {
              scope.instance.dispose();
            });
          })();
        })();

        function getConfig(args) {
          var defaults = getDefaults(args);
          return AdpFieldsService.configFromParameters(args.fieldSchema, defaults);
        }

        function getDefaults(args) {
          return {
            value: scope.adpFormData[scope.field.fieldName] || null,
            onInitialized: function(e) {
              scope.instance = e.component;
            },
            valueExpr: 'value',
            displayExpr: 'label',
            elementAttr: {
              class: 'adp-select-box',
              id: 'list_id_' + args.fieldSchema.fieldName,
            },
            showClearButton: true,
            dataSource: AdpListsService.getDataSource(args),
            onOpened: function (e) {
              var ds = getDataSource();
              (ds instanceof DevExpress.data.DataSource) && ds.reload();
            },
            onValueChanged: function (e) {
              scope.adpFormData[scope.field.fieldName] = e.value;
              setAngularFormProps();
            },
          };
        }

        function getInstance() {
          return DevExpress.ui[getWidgetName()].getInstance(element.find('div'));
        }

        function getWidgetName() {
          return scope.isMultiple ? 'dxTagBox' : 'dxSelectBox';
        }

        function getDataSource() {
          var instance = getInstance();
          return instance.option('dataSource');
        }

        function setAngularFormProps() {
          var formField = formCtrl[scope.field.fieldName];

          !formField.$dirty && formField.$setDirty();
          !formField.$touched && formField.$setTouched();
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
