;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .factory('AdpTablesService', AdpTablesService);

  /** @ngInject */
  function AdpTablesService(AdpSchemaService) {
    var fileTypeProps = {directiveType: 'string', uiSubtypeType: 'file'};
    var typeMap = {
      'LookupObjectID': {directiveType: 'lookup'},
      'LookupObjectID[]': {directiveType: 'lookup'},
      'String': {directiveType: 'string', uiSubtypeType: 'string'},
      'Select': {directiveType: 'list'},
      'SelectMultiple': {directiveType: 'list'},
      'Date': {directiveType: 'date'},
      'Number': {directiveType: 'number', uiSubtypeType: 'number'},
      'Boolean': {directiveType: 'boolean'},
      'File': fileTypeProps,
      'Image': fileTypeProps,
      'Audio': fileTypeProps,
      'Video': fileTypeProps,
      'File[]': fileTypeProps,
      'Image[]': fileTypeProps,
      'Audio[]': fileTypeProps,
      'Video[]': fileTypeProps,
    };

    function getHeadFilter(field) {
      var type = AdpSchemaService.getTypeProps(field);

      return typeMap[type] || typeMap['String'];
    }

    function _isVisibleInDt(field) {
      return field.showInDatatable;
    }

    function _isVisibleInDetails(field) {
      if (field.type === 'Group') return true;

      return field.showInViewDetails;
    }

    function getHeads(schema) {
      var heads = [];
      var groupedFields = _groupSchema(schema);
      var readable = _getReadable(groupedFields);

      _.each(readable, function (f, k) {
        if (_isVisibleInDt(f)) {
          heads.push(_getHead(f, k));
        }
      });

      // FIXME: wrong usage
      return _.sortBy(heads, 'order');
    }

    function getDetailsHeads(schema) {
      var heads = [];
      var groupedFields = _groupSchema(schema);
      var readable = _getReadable(groupedFields, true);

      _.each(readable, function (f, k) {
        if (_isVisibleInDetails(f)) {
          heads.push(_getHead(f, k));
        }
      });

      return heads;
    }

    function _getHead(field, key) {
      return {
        name: key,
        order: field.visibilityPriority,
        responsivePriority: field.responsivePriority,
        fullName: field.fullName,
        type: AdpSchemaService.getTypeProps(field),
        filter: getHeadFilter(field),
        width: field.width,
        field: field
      };
    }

    function _groupSchema(schema) {
      var groupedFields = {};
      var lastGroupName = null;

      _.each(schema, function(field, key) {
        var isGroup = field.type === 'Group';
        if (isGroup) {
          lastGroupName = key;
          groupedFields[lastGroupName] = field;
          groupedFields[lastGroupName].fields = {};
          return;
        }

        if (lastGroupName) {
          groupedFields[lastGroupName].fields[key] = field;
        } else {
          groupedFields[key] = field;
        }
      });

      return groupedFields;
    }

    function _getReadable(groupedFields, addGroups) {
      var readable = {};
      addGroups = addGroups || false;

      _.each(groupedFields, function (field, key) {
        var isReadable = _.get(field, 'fieldInfo.read', true);
        if (!isReadable) {
          return;
        }

        var isGroup = field.type === 'Group';

        if (isGroup) {
          if (addGroups) {
            readable[key] = field;
          }

          _.each(field.fields, function (field, key) {
            readable[key] = field;
          });
        } else {
          readable[key] = field;
        }
      });

      return readable;
    }

    return {
      getHeads: getHeads,
      getDetailsHeads: getDetailsHeads,
      getHeadFilter: getHeadFilter
    };

  }
})();
