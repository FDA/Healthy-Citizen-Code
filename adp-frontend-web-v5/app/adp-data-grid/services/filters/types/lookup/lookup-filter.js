;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LookupFilter', LookupFilter);

  /** @ngInject */
  function LookupFilter(
    LookupSelector,
    LookupTableSelector
  ) {
    return function () {
      return {
        element: $('<div class="adp-lookup-filter-container">'),
        lookupOptions: null,
        tableSelector: null,
        selectedTableName: null,
        lookupEditor: null,
        value: null,

        create: function (init) {
          this.lookupOptions = init;
          this.init();
        },

        init: function () {
          this.setClassToContainer(this.lookupOptions.args.modelSchema);
          this.createTableSelector();
          this.createLookupSelector();
        },

        setClassToContainer: function(modelSchema) {
          this.element.addClass('lookup-name-' + modelSchema.fieldName);
        },

        createTableSelector: function () {
          var self = this;
          this.tableSelector = LookupTableSelector({
            args: this.lookupOptions.args,
            onTableChanged: function (e) {
              self.lookupEditor.updateDataSource(e.value);
            }
          });

          this.appendToRoot(this.tableSelector);
        },

        createLookupSelector: function () {
          var self = this;

          var opts = {
            args: this.lookupOptions.args,
            onValueChanged: function (e) {
              var filterValue = e.value.map(function (lookup) {
                return {
                  _id: lookup._id,
                  table: lookup.table,
                  label: lookup.label,
                };
              });

              self.lookupOptions.onValueChanged({ value: filterValue });
            },
            selectedTableName: this.tableSelector.getValue(),
          };
          this.lookupEditor = LookupSelector(opts);
          this.appendToRoot(this.lookupEditor);
        },

        reset: function () {
          this.lookupEditor.reset();
        },

        getElement: function () {
          return this.element;
        },

        appendToRoot: function(component) {
          this.element.append(component.getElement());
        },
      };
    }
  }
})();
