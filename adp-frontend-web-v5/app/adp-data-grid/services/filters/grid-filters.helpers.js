;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridFilterHelpers', GridFilterHelpers);

  /** @ngInject */
  function GridFilterHelpers(
    AdpValidationUtils,
    AdpSchemaService,
    FilterOperation
  ) {
    var FILTER_DOM_NAME = 'adpFilterInstance';
    var FILTER_CLASS_PREFIX = 'adp-custom-filter';

    function filterClass() {
      return FILTER_CLASS_PREFIX;
    }

    function getFilterInstancesByElements($filterElements) {
      return _.map($filterElements, function (el) {
        return $(el).data(FILTER_DOM_NAME)
      });
    }

    function saveFilterInstanceToDom(component) {
      var element = component.getElement();
      $(element).data(FILTER_DOM_NAME, component);
    }

    function filteringAllowedForField(field) {
      var type = AdpSchemaService.getFieldType(field);

      return FilterOperation.supportedTypes().includes(type);
    }

    function getFilterRenderer(field) {
      if (!field.filter) {
        return;
      }
      var filterName = field.filter;
      var metaschema = window.adpAppStore.metaschema().filters;
      var currentRenderer = metaschema[filterName].renderer;

      while (currentRenderer.type === 'reference') {
        filterName = currentRenderer.value;
        currentRenderer = metaschema[filterName].renderer;
      }

      return currentRenderer;
    }

    function isFilterRangeStart(editorElement) {
      var RANGE_START_CLASS = 'dx-datagrid-filter-range-start';
      return editorElement.closest('.dx-editor-container').hasClass(RANGE_START_CLASS);
    }

    function getTextForBetweenPlaceholder(editorElement, field) {
      var RANGE_PLACEHOLDER = {
        START: 'More Than', END: 'Less Than',
      };

      if (AdpSchemaService.isDate(field.type)) {
        _.each(RANGE_PLACEHOLDER, function (value, key) {
          RANGE_PLACEHOLDER[key] += ' ' + AdpValidationUtils.getDateFormat(field.type);
        });
      }


      return isFilterRangeStart(editorElement) ?
        RANGE_PLACEHOLDER.START :
        RANGE_PLACEHOLDER.END;
    }

    function resetFilterByColumn(e) {
      var columnOptionName = e.fullName.split('.')[0];
      var columnName = e.component.option(columnOptionName).dataField;

      var filtersSelector = [
        '.dx-datagrid-filter-row',
        '.name-' + columnName,
        '.' + FILTER_CLASS_PREFIX
        ].join(' ');

      var components = getFilterInstancesByElements($(filtersSelector));
      _.each(components, function (cmp) {
        cmp.reset();
      });
    }

    return {
      filterClass: filterClass,
      saveFilterInstanceToDom: saveFilterInstanceToDom,
      filteringAllowedForField: filteringAllowedForField,
      resetFilterByColumn: resetFilterByColumn,
      getFilterRenderer: getFilterRenderer,
      getTextForBetweenPlaceholder: getTextForBetweenPlaceholder,
    }
  }
})();
