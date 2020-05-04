;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LookupFilterSelector', LookupFilterSelector);

  /** @ngInject */
  function LookupFilterSelector(
    LookupDataSource,
    AdpLookupHelpers,
    DxEditorMixin,
    LookupDxConfig
  ) {
    return function (options) {
      var $component = DxEditorMixin({
        element: $('<div>'),

        create: function (parentOptions) {
          this.multiple = true;
          this.args = parentOptions.args;
          this.setEditorsOptions(parentOptions);

          this.editorName = 'dxTagBox';
          this.element[this.editorName](this.editorOptions);
        },

        updateDataSource: function (tableName) {
          var dataSource = LookupDataSource(this.args, tableName);
          this.getInstance().option('dataSource', dataSource);
        },

        setEditorsOptions: function(parentOptions) {
          this.editorOptions = LookupDxConfig.gridEditorMultiple(parentOptions);
          this.editorOptions.showSelectionControls = true;

          this.setChangeHandler(parentOptions.onValueChanged);
        },

        setChangeHandler: function (changeHandler) {
          this.editorOptions.onValueChanged = function (e) {
            if (_.isNil(e.value) || _.isEmpty(e.value)) {
              changeHandler({ value: null });
              return;
            }
            var value = e.value.map(toLookupValue);

            changeHandler({ value: value });
          };
        }
      });

      $component.create(options);

      return $component;
    }

    function toLookupValue(lookup) {
      return {
        _id: lookup._id,
        table: lookup.table,
        label: lookup.label,
      };
    }
  }
})();
