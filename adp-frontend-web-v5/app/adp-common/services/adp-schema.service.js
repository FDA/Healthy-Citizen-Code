;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('AdpSchemaService', AdpSchemaService);

  /** @ngInject */
  function AdpSchemaService($state) {
    function getCurrentSchema() {
      var APP_MODEL = window.adpAppStore.appModel();
      var pageParams = getPageParams();

      return _.clone(_.get(APP_MODEL, pageParams.schemaPath));
    }

    function getSchemaByName(name) {
      var APP_MODEL = window.adpAppStore.appModel();
      return _.clone(_.get(APP_MODEL, name));
    }

    // deprecated: PageParams for usage after Provide state
    // TODO: move to adp-generator
    function getPageParams() {
      return _.clone($state.current.data.pageParams);
    }

    function isField(field) {
      return field.type !== 'Schema' && field.type !== 'Subschema';
    }

    function isGroup(field) {
      return field.type === 'Group';
    }

    function getFieldType(field) {
      if (_.has(field, 'list')) {
        return field.type.includes('[]') ? 'List[]' : 'List';
      }

      return field.type;
    }

    function isLookup(type) {
      return ['LookupObjectID', 'LookupObjectID[]'].includes(type);
    }

    function isReadonly(field) {
      var fieldInfo = _.get(field, 'fieldInfo', {});

      return fieldInfo.read && !fieldInfo.write;
    }

    function isDate(type) {
      return ['Date', 'DateTime', 'Time'].includes(type);
    }

    function getSorter(attrName) {
      var defaultOrderValue = 1000000;

      return function (itemA, itemB) {
        var a = _.isUndefined(itemA[attrName]) ? defaultOrderValue : itemA[attrName];
        var b = _.isUndefined(itemB[attrName]) ? defaultOrderValue : itemB[attrName];

        a = parseInt(a);
        b = parseInt(b);

        a = isNaN(a) ? defaultOrderValue : a;
        b = isNaN(b) ? defaultOrderValue : b;

        return a === b ? 0 : a > b ? 1 : -1;
      }
    }

    return {
      getFieldType: getFieldType,
      getCurrentSchema: getCurrentSchema,
      getSchemaByName: getSchemaByName,
      getPageParams: getPageParams,
      getSorter: getSorter,
      isField: isField,
      isGroup: isGroup,
      isLookup: isLookup,
      isReadonly: isReadonly,
      isDate: isDate,
    }
  }
})();
