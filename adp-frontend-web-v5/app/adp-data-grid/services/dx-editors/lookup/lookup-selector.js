;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LookupSelector', LookupSelector);

  /** @ngInject */
  function LookupSelector(
    LookupDataSource,
    AdpLookupHelpers,
    DxEditorMixin,
    LookupDxConfig
  ) {
    return {
      single: function (options) {
        return createEditor(options, false);
      },
      multiple: function (options) {
        return createEditor(options, true);
      }
    }

    function createEditor(options, multiple) {
      var $component = DxEditorMixin({
        element: $('<div>'),

        create: function (parentOptions) {
          this.multiple = multiple;
          this.args = parentOptions.args;
          this.setEditorsOptions(parentOptions);

          this.editorName = this.multiple ? 'dxTagBox' : 'dxSelectBox';
          this.element[this.editorName](this.editorOptions);
        },

        updateDataSource: function (tableName) {
          var dataSource = LookupDataSource(this.args, tableName);
          this.getInstance().option('dataSource', dataSource);
        },

        setEditorsOptions: function(parentOptions) {
          this.editorOptions = this.multiple ?
            LookupDxConfig.gridEditorSingle(parentOptions) :
            LookupDxConfig.gridEditorMultiple(parentOptions);

          this.setChangeHandler(parentOptions.onValueChanged);
        },

        setChangeHandler: function (changeHandler) {
          var self = this;
          this.editorOptions.onValueChanged = function (e) {
            if (_.isNil(e.value) || _.isEmpty(e.value)) {
              changeHandler({ value: null });
              return;
            }
            var value = self.multiple ?
              e.value.map(toLookupValue) :
              toLookupValue(e.value);

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
