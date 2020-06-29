(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('treeSelector', treeSelector);

  function treeSelector(
    GraphqlTreeSelectorQuery,
    AdpUnifiedArgs,
    AdpValidationUtils,
    AdpFieldsService,
    APP_CONFIG,
    $compile,
    $timeout
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '=',
        formData: '=',
        indexOfLevel: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/tree-selector-control/selector/tree-selector.html',
      require: '^^form',
      link: function (scope, element) {
        var childScope;
        (function init() {
          scope.rootData = scope.formData[scope.args.modelSchema.fieldName];
          scope.currentData = scope.rootData[scope.indexOfLevel];

          if (_.isNil(scope.currentData)) {
            scope.currentData = {};
            scope.rootData[scope.indexOfLevel] = scope.currentData;
          }

          setConfig(scope.currentData);

          // render child data lookups
          var hasNext = scope.rootData[scope.indexOfLevel + 1];
          if (hasNext) {
            $timeout(function () {
              renderNext(scope.rootData[scope.indexOfLevel + 1]);
            });
          }
        })();

        function setConfig(data) {
          var initialData = _.cloneDeep(data);

          var defaults = {
            elementAttr: {
              'class': 'adp-select-box',
            },
            value: initialData,
            showClearButton: true,
            searchEnabled: true,
            dataSource:  new DevExpress.data.DataSource({
              paginate: true,
              requireTotalCount: true,
              pageSize: 15,
              load: function (loadOptions) {
                var params = _.cloneDeep(loadOptions);
                if (scope.indexOfLevel > 0) {
                  params.foreignKeyVal = scope.rootData[scope.indexOfLevel - 1]._id;
                }

                return GraphqlTreeSelectorQuery(scope.args, params)
                  .then(function (res) {
                    return {
                      data: _.get(res, 'items', []),
                      totalCount: _.get(res, 'count', 0),
                    }
                  });
              },
              key: '_id',
              byKey: function () {
                return Promise.resolve(initialData);
              }
            }),
            valueExpr: 'this',
            displayExpr: 'label',
            onValueChanged: onChange,
            multiline: true,
            wrapItemText: true
          };

          scope.config = AdpFieldsService.configFromParameters(scope.args.modelSchema, defaults);
        }

        function onChange(e) {
          var isRemoved = _.isNull(e.value) && e.event;

          if (isRemoved) {
            removeData();
          } else if (e.value) {
            setData(e.value);
            renderNext(e.value);
          }
        }

        function setData(value) {
          scope.currentData._id = value._id;
          scope.currentData.table = value.table;
          scope.currentData.label = value.label;
        }

        function removeData() {
          destroyChildScope();

          scope.rootData[scope.indexOfLevel] = {};
          scope.currentData = scope.rootData[scope.indexOfLevel];
        }

        function renderNext(value) {
          if (_.isEmpty(value)) return;
          if (value.isLeaf) return;

          destroyChildScope();

          childScope = scope.$new(true);
          childScope.args = scope.args;
          childScope.formData = scope.formData;
          childScope.indexOfLevel = scope.indexOfLevel + 1;

          var template = [
            '<tree-selector',
              "args=args",
              "form-data=formData",
              "index-of-level=indexOfLevel",
              'data-child',
            '>',
            '</tree-selector>',
          ].join('\n');

          element.find('> div').append($compile(template)(childScope));
        }

        function destroyChildScope() {
          if (_.isNil(childScope)) {
            return;
          }
          scope.rootData.length = scope.indexOfLevel + 1;

          var childNode = element.find('[data-child]');
          childScope.$destroy();
          childNode.remove();
        }
      }
    }
  }
})();
