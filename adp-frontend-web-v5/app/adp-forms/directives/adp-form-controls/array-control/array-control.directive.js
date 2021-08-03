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
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/array-control/array-control.html',
      require: '^^form',
      link: function (scope, element, attrs, formCtrl) {
        var getterSetter = ControlSetterGetter(scope.args);
        scope.arrayFields = AdpFieldsService.getFormFields(scope.args.fieldSchema.fields).notGrouped;
        scope.field = scope.args.fieldSchema;

        scope.visibilityStatus = [];
        scope.form = formCtrl;
        scope.rootForm = AdpFormService.getRootForm(scope.form);
        scope.errorCount = [];

        setKeysToAssociativeArray();
        setIdsToData();
        setDefaultDisplay();

        if (isEmpty()) {
          setData([]);
          addArrayItem();
        }

        scope.getErrorCnt = function (index) {
          return AdpFormService.getErrorCounter(scope.formContext.errorCount, scope.args, index);
        };

        scope.display = function(index) {
          var arrayItemPath = scope.args.path + '[' + index + ']';
          return scope.formContext.visibilityMap[arrayItemPath];
        };

        function setDisplay(index, value) {
          var arrayItemPath = scope.args.path + '[' + index + ']';
          scope.formContext.visibilityMap[arrayItemPath] = value;
        }

        scope.addArrayItem = addArrayItem;
        scope.remove = remove;
        scope.isRemoveDisabled = isRemoveDisabled;
        scope.showMoveToTop = showMoveToTop;
        scope.showMoveToBottom = showMoveToBottom;
        scope.moveToTop = moveToTop;
        scope.moveToBottom = moveToBottom;

        scope.guid = Guid.create;

        scope.sortableCfg = {
          axis: 'y',
          'ui-floating': false,
          handle: '> .subform-frame > .subform-frame__title',
          start: function (event, ui) {
            $(this).attr('data-previndex', ui.item.index());

            ui.item.addClass('draggable-mirror');
            ui.placeholder.css({ display: 'block' });
          },
          stop: function (event, ui) {
            var newIndex = ui.item.index();
            var oldIndex = $(this).attr('data-previndex');

            var list = scope.visibilityStatus;
            var b = list[newIndex];
            list[newIndex] = list[oldIndex];
            list[oldIndex] = b;

            $(this).removeAttr('data-previndex');

            ui.item.removeClass('draggable-mirror');
            ui.placeholder.remove();
          },
        };

        scope.hasVisibleItems = function () {
          return visibilityUtils.arrayHasVisibleChild(scope.args, scope.formContext);
        };

        scope.getHeader = function (index) {
          var args = _.assign({}, scope.args, { index: index });
          return AdpFieldsService.getHeaderRenderer(args);
        };

        scope.toggle = function (event, index) {
          event.preventDefault();
          event.stopPropagation();

          scope.visibilityStatus[index] = !scope.visibilityStatus[index];
        };

        function setDefaultDisplay() {
          var data = getData();

          _.each(data, function (_v, i) {
            setDisplay(i, true)
          });
        }

        function getData() {
          // keeping reference to data fresh on every operation
          scope.arrayData = getterSetter();
          return scope.arrayData;
        }

        function setData(value) {
          return getterSetter(value);
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

        function isRemoveDisabled() {
          // kind of hack: checking if first element is required
          var requiredMap = scope.formContext.requiredMap;
          var path = scope.args.path + '[0]';
          var isFirstRequired = requiredMap[path];
          var hasOneItem = getData().length === 1;

          return isFirstRequired && hasOneItem;
        }

        function setKeysToAssociativeArray() {
          var arrayValue = getData();

          if (scope.field.type === 'AssociativeArray') {
            var data = _.map(arrayValue, function (item, key) {
              var newItem = _.clone(item);
              newItem.$key = key;
              return newItem;
            });

            setData(data);
          }
        }

        function setIdsToData() {
          var arrayValue = getData();
          if (_.isArray(arrayValue)) {
            var data = _.map(arrayValue, function (item) {
              item._id = Guid.create();
              return item;
            });

            setData(data);
          }
        }

        function showMoveToTop(index) {
          if (getData().length === 1) {
            return false;
          }

          return index > 0;
        }

        function showMoveToBottom(index) {
          if (getData().length === 1) {
            return false;
          }

          return index < (getData().length - 1);
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

        function moveToBottom(event, index) {
          event.preventDefault();

          moveToLastPosition(getData());
          moveToLastPosition(scope.visibilityStatus);

          function moveToLastPosition(list) {
            var itemToMove = list.splice(index, 1)[0];
            list.push(itemToMove);
          }
        }

      }
    }
  }
})();
