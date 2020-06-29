;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ImperialUnitMultipleFilter', ImperialUnitMultipleFilter);

  /** @ngInject */
  function ImperialUnitMultipleFilter(ImperialUnitsEditorsHelpers) {
    return function () {
      return {
        element: $('<div>'),

        create: function (init) {
          this.options = init;
          this.units = ImperialUnitsEditorsHelpers.getUnits(this.options.args.modelSchema);

          this.init();
        },

        init: function () {
          this.value = this.getInitialValue(this.options.args.data);

          this.elements = this.units.map(function (unit, index) {
            return this.createSelectBox(unit, index, this.value[index]);
          }, this);
          this.element.append(this.elements);

          this.addRangeText(this.options.placeholder);
        },

        getInitialValue: function (v) {
          return typeof v === 'string' ? v.split('.').map(Number) : [null, null];
        },

        addRangeText: function (placeholder) {
          if (!placeholder) {
            return;
          }

          var el = ImperialUnitsEditorsHelpers.createRangePlaceholderElement(placeholder);
          this.element.prepend(el);
        },

        createSelectBox: function (unit, position, value) {
          var self = this;

          return ImperialUnitsEditorsHelpers.createFilterComponent({
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
          if (_.isNull(value) && _.isNil(position)) {
            this.value = null;
          }

          this.value = this.value || [null, null];
          this.value[position] = _.isNil(value) ? null : value;
          this.value = _.isEmpty(_.compact(this.value)) ? null : this.value;
        },

        getValue: function() {
          return _.isNull(this.value) ? null : this.value.join('.');
        },

        reset: function () {
          this.elements.forEach(function (el) {
            // WORKAROUND: dx grid somehow manages to dispose second filter before first while
            // filter operation changed from any to 'between'
            // dxGrid throws error: 'dxSelectBox' is not init for this element
            // this code attempts to reset filter if element exist, if not just pass through
            try {
              var filterInstance = el.dxSelectBox('instance');
              filterInstance.reset();
            } catch (e) {}
          });
          this.setValue(null);
          this.options.onValueChanged({ value: null });
        },

        getElement: function () {
          return this.element;
        }
      };
    };
  }
})();
