;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('EvalShowIn', EvalShowIn);

  /** @ngInject */
  function EvalShowIn(ShowInDataFiltrationHelper, AdpUnifiedArgs, ACTIONS) {
    var functionCacheStore = [];

    return {
      forViewDetails: evalForViewDetails,
      createFilterMemoizedFunction: createFilterMemoizedFunction,
      removeMemoizedFunction: removeMemoizedFunction,
    };

    function evalForViewDetails(args) {
      var argsWithFilteredData = evalShowInForGroup(args);
      return ShowInDataFiltrationHelper(argsWithFilteredData, evalShowExpr);
    }

    function evalShowInForGroup(args) {
      var hasGroup = !!_.get(args, 'modelSchema.parameters.groupingType');

      if (!hasGroup) {
        return args;
      }

      var lastGroup = null;
      var groups = _.transform(args.modelSchema.fields, function (result, field) {
        if (field.type === 'Group') {
          lastGroup = _.clone(field);
          result[field.fieldName] = lastGroup;
        } else if (lastGroup) {
          lastGroup.fields = lastGroup.fields || {};
          lastGroup.fields[field.fieldName] = field;
        } else {
          result[field.fieldName] = field;
        }
      }, {});

      _.forEach(groups, function(group) {
        var groupArgs = AdpUnifiedArgs.getArgsForGroup(group, args);
        var shouldShow = evalShowExpr(groupArgs);

        if (shouldShow) {
          return;
        }

        _.forEach(groupArgs.data, function (val, key) {
          _.unset(args.row, key);
        });
      });

      return args;
    }

    function createFilterMemoizedFunction() {
      var func = function (schema, row) {
        var args = AdpUnifiedArgs.getHelperParamsWithConfig({
          path: '',
          formData: row,
          action: ACTIONS.VIEW,
          schema: schema,
        });

        return ShowInDataFiltrationHelper(args, evalShowExpr);
      };

      var memoized = _.memoize(func, function (schema, row) {
        return row;
      });

      functionCacheStore.push(memoized);

      return memoized;
    }

    function removeMemoizedFunction(fn) {
      var indexOfFn = _.indexOf(functionCacheStore, fn);
      if (indexOfFn < 0) {
        return;
      }

      var fnToRemove = functionCacheStore[indexOfFn];
      fnToRemove.cache = null;

      functionCacheStore.splice(indexOfFn, 1);
    }

    function evalShowExpr(args) {
      var showPropertyName = ({
        viewDetails: 'showInViewDetails',
        view: 'showInDatatable'
      })[args.action];

      var showIn = _.get(args, 'fieldSchema.' + showPropertyName);

      try {
        return new Function('return ' + showIn).call(args);
      } catch (e) {
        console.error('Error while evaluating show attribute for: ', e, args.path);
        return true;
      }
    }
  }
})();
