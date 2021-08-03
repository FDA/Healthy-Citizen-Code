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

    function get(schema, defaultItemsName) {
      var schemaForQuery = _.cloneDeep(schema);
      if (schema.schemaName !== 'datasetSingle') {
        addIdAndPermissionFields(schemaForQuery);
      }

      return fieldsForQuery(schemaForQuery, defaultItemsName);
    }

    function addIdAndPermissionFields(schema) {
      if (schema.schemaName !== 'backgroundJobs') {
        schema.fields['_id'] = { type: 'id', showInGraphql: true };
      }

      schema.fields['_actions'] = { type: '_actions', showInGraphql: true };
    }

    function fieldsForQuery(field, name) {
      var name = name || 'items';

      if (field.type !== 'Schema' && !field.showInGraphql) {
        return null;
      }
      if (hasChildren(field)) {
        return iteratee(field, name);
      }
      if (isLookup(field)) {
        return GraphqlLookupField.get(field, name);
      }
      if (isTreeSelector(field)) {
        return GraphqlTreeSelectorField.get(field, name);
      }
      if (isLocation(field)) {
        return GraphqlLocationField.get(field, name);
      }
      return getFieldForQuery(field, name);
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
