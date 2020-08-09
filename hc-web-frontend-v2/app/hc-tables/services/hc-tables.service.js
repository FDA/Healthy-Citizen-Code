;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .factory('HcTablesService', HcTablesService);

  /** @ngInject */
  function HcTablesService (
    HcSchemaService
  ){
    var typeMap = {
      'Search': { directiveType: 'lookup' },
      'Search[]': { directiveType: 'lookup' },
      'String': { directiveType: 'string' },
      'String[]': { directiveType: 'list' },
      'Select': { directiveType: 'list' },
      'Date': { directiveType: 'date' },
      'Number': { uiSubtypeType: 'number', directiveType: 'number' },
      'Boolean': { directiveType: 'boolean' }
    };
  
    function _getHeadFilter(field) {
      var type = HcSchemaService.getTypeProps(field);
      
      return typeMap[type] || {};
    }
    
    function getHeads(schema){
      var heads = [];
    
      _.each(schema, function (val, key){
        var isField = val.type !== 'Schema' && val.type !== 'Subschema' && val.visible;
      
        if (isField) {
          var head = {
            name: key,
            order: val.visibilityPriority,
            fullName: val.fullName,
            type: HcSchemaService.getTypeProps(val),
            filter: _getHeadFilter(val)
          };
          
          heads.push(head);
        }
      });
    
      return _.sortBy(heads, 'order');
    }
  
    return {
      getHeads: getHeads
    };
  
  }
})();
