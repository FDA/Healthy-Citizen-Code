;(function () {
  'use strict';
  
  angular
    .module('app.hcTables')
    .directive('hcListFilter', hcListFilter);
  
  function hcListFilter (LISTS) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        listName: '=',
        serverSide: '='
      },
      templateUrl: 'app/hc-tables/directives/hc-table-filters/hc-list-filter/hc-list-filter.html',
      link: function (scope, element) {
        scope.list = LISTS[scope.listName];
  
        var columnIndex = $(element).closest('th').index();
        var $select = $(element).find('select');
        $select.select2();

        if (!scope.serverSide) applyDTFilters();
        
        function applyDTFilters() {
          $.fn.dataTable.ext.search.push(listFilter);
  
          function listFilter(settings, data){
            var values = $select.val();
            
            var data = _.first(data[columnIndex].split(' ')) || '';
  
            if (!values) return true;
  
            if (!data.split(',').length) {
              return _.indexOf(values, data) !== -1;
            } else {
              return _.intersection(data.split(','), values).length > 0;
            }
          }
          
        }
        
        $(element).on('change keyup', 'select', function () {
          var searchParams = {
            index: columnIndex,
            serverSideParams: {
              filter: 'list',
              val: $select.val()
            }
          };
          
          scope.$emit('redraw', searchParams);
        });
      }
    }
  }
})();
