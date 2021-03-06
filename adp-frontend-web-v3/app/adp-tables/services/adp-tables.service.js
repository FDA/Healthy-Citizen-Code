;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .factory('AdpTablesService', AdpTablesService);

  /** @ngInject */
  function AdpTablesService (
AdpSchemaService
  ){
    var fileTypeProps = { directiveType: 'string', uiSubtypeType: 'file' };
    var typeMap = {
      'Search': { directiveType: 'lookup' },
      'Search[]': { directiveType: 'lookup' },
      'String': { directiveType: 'string', uiSubtypeType: 'string' },
      'String[]': { directiveType: 'list' },
      'Select': { directiveType: 'list' },
      'Date': { directiveType: 'date' },
      'Number': { directiveType: 'number', uiSubtypeType: 'number' },
      'Boolean': { directiveType: 'boolean' },
      'File': fileTypeProps,
      'Image': fileTypeProps,
      'Audio': fileTypeProps,
      'Video': fileTypeProps,
      'File[]': fileTypeProps,
      'Image[]': fileTypeProps,
      'Audio[]': fileTypeProps,
      'Video[]': fileTypeProps,
    };
  
    function _getHeadFilter(field) {
      var type = AdpSchemaService.getTypeProps(field);
      
      return typeMap[type] || typeMap['String'];
    }

    function _isVisible(field) {
      var isVisible = 'showInDatatable' in field ? field.showInDatatable : field.visible;
      if (typeof isVisible === 'boolean') {
        return isVisible;
      } else if (typeof isVisible === 'string') {
        return isVisible === 'true';
      }
      return false;
    }
    
    function getHeads(schema){
      var heads = [];

      _.each(schema, function (val, key){
        var isField = val.type !== 'Schema' && val.type !== 'Subschema' && _isVisible(val);
        var isGroup = val.type === 'Group';
      
        if (isField && !isGroup) {
          heads.push(_getHead(val, key));
        }
      });
    
      return _.sortBy(heads, 'order');
    }

    function _getHead(val, key) {
      return {
        name: key,
        order: val.visibilityPriority,
        responsivePriority: val.responsivePriority,
        fullName: val.fullName,
        type: AdpSchemaService.getTypeProps(val),
        filter: _getHeadFilter(val),
        width: val.width
      };
    }
  
    return {
      getHeads: getHeads
    };
  
  }
})();
