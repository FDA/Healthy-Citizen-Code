;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('listControl', listControl);

  function listControl(
    AdpValidationUtils,
    AdpFieldsService,
    AdpListsService,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/list-control/list-control.html',
      require: '^^form',
      link: function (scope, element, attrs, formCtrl) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;

        (function init() {
          scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);
          scope.isMultiple = scope.args.fieldSchema.type.includes('[]');

          bindWatcher(scope.args.fieldSchema);

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
            value: getterSetterFn() || null,
            onInitialized: function(e) {
              scope.instance = e.component;
            },
            valueExpr: 'value',
            displayExpr: 'label',
            elementAttr: {
              class: 'adp-select-box',
              id: 'list_id_' + args.fieldSchema.fieldName,
            },
            inputAttr: { 'adp-qaid-field-control': scope.args.path },
            itemTemplate: function (data, index, element) {
              element
                .attr('adp-qaid-control-dropdown-item', scope.args.path)
                .attr('list-control-item', scope.args.path); // deprecated

              return data.label;
            },
            showClearButton: true,
            dataSource: AdpListsService.getDataSource(args),
            onOpened: function (e) {
              var ds = e.component.option('dataSource');
              (ds instanceof DevExpress.data.DataSource) && ds.reload();
            },
            onValueChanged: function (e) {
              getterSetterFn(e.value);
              setAngularFormProps();
            },
            tagTemplate: function tagTemplate(data, tagElement) {
              var component = this;
              var removeBtn = $('<div class="dx-tag-remove-button">');

              removeBtn.on('click', function () {
                var ids = component.option('value').slice();
                _.pull(ids, data.value);

                component.option('value', ids);
                removeBtn.off('click');
              });

              $('<div class="dx-tag-content">')
                .attr('adp-qaid-field-tag', args.path)
                .append('<span>' + data.label + '</span>', removeBtn)
                .appendTo(tagElement);
            },
          };
        }

        function getInstance() {
          return DevExpress.ui[getWidgetName()].getInstance(element.find('div'));
        }

        function getWidgetName() {
          return scope.isMultiple ? 'dxTagBox' : 'dxSelectBox';
        }

        function setAngularFormProps() {
          var formField = formCtrl[scope.args.fieldSchema.fieldName];

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
      }
    }
  }
})();
