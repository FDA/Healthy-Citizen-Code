;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('TreeView', TreeView);

  /** @ngInject */
  function TreeView() {
    /**
     *
     * @param {Object} data
     * @param {Object} options
     * @return {jQuery}
     */
    function create(data, options) {
      options = options || {};

      if (options.asText) {
        return createAsText(data);
      } else {
        return createAsHtml(data, options);
      }
    }

    function createAsHtml(data, options) {
      var td = $('<div>');

      td.dxTreeView({
        animationEnabled: false,
        expandEvent: 'click',
        items: [data],
        /*onItemClick: function(e) {
          var jqueryEvent = e.event;
          jqueryEvent.stopImmediatePropagation();
          return false;
        },*/
        itemTemplate: function (itemData) {
          return itemData.text;
        }
      });

      expand(td, options.expand);

      return td;
    }

    function createAsText(data) {
      var items = data.items ? data.items.map(function (item) {
        return createAsText(item)
      }).join('; ') : '';
      var res = data.text + (items ? ': {' + items + '}' : '');

      return res;
    }

    function expand(treeNode, level) {
      if (level === 'all') {
        expandAll(treeNode)
      } else {
        expandFirstLevel(treeNode);
      }
    }

    function expandAll(treeNode) {
      getInstance(treeNode).expandAll();
    }

    function expandFirstLevel(treeViewNode) {
      var instance = getInstance(treeViewNode);

      instance.getNodes().forEach(function (node) {
        instance.expandItem(node.key);
      });
    }

    function getInstance(node) {
      return node.dxTreeView('instance');
    }

    return {
      create: create,
    }
  }
})();
