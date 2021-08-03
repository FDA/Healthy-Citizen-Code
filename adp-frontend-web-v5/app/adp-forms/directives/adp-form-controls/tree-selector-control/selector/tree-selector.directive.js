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
          scope.rootData = _.get(scope.args.row, scope.args.path);
          scope.rootData[scope.indexOfLevel] = scope.rootData[scope.indexOfLevel] || {};
          setConfig();
        })();

        function setConfig() {
          var initialData = _.clone(scope.rootData[scope.indexOfLevel]) || {};

          var defaults = {
            elementAttr: { 'class': 'adp-select-box' },
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
              byKey: function () { return Promise.resolve(initialData); },
            }),
            valueExpr: 'this',
            displayExpr: 'label',
            onInitialized: function (e) {
              // place to trigger change event, if initiated with
              if (!_.isEmpty(initialData)) {
                $timeout(function () {
                  e.component.option('value', initialData);
                });
              }
            },
            onValueChanged: onChange,
            multiline: true,
            wrapItemText: true,
            inputAttr: {
              'adp-qaid-field-control': scope.args.path + '_' + scope.indexOfLevel
            },
            itemTemplate: function (data, index, element) {
              element.attr('adp-qaid-tree-selector-item', scope.args.path + '_' + scope.indexOfLevel);
              return data.label;
            },
          };

          scope.config = AdpFieldsService.configFromParameters(scope.args.fieldSchema, defaults);
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
          _.assign(scope.rootData[scope.indexOfLevel], value);
        }

        function removeData() {
          destroyChildScope();

          scope.rootData[scope.indexOfLevel] = {};
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
            '></tree-selector>',
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
