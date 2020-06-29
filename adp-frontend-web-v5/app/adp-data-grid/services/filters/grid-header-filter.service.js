;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridHeaderFilters', GridHeaderFilters);

  /** @ngInject */
  function GridHeaderFilters(AdpUnifiedArgs, GridOptionsHelpers) {
    return function setHeaderFilters(options, schema) {
      if (!_.get(options, 'headerFilter.visible', false)) {
        return;
      }

      addSelectAllWorkaround(options);
      setHeaderFiltersToColumns(options.columns, schema);
    }

    // https://supportcenter.devexpress.com/ticket/details/t891118/datagrid-filter-is-empty-after-the-select-all-check-box-is-clicked
    function addSelectAllWorkaround(options) {
      GridOptionsHelpers.onOptionChanged(options, function (e) {
        var path = e.fullName.split('.');
        var optionName = path.pop();

        if (optionName === 'filterType' && e.value === 'exclude') {
          setTimeout(function () {
            var index = parseInt(path[0].split('[')[1]);
            var filterValues = e.component.columnOption(index, 'headerFilter.dataSource').map(function (d) {
              return d.value;
            });
            e.component.columnOption(index, { filterType: 'include', filterValues: filterValues });
            e.component.refresh();
          });
        }
      });
    }

    function setHeaderFiltersToColumns(columns, schema) {
      columns.forEach(function (column) {
        var field = schema.fields[column.dataField];
        if (!field || !column.allowFiltering) {
          return;
        }

        column.headerFilter = {}
        var dataSource = getCustomFilterDataSource(field, schema);

        if (!_.isNil(dataSource)) {
          return;
        }

        dataSource = getDataSourceForOperations(['undefined', 'notUndefined'], field);
        dataSource = _.concat(dataSource, getStringBasedOperations(field));
        column.headerFilter.dataSource = dataSource;
      });
    }

    function getCustomFilterDataSource(field, schema) {
      var customDataSourceName = _.get(field, 'parameters.headerFilter.dataSource', null);
      var customDataSource = _.get(window, 'appModelHelpers.DxDataSources.' + customDataSourceName, null);

      if (_.isNil(customDataSource)) {
        return;
      }

      var args = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: field.fieldName,
        formData: null,
        action: null,
        schema: schema,
      });

      return customDataSource.call(args);
    }

    function getDataSourceForOperations(operations, field) {
      return operations.map(function (op) {
        return getHeaderFilterItem(op, field);
      });
    }

    function getHeaderFilterItem(operation, field) {
      return {
        text: _.startCase(operation),
        value: [field.fieldName, operation],
      }
    }

    function getStringBasedOperations(field) {
      var isStringBased = _.includes(
        ['String', 'Phone', 'Url', 'Email', 'Password', 'Text', 'Code', 'Html'],
        field.type
      );

      if (!isStringBased) {
        return [];
      }

      return getDataSourceForOperations(['empty', 'notEmpty'], field);
    }
  }
})();
