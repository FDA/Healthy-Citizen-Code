;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arraySortable', arraySortable);

  function arraySortable(
  ) {
    return {
      restrict: 'A',
      scope: {
        onSorted: '=',
        onStop: '=',
        arraysPath: '=',
      },
      link: function (scope, element) {
        var removeWatcher = scope.$watch('arraysPath', function (arraysPath) {
          if (!arraysPath) {
            return;
          }

          var sortable = createSortable(element[0], arraysPath);
          bindEvents(sortable);
          removeWatcher();
        });

        function createSortable(sortableContainer, arraysPath) {
          var draggableSelector = '[ng-array-parent-path="' + arraysPath + '"]';

          return new Draggable.Sortable(sortableContainer, {
            draggable: draggableSelector,
            handle: draggableSelector + ' > .subform-frame > .subform-frame__title',
            delay: 300,
            mirror: {
              constrainDimensions: true,
              appendTo: 'body',
              xAxis: false,
            },
          });
        }

        function bindEvents(sortable) {
          // workaround: setting dimensions to mirror(draggable placeholder because
          // draggable is binded to ng-form, which has dimensions 0x0
          sortable.on('mirror:attached', function (event) {
            var formFrame = event.data.dragEvent.source.children[0];
            var dimensions = formFrame.getBoundingClientRect();

            var mirrorsFormFrame = event.mirror.children[0]
            var BORDER_WIDTH = 4;
            $(mirrorsFormFrame).css({
              width: dimensions.width,
              height: dimensions.height + BORDER_WIDTH,
            });
            $(mirrorsFormFrame).addClass('smart-form');
          });

          sortable.on('sortable:sorted', scope.onSorted);
          sortable.on('sortable:stop', scope.onStop);

          scope.$on('$destroy', function () {
            sortable && sortable.destroy();
          });
        }
      }
    }
  }
})();
