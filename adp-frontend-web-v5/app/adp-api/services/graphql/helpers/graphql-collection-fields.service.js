;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlCollectionFields', GraphqlCollectionFields);

  /** @ngInject */
  function GraphqlCollectionFields(
    GraphqlTreeSelectorField,
    GraphqlLookupField,
    GraphqlLocationField,
    GraphqlHelper
  ) {
    return {
      get: get
    };

    function get(schema) {
      var schemaForQuery = _.cloneDeep(schema);
      addIdAndPermissionFields(schemaForQuery);

      return fieldsForQuery(schemaForQuery);
    }

    function addIdAndPermissionFields(schema) {
      schema.fields['_id'] = { type: 'id', showInGraphql: true };
      schema.fields['_actions'] = { type: '_actions', showInGraphql: true };
    }

    function fieldsForQuery(field, name) {
      var name = name || 'items';

      if (hasChildren(field)) {
        return iteratee(field, name);
      } else if (isLookup(field)) {
        return GraphqlLookupField.get(field, name);
      } else if (isTreeSelector(field)) {
        return GraphqlTreeSelectorField.get(field, name);
      } else if (isLocation(field)) {
        return GraphqlLocationField.get(field, name);
      } else {
        return getFieldForQuery(field, name);
      }
    }

    function iteratee(field, name) {
      var fieldsString = _.chain(field.fields)
        .map(fieldsForQuery)
        .compact()
        .value()
        .join('\n');

      return GraphqlHelper.wrapFieldString(fieldsString, name);
    }

    function getFieldForQuery(field, name) {
      if (field.type === 'Group' || !field.showInGraphql) {
        return null;
      }

      return name;
    }

    function hasChildren(field) {
      return field.type === 'Object' || field.type === 'Array' || field.type === 'Schema';
    }

    function isLookup(field) {
      return field.type.includes('LookupObjectID');
    }

    function isTreeSelector(field) {
      return field.type.includes('TreeSelector');
    }

    function isLocation(field) {
      return field.type === 'Location';
    }
  }
})();
