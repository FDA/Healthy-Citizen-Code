;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormActions', adpFormActions);

  function adpFormActions(AdpIconsHelper, ActionsHelpers) {
    return {
      restrict: 'E',
      scope: false,
      templateUrl: 'app/adp-forms/directives/adp-form/adp-form-actions/adp-form-actions.html',
      link: function (scope) {
        scope.actions = {};

        setActionsToScope();

        function setActionsToScope() {
          scope.actions = _
            .chain(scope)
            .get('args.modelSchema.actions.fields')
            .pickBy(function (action) {
              return action.position && action.position.startsWith('form.bottom');
            })
            .mapValues(evalAction)
            .entries()
            .orderBy(['[1].actionOrder'], ['asc'])
            .fromPairs()
            .value();
        }

        function evalAction(action) {
          var evaledAction = _.cloneDeep(action);
          var btnType = _.get(evaledAction, 'htmlAttributes.type', 'button');
          var className = _.get(evaledAction, 'htmlAttributes.className');

          _.set(evaledAction, 'htmlAttributes.type', btnType);
          _.set(evaledAction, 'htmlAttributes.style', getActionStyles(evaledAction));

          if (_.isNil( className )) {
             className = action.action.type === 'link' ? 'btn form-footer-link' : 'adp-action-p-tertiary';
          }

          _.set(evaledAction, 'className', className);

          return evaledAction;
        }

        scope.fullNameGetter = function fullNameGetter(action) {
          return action.fullName.type === 'function' ?
            evalProperty(action, 'fullName.code', 'Action') :
            action.fullName;
        }

        scope.visibleGetter = function visibleGetter(action) {
          return _.isString(action.visible) ?
            evalProperty(action, 'visible', false) :
            action.visible || true;
        }

        scope.disabledState = function (action) {
          return ActionsHelpers.evalDisabledAttr(action, scope.args.row, scope.args.modelSchema);
        }

        function evalProperty(action, propertyPath, defaultValue) {
          try {
            var fn = new Function('return ' + _.get(action, propertyPath));
            return fn.call(scope.args);
          } catch (e) {
            console.error('Error evaluating "' + propertyPath + '"', e);
            if (_.isNil(defaultValue)) {
              return defaultValue;
            }
          }
        }

        scope.hasIcon = function (action) {
          return !_.isNil(action.icon);
        };
        scope.getIcon = AdpIconsHelper.getIconHtml;
        scope.hasFullName = function (action) {
          return !_.isNil(action.fullName);
        }

        function getActionStyles(action) {
          var styles = _.pick(action, ['backgroundColor', 'borderColor', 'textColor']);

          return _.reduce(styles, function (result, value, key) {
            var objKey = key === 'textColor' ? 'color' : _.kebabCase(key);
            result += objKey + ': ' + value + ' !important;';

            return result;
          }, '');
        }
      }
    }
  }
})();
