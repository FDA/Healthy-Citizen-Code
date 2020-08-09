;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .filter('hcDataPresenter', hcDataPresenter);

  function hcDataPresenter (
    HcSchemaService,
    DATE_FORMAT,
    LISTS
  ) {
    var typeMap = {
      'String[]': multiselect,
      'Select': select,
      'Date': date,
      'Search': lookup,
      'Search[]': lookupMultiple,
      'Boolean': boolean
    };

    // NOTE: value is record object
    return function (value, schema, fieldName) {
      var schemaField = _.get(schema.fields, fieldName);
      var currentVal = value[fieldName];
      var fieldType = HcSchemaService.getTypeProps(schemaField);

      if (!typeMap[fieldType]) return (!!currentVal) ? currentVal : '-';

      return typeMap[fieldType](currentVal, schemaField, value, fieldName);
    };

    function multiselect (value, schema) {
      var list = schema.list;

      var items = _.map(value, function (val) {
        return LISTS[list][val];
      });

      return items.join(', ');
    }

    function select (value, schema) {
      var list = schema.list;
      var item = LISTS[list][value];

      if (!item) return '-';

      return item.name || item;
    }

    function date (value) {
      return !!value ? moment(value).format(DATE_FORMAT) : '-';
    }

    function lookup (value, schema, fullVal, fieldName) {
      if (_.isUndefined(value)) {
        return '-';
      } else {
        return fullVal[fieldName + '_label'];
      }
    }

    function lookupMultiple(value, schema, fullVal, fieldName) {
      var label = fullVal[fieldName + '_label'];
      if (value.length) {
        return _.isString(label) ? label : label.join(', ');
      } else {
        return '-';
      }
    }

    function boolean (value) {
      var iconName = value ? 'check' : 'times';

      return '<i class="fa fa-' + iconName + '"></i>';
    }

  }
})();
