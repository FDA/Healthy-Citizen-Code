;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arrayControl', arrayControl);

  function arrayControl(
    AdpValidationUtils,
    AdpFieldsService,
    AdpFormService,
    visibilityUtils,
    Guid,
    AdpUnifiedArgs
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/array-control/array-control.html',
      require: '^^form',
      link: function (scope, element, attrs, formCtrl) {
        scope.schemaFields = AdpFieldsService.getFormFields(scope.field.fields).notGrouped;
        scope.visibilityStatus = [];
        scope.form = formCtrl;
        scope.rootForm = AdpFormService.getRootForm(scope.form);
        scope.errorCount = [];

        var formParams = {
          path: scope.validationParams.formParams.path,
          row: scope.validationParams.formParams.row,
          modelSchema: scope.validationParams.formParams.modelSchema,
          action: scope.validationParams.formParams.action,
          visibilityMap: scope.validationParams.formParams.visibilityMap,
          requiredMap: scope.validationParams.formParams.requiredMap,
        };

        // DEPRECATED: will be replaced with formParams
        // validationParams fields naming is wrong, use formParams instead
        // modelSchema - grouped fields
        // schema - original ungrouped schema
        scope.nextValidationParams = {
          field: scope.field,
          fields: scope.schemaFields,
          formData: scope.adpFormData,
          modelSchema: scope.adpFields,
          schema: scope.validationParams.schema.fields[scope.field.fieldName],
          $action: scope.validationParams.$action,

          formParams: formParams
        };

        setKeysToAssociativeArray();
        setIdsToData();
        setDefaultDisplay();

        scope.display = function(index) {
          var arrayItemPath = formParams.path + '[' + index + ']';
          return formParams.visibilityMap[arrayItemPath];
        };

        function setDisplay(index, value) {
          var arrayItemPath = formParams.path + '[' + index + ']';
          formParams.visibilityMap[arrayItemPath] = value;
        }

        scope.getData = getData;
        scope.isEmpty = isEmpty;
        scope.addArrayItem = addArrayItem;
        scope.remove = remove;
        scope.isRemoveDisabled = isRemoveDisabled;
        scope.getPath = getPath;
        scope.showMoveToTop = showMoveToTop;
        scope.moveToTop = moveToTop;

        scope.guid = Guid.create;

        scope.onStop = function(event) {
          swapVisibilityStatus(event.newIndex, event.oldIndex);
        }

        scope.onSorted = function updateOrder(event) {
          swap(getData(), event.newIndex, event.oldIndex);
        };

        scope.hasVisibleItems = function () {
          return visibilityUtils.arrayHasVisibleChild(getData(), scope.validationParams);
        };

        scope.getHeader = function (index) {
          var args = AdpUnifiedArgs.getHelperParamsWithConfig({
            path: formParams.path,
            action: formParams.action,
            formData: formParams.row,
            schema: formParams.modelSchema,
          });
          args.index = index;

          return AdpFieldsService.getHeaderRenderer(args);
        };

        scope.getFields = getFields;
        scope.toggle = function (event, index) {
          event.preventDefault();
          event.stopPropagation();

          scope.visibilityStatus[index] = !scope.visibilityStatus[index];
        };

        if (scope.isEmpty()) {
          setData([]);
          addArrayItem();
        }

        scope.$watch(
          function () { return angular.toJson(scope.form); },
          function () {
            if (scope.rootForm.$submitted) {
              scope.errorCount = getData().map(function (_v, i) {
                var formName = scope.field.fieldName + '[' + i + ']';
                var formToCount = scope.form[formName];
                return AdpFormService.countErrors(formToCount);
              });
            }
          });

        function setDefaultDisplay() {
          var data = getData();

          _.each(data, function (_v, i) {
            setDisplay(i, true)
          });
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }

        function isEmpty() {
          var data = getData();
          return _.isNil(data) || _.isEmpty(data);
        }

        function addArrayItem() {
          var fieldData = getData();
          fieldData.push({
            _id: Guid.create(),
          });

          var lastIndex = _.findLastIndex(fieldData);
          setDisplay(lastIndex, true);
        }

        function remove(event, index) {
          event.preventDefault();
          getData().splice(index, 1);
          scope.visibilityStatus.splice(index, 1);
        }

        function getFields() {
          return scope.schemaFields;
        }

        function isRemoveDisabled() {
          // kind of hack: checking if first element is required
          var requiredMap = formParams.requiredMap;
          var path = formParams.path + '[0]';
          var isFirstRequired = requiredMap[path];
          var hasOneItem = getData().length === 1;

          return isFirstRequired && hasOneItem;
        }

        function getPath() {
          return formParams.path;
        }

        function setKeysToAssociativeArray() {
          if (scope.field.type === 'AssociativeArray') {
            scope.adpFormData[scope.field.fieldName] = _.map(scope.adpFormData[scope.field.fieldName], function (item, key) {
              var newItem = _.clone(item);
              newItem.$key = key;
              return newItem;
            });
          }
        }

        function setIdsToData() {
          if (_.isArray(scope.adpFormData[scope.field.fieldName])) {
            scope.adpFormData[scope.field.fieldName] = _.map(scope.adpFormData[scope.field.fieldName], function (item) {
              item._id = Guid.create();
              return item;
            })
          }
        }

        function swapVisibilityStatus(newIndex, oldIndex) {
          var lhs = scope.visibilityStatus[oldIndex];
          var rhs = scope.visibilityStatus[newIndex];
          if (lhs === rhs) {
            return;
          }

          swap(scope.visibilityStatus, oldIndex, newIndex);
        }

        function swap(list, newIndex, oldIndex) {
          var tmp = list[oldIndex];
          list[oldIndex] = list[newIndex];
          list[newIndex] = tmp;
        }

        function showMoveToTop(index) {
          if (index === 0) {
            return false;
          }

          return getData().length > 1;
        }

        function moveToTop(event, index) {
          event.preventDefault();

          moveToFirstPosition(getData());
          moveToFirstPosition(scope.visibilityStatus);

          function moveToFirstPosition(list) {
            var itemToMove = list.splice(index, 1)[0];
            list.unshift(itemToMove);
          }
        }
      }
    }
  }
})();
