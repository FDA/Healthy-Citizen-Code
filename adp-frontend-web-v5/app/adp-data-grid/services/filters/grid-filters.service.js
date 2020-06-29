;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridFilters', GridFilters);

  /** @ngInject */
  function GridFilters(
    AdpSchemaService,
    GridFiltersFactory,
    AdpUnifiedArgs,
    GridFilterHelpers,
    GridOptionsHelpers,
    filterUrlMapper,
    FilterUrlParser
  ) {
    function create(options, schema) {
      if (!options.filterRow.visible) {
        return;
      }

      GridOptionsHelpers.onEditorPreparing(options, function (event) {
        var isFilterRow = event.parentType === 'filterRow';
        if (!isFilterRow) {
          return;
        }

        setFilterComponent(event, schema);
      });

      GridOptionsHelpers.onOptionChanged(options, function (e) {
        var filterValueChanged = e.fullName.includes('filterValue') && e.name !== 'filterValue';
        var filterValueChangedToEmpty = filterValueChanged && filterValueEmpty(e.value);

        if (filterValueChangedToEmpty) {
          GridFilterHelpers.resetFilterByColumn(e);
        } else {
          if (isOptionChangedOnlyCase(e)) {
            e.component.getDataSource().reload();
          }
        }

        var filterOperationChanged = e.fullName.includes('selectedFilterOperation');
        if (filterValueChanged || filterOperationChanged) {
          filterUrlMapper(e.component, schema);
        }
      });

      return options;
    }

    function isOptionChangedOnlyCase( e ) {
      return e.value &&
        e.previousValue &&
        e.value.toLowerCase &&
        (e.fullName ==="searchPanel.text" || e.fullName .match(/columns\[\d+\]\.filterValue/)) &&
        e.value.toLowerCase() === e.previousValue.toLowerCase();
    }

    function setFilterComponent(event, schema) {
      var field = schema.fields[event.dataField];
      var isFilteringAllowed = field && GridFilterHelpers.filteringAllowedForField(field);

      if (!isFilteringAllowed) {
        return;
      }

      event.cancel = true; // Cancels creating the default editor
      var filterComponent = createFilterComponent(event, schema);
      filterComponent.getElement().appendTo(event.editorElement);
    }

    function createFilterComponent(event, schema) {
      var options = {
        args: unifiedApproachArgs(event, schema),
        onValueChanged: function (filterOptions) {
          filterChangeHandler(filterOptions, event);
        },
        placeholder: getPlaceholder(event, schema),
        parentType: event.parentType,
      };

      return GridFiltersFactory.create(options);
    }

    function getPlaceholder(event, schema) {
      if (event.selectedFilterOperation === 'between') {
        var field = schema.fields[event.dataField];
        return GridFilterHelpers.getTextForBetweenPlaceholder(event.editorElement, field);
      } else {
        return '';
      }
    }

    function unifiedApproachArgs(event, schema) {
      var fieldName = event.dataField;
      var value = event.value;

      var wrapIntoFormData = function (event) {
        var data = {};
        data[event.dataField] = value;

        return data;
      }

      var formData = _.isNil(value) ? null : wrapIntoFormData(event);

      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: fieldName,
        formData: formData,
        action: null,
        schema: schema,
      });
    }

    function filterChangeHandler(filterOptions, event) {
      if (filterValueEmpty(filterOptions.value)) {
        event.setValue();
      } else {
        event.setValue(filterOptions.value);
      }
    }

    function filterValueEmpty(val) {
      var isEmptyFn = _.isArray(val) ? _.isEmpty : _.isNil;
      return isEmptyFn(val);
    }

    function setFiltersFromUrl(options, schema) {
      var urlFilterValues = FilterUrlParser(schema);
      mapFilterValuesToColumns(options.columns, urlFilterValues);

      if (!_.get(options, "stateStoring.enabled") || !_.keys(urlFilterValues).length) {
        return;
      }

      var lsKey = GridOptionsHelpers.generateGridLsKey(options.stateStoring.storageKey, schema.schemaName);
      var stateFromLs = getGridStateFromLs(lsKey);
      if (_.isNil(stateFromLs)) {
        return;
      }

      mapFilterValuesToColumns(stateFromLs.columns, urlFilterValues);
      localStorage.setItem(lsKey, JSON.stringify(stateFromLs));
    }

    function mapFilterValuesToColumns(columns, filters) {
      (columns || []).forEach(function (column) {
        var filter = filters[column.dataField];
        addFilterValues(column, filter);
      });
    }

    function getGridStateFromLs(lsKey) {
      var curStateJson = localStorage.getItem(lsKey);
      var cur_state;

      try {
        cur_state = JSON.parse(curStateJson)
      } catch (e) {}

      return cur_state;
    }

    function addFilterValues(column, filter) {
      if (!filter) {
        column.filterValue = undefined;
      } else {
        column.filterValue = filter.value;
        if (filter.operation) {
          column.selectedFilterOperation = filter.operation;
        }
      }
    }

    return {
      create: create,
      setFiltersFromUrl: setFiltersFromUrl,
      setFilterComponent: setFilterComponent,
      unifiedApproachArgs:unifiedApproachArgs,
    }
  }
})();
