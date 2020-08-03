;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LookupFilter', LookupFilter);

  /** @ngInject */
  function LookupFilter(
    LookupFilterSelector,
    LookupTypesCellRenderer,
    LookupFilterTableSelector
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

        formatValue: function(params) {
          return LookupTypesCellRenderer.multiple(params.args);
        },

        init: function () {
          this.setClassToContainer(this.lookupOptions.args.fieldSchema.fieldName);
          this.createTableSelector();
          this.createLookupSelector();
        },

        setClassToContainer: function(fieldName) {
          this.element.addClass('lookup-name-' + fieldName);
        },

        createTableSelector: function () {
          var self = this;
          this.tableSelector = LookupFilterTableSelector({
            args: this.lookupOptions.args,
            onTableChanged: function (e) {
              self.lookupEditor.updateDataSource(e.value);
            },
          });

          this.appendToRoot(this.tableSelector);
        },

        createLookupSelector: function () {
          var opts = {
            args: this.lookupOptions.args,
            onValueChanged: this.lookupOptions.onValueChanged,
            selectedTableName: this.tableSelector.getValue(),
          };

          this.lookupEditor = LookupFilterSelector(opts);
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
