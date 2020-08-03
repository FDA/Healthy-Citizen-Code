;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ImperialUnitMultipleEditor', ImperialUnitMultipleEditor);

  /** @ngInject */
  function ImperialUnitMultipleEditor(ImperialUnitsEditorsHelpers) {
    return function () {
      return {
        element: $('<div>'),

        create: function (init) {
          this.options = init;
          this.units = ImperialUnitsEditorsHelpers.getUnits(this.options.args.fieldSchema);

          this.init();
        },

        init: function() {
          var initialValue = this.options.args.data || [0, 0]
          this.value = initialValue;

          this.elements = this.units.map(function (unit, index) {
            return this.createSelectBox(unit, index, initialValue[index]);
          }, this);
          this.element.append(this.elements);

          this.addRangeText(this.options.placeholder);
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
            attrId: 'cell_list_id_' + this.options.args.fieldSchema.fieldName + '_' + position,
          });
        },

        setValue: function (value, position) {
          if (_.isNull(value) && _.isNil(position)) {
            this.value = null;
          }

          this.value = this.value || [0, 0];
          this.value[position] = _.isNil(value) ? 0 : value;
          this.value = _.isEmpty(_.compact(this.value)) ? null : this.value;
        },

        getValue: function() {
          return _.isNull(this.value) ? null : this.value.slice();
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
