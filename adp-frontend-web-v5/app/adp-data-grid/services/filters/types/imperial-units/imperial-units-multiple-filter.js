;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('imperialUnitMultipleFilter', imperialUnitMultipleFilter);

  /** @ngInject */
  function imperialUnitMultipleFilter(ImperialUnitsFilterHelpers) {
    return function () {
      return {
        filterValue: [0, 0],
        element: $('<div>'),

        create: function (init) {
          this.options = init;
          this.units = ImperialUnitsFilterHelpers.getUnits(this.options.args.modelSchema);

          this.init();
        },

        init: function() {
          var initialValue = this.options.args.data || [];

          this.filterElements = this.units.map(function (unit, index) {
            return this.createSelectBox(unit, index, initialValue[index]);
          }, this);
          this.element.append(this.filterElements);

          this.addRangeText(this.options.placeholder);
        },

        addRangeText: function (placeholder) {
          if (!placeholder) {
            return;
          }

          var el = ImperialUnitsFilterHelpers.createRangePlaceholderElement(placeholder);
          this.element.prepend(el);
        },

        createSelectBox: function (unit, position, value) {
          var self = this;

          return ImperialUnitsFilterHelpers.createFilterComponent({
            unit: unit,
            element: $('<div>'),
            onValueChanged: function (e) {
              self.setValue(e.value, position);
              self.options.onValueChanged({ value: self.getValue() });
            },
            value: value,
          });
        },

        setValue: function (value, position) {
          if (_.isNull(value)) {
            this.filterValue = value;
          } else {
            this.filterValue = this.filterValue || [0, 0];
            this.filterValue[position] = value;
          }
        },

        getValue: function() {
          return _.isNull(this.filterValue) ? null : this.filterValue.slice();
        },

        reset: function () {
          this.filterElements.forEach(function (el) {
            var filterInstance = el.dxSelectBox('instance');
            filterInstance.reset();
          });
          this.setValue(null);
        },

        getElement: function () {
          return this.element;
        }
      };
    };
  }
})();
