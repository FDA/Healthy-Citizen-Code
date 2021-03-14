(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('cronExpressionControl', cronExpressionControl);

  function cronExpressionControl(
    AdpValidationUtils,
    ControlSetterGetter,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/cron-expression-control/cron-expression-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        var templateDivs = $('.adp-form-fieldset>div', el);
        var $componentEl = $(templateDivs[0]);
        var $humanTextEl = $(templateDivs[1]);

        scope.getterSetter = getterSetterFn;
        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);

        scope.$on('$destroy', function () {
          getInstance().dispose();
        });

        $componentEl.dxTextBox(getConfig(scope.args));

        function getConfig(args) {
          var field = args.fieldSchema;
          var validateRegexp = getFieldValidationRegexp(field);
          var formField = formCtrl[field.fieldName];

          return {
            value: getterSetterFn() || null,
            onInitialized: function (e) {
              scope.instance = e.component;
              updateHumanReadableText(getterSetterFn());
            },
            onValueChanged: function (e) {
              getterSetterFn(e.value);
              setAngularFormProps(formField);
              updateHumanReadableText(e.value);
            },
            onInput: function (e) {
              updateHumanReadableText(e.event.target.value);
            },
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(field),
              'field-name-input': field.fieldName,
              id: field.fieldName,
              'adp-qaid-field-control': args.path,
            },
            valueChangeEvent: 'input blur',
          };

          function updateHumanReadableText(value) {
            var isEmpty = !value;
            var humanReadable = 'Incorrect cron expression';

            if (isEmpty) {
              humanReadable = '';
            } else {
              var isValid = !validateRegexp  || !!value.match(validateRegexp);

              if (isValid) {
                try {
                  humanReadable = cronstrue.toString(value);
                } catch(e) {
                }
              }
            }

            $humanTextEl.text(humanReadable);
          }
        }

        function getInstance() {
          return scope.instance;
        }

        function setAngularFormProps(formField) {
          !formField.$dirty && formField.$setDirty();
          !formField.$touched && formField.$setTouched();
        }

        function getFieldValidationRegexp(field) {
          var validateRule = _.find(field.validate, function (rule) {
            return rule.validator === 'regex'
          });

          if (!validateRule) {
            return null;
          }

          var regex = _.get(validateRule, 'arguments.regex');
          var regexOptions = _.get(validateRule, 'arguments.regexOptions');

          if (regex) {
            return new RegExp(regex, regexOptions);
          }

          return null;
        }
      }
    }
  }
})();
