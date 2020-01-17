(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('treeSelectorControl', treeSelectorControl);

  function treeSelectorControl(
    AdpValidationService,
    APP_CONFIG,
    $compile,
    $timeout
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '=',
        index: '=?'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/tree-selector-control/tree-selector-control.html',
      require: '^^form',
      link: function (scope, element) {
        var childScope;

        (function init() {
          scope.index = _.isNil(scope.index) ? 0 : scope.index;

          scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || [];
          scope.fieldData = scope.adpFormData[scope.field.keyName];
          scope.currentData = scope.fieldData[scope.index];

          if (_.isNil(scope.currentData)) {
            scope.currentData = {};
            scope.fieldData[scope.index] = scope.currentData;
          }

          scope.lookupData = scope.currentData._id;

          setOptions();

          if (scope.index === 0) {
            scope.isRequired = AdpValidationService.isRequired(scope.validationParams.formParams);
          }

          // render child data lookups
          if (scope.fieldData[scope.index + 1]) {
            $timeout(function () {
              renderNext(scope.fieldData[scope.index + 1]);
            });
          }


        })();

        scope.fieldName = function () {
          var name = scope.field.keyName;
          return scope.index > 0 ? name + '_' + scope.index : name;
        };

        function setOptions() {
          scope.options = {
            allowClear: true,
            placeholder: '-',
            formatResult: getLabel,
            formatSelection: getLabel,
            ajax: getRequestParams(),
            onChange: onChange,
            initSelection: initData
          }
        }

        function getRequestParams() {
          return {
            url: getEndpoint(),
            dataType: 'json',
            quietMillis: 300,
            transport: function (args) {
              if (scope.index > 0) {
                args.data.foreignKeyVal = scope.fieldData[scope.index - 1]._id;
              }

              return $.ajax(args);
            },
            data: function (term, page) {
              return { q: term, page: page };
            },
            results: function (response) {
              return {
                results: response.data.map(function (item) {
                  item.id = item._id;
                  return item;
                }),
                more: response.more
              };
            },
            cache: false
          }
        }

        function getLabel(state) {
          return state.label;
        }

        function getEndpoint() {
          var tableId = scope.field.table.id;
          var tableName = getTable();

          return [APP_CONFIG.apiUrl, 'treeselectors', tableId, tableName].join('/');
        }

        function getTable() {
          return _.keys(scope.field.table)[0];
        }

        function onChange(e) {
          // order is important: for some reason select2 sends e.added and e.removed on reselect of same value
          // in this case we do nothing
          if (e.added) {
            setData(e.added);
            renderNext(e.added);
          }

          if (e.removed && !e.added) {
            removeData();
          }

          scope.$apply();
        }

        function initData(element, callback) {
          if (_.isEmpty(scope.currentData)) return;

          callback({
            id: scope.currentData._id,
            label: scope.currentData.label
          });
        }

        function setData(value) {
          scope.currentData._id = value.id;
          scope.currentData.table = getTable();
          scope.currentData.label = value.label;
        }

        function removeData() {
          destroyChildScope();

          scope.fieldData[scope.index] = {};
          scope.currentData = scope.fieldData[scope.index];
        }
        
        function renderNext(value) {
          if (_.isEmpty(value)) return;
          if (value.isLeaf) return;

          destroyChildScope();

          var template = '<tree-selector-control ' +
            'field="field" ' +
            'adp-form-data="adpFormData" ' +
            'ui-props="uiProps" ' +
            'validation-params="validationParams" ' +
            'index="index"' +
            'data-child>' +
          '</tree-selector-control>';


          childScope = scope.$new(true);
          childScope.field = scope.field;
          childScope.adpFormData = scope.adpFormData;
          childScope.uiProps = scope.uiProps;
          childScope.validationParams = scope.validationParams;
          childScope.index = scope.index + 1;

          element.find('> div').append($compile(template)(childScope));
        }

        function destroyChildScope() {
          if (_.isNil(childScope)) {
            return;
          }
          scope.fieldData.length = scope.index + 1;

          var childNode = element.find('[data-child]');
          childScope.$destroy();
          childNode.remove();
        }
      }
    }
  }
})();
