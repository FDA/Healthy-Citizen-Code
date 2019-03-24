;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arrayControl', arrayControl);

  function arrayControl(
    AdpValidationService,
    AdpFieldsService,
    AdpFormService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/array-control/array-control.html',
      require: '^^form',
      link: function (scope, element, attrs, formCtrl) {
        scope.fields = AdpFieldsService.getFormFields(scope.field.fields).notGrouped;
        scope.visibilityStatus = [];
        scope.form = formCtrl;
        scope.rootForm = AdpFormService.getRootForm(scope.form);
        scope.errorCount = [];

        var formParams = scope.validationParams.formParams;

        // DEPRECATED: will be replaced with formParams
        // validationParams fields naming is wrong, use formParams instead
        // modelSchema - grouped fields
        // schema - original ungrouped schema
        scope.nextValidationParams = {
          field: scope.field,
          fields: scope.fields,
          formData: scope.adpFormData,
          modelSchema: scope.adpFields,
          schema: scope.validationParams.schema.fields[scope.field.keyName],
          $action: scope.validationParams.$action,

          formParams: formParams
        };
        setDefautDisplay();

        scope.display = function(index) {
          var arrayItemPath = formParams.path + '[' + index + ']';
          return formParams.visibilityMap[arrayItemPath];
        };

        function setDisplay(index, value) {
          var arrayItemPath = formParams.path + '[' + index + ']';
          formParams.visibilityMap[arrayItemPath] = value;
        }

        var requiredFn = AdpValidationService.isRequired(scope.validationParams);

        scope.getData = getData;
        scope.setData = setData;
        scope.isEmpty = isEmpty;
        scope.addArrayItem = addArrayItem;
        scope.remove = remove;
        scope.isRemoveDisabled = isRemoveDisabled;

        scope.getHeader = function (index) {
          var params = {
            fieldData: getData(),
            formData: scope.adpFormData,
            fieldSchema: scope.field,
            index: index
          };

          return AdpFieldsService.getHeaderRenderer(params);
        };

        scope.getFields = getFields;
        scope.toggle = function (event, index) {
          event.preventDefault();
          event.stopPropagation();

          scope.visibilityStatus[index] = !scope.visibilityStatus[index];
        };

        if (scope.isEmpty()) {
          scope.setData([]);
          addArrayItem();
        }

        scope.$watch(
          function () { return angular.toJson(scope.form); },
          function () {
            if (scope.rootForm.$submitted) {
              scope.errorCount = getData().map(function (_v, i) {
                var formToCount = scope.form[scope.field.keyName + i];
                var counter = AdpFormService.countErrors(formToCount);

                return counter;
              });
            }
          });

        function setDefautDisplay() {
          var data = getData();

          _.each(data, function (_v, i) {
            setDisplay(i, true)
          });
        }

        function getData() {
          return scope.adpFormData[scope.field.keyName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.keyName] = value;
        }

        function isEmpty() {
          var data = getData();

          return _.isUndefined(data) || _.isNull(data) || _.isEmpty(data);
        }

        function addArrayItem() {
          var fieldData = getData();
          fieldData.push({});

          var lastIndex = _.findLastIndex(fieldData);
          setDisplay(lastIndex, true);
        }

        function remove(event, index) {
          event.preventDefault();

          var fieldData = getData();
          fieldData.splice(index, 1);
          scope.visibilityStatus.splice(index, 1);
        }

        function getFields() {
          return scope.fields;
        }

        function isRemoveDisabled() {
          return requiredFn() && getData().length === 1;
        }
      }
    }
  }
})();
