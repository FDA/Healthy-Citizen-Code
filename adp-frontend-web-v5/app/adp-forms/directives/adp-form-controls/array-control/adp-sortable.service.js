;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .service('AdpSortable', AdpSortable);

  // overrides @shopify/Draggable.Sortable "onDragOver" method
  // purpose of service is to remove DOM manipulation and only provide
  // cb with events params
  // this allows angularjs manage DOM manipulation itself
  /** @ngInject */
  function AdpSortable() {

    var SortableConstructor = window.Sortable.default;
    function _AdpSortable(containers, options) {
      SortableConstructor.call(this, containers, options);
    }

    _AdpSortable.prototype = Object.create(SortableConstructor.prototype);

    var onDragOver = Object.getOwnPropertySymbols(SortableConstructor.prototype)[2];
    _AdpSortable.prototype[onDragOver] = function (event) {
      if (event.over === event.originalSource || event.over === event.source) {
        return;
      }

      var oldIndex = this.index(event.source);
      var sortableSortEvent = new window.Sortable.SortableSortEvent({
        dragEvent: event,
        currentIndex: oldIndex,
        source: event.source,
        over: event.over,
      });

      this.trigger(sortableSortEvent);

      if (sortableSortEvent.canceled()) {
        return;
      }

      const moves = move(event);
      if (!moves) {
        return;
      }

      const newIndex = this.index(event.over);
      const sortableSortedEvent = new window.Sortable.SortableSortedEvent({
        dragEvent: event,
        oldIndex: oldIndex,
        newIndex: newIndex,
        oldContainer: moves.oldContainer,
        newContainer: moves.newContainer,
      });

      this.trigger(sortableSortedEvent);
    };


    return _AdpSortable;
  }

  function move(dragInfo) {
    var parentNode = dragInfo.source.parentNode;
    var differentContainer = parentNode !== dragInfo.overContainer;
    var sameContainer = dragInfo.over && !differentContainer;

    if (!sameContainer) {
      return null;
    }

    return {
      oldContainer: parentNode,
      newContainer: parentNode,
    };
  }
})();
