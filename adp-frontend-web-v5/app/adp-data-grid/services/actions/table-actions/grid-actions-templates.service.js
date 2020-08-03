;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridActionsTemplate', GridActionsTemplate);

  /** @ngInject */
  function GridActionsTemplate(
    AdpIconsHelper,
    AdpSchemaService
  ) {
    return function (actions, cellInfo) {
      // HOTFIX: until  UNI-892 completed
      delete actions.listFilter;

      var actionElementsWithOrder = _.map(actions, function (action, name) {
        var button = $(getActionTemplate(action, name, cellInfo));
        button.append(tooltip(action, name, cellInfo));

        return {element: button, order: action.actionOrder};
      });
      var actionElements = _.map(actionElementsWithOrder.sort(AdpSchemaService.getSorter("order")),
        function (obj) {
          return obj.element;
        })

      return $('<div class="actions-column-container">').append(actionElements);
    }

    function getActionTemplate(actionItem, name, cellInfo) {
      var types = {
        action: buttonTemplate,
        link: linkTemplate,
        module: buttonTemplate,
      };

      var actionType = _.get(actionItem, 'action.type');
      var templateFn = types[actionType];

      if (_.isUndefined(templateFn)) {
        throw new Error('Unknown action type in ' + actionType);
      }

      return templateFn(actionItem, name, cellInfo);
    }

    function buttonTemplate(actionItem, name, cellInfo) {
      var index = cellInfo.rowIndex;
      var btnClass = _.compact(["btn btn-primary table-action", actionItem.className]).join(' ');
      var dataAction = actionItem.action.link +
        (actionItem.action.type==='module' && actionItem.action.method ? '.' + actionItem.action.method : '');

      return [
        '<button',
          'type="button"',
          'class="'+btnClass+'"',
          addStyles(actionItem),
          'adp-' + cellInfo.data._id,
          'data-action=' + dataAction,
          'data-action-name=' + name,
          'data-type=' + actionItem.action.type,
          'data-index=' + index,
          '>',
            createContents(actionItem),
        '</button>'
      ].join(' ');
    }

    function linkTemplate(actionItem, name, cellInfo) {
      var URL_PARAMS_REGEX = /\/:([^\/\n\r]+)/g;
      var linkClass = _.compact(["table-action", actionItem.className]).join(' ');

      var link = actionItem.action.link.replace(URL_PARAMS_REGEX, function(_, key) {
        return '/' + cellInfo.data[key];
      });

      return [
        '<a',
          addStyles(actionItem),
          'class="'+linkClass+'"',
          'href="' + link + '"',
          'adp-' + cellInfo.data._id,
          'data-action=' + actionItem.action.link,
          'data-action-name=' + name,
          '>',
          createContents(actionItem),
        '</a>'
      ].join(' ');
    }

    function addStyles(params) {
      var styles = _.pick(params, ['backgroundColor', 'borderColor', 'textColor']);
      if (_.isEmpty(styles)) {
        return '';
      }

      var resultStyles = _.map(styles, function (value, key) {
        var key = key === 'textColor' ? 'color' : key;
        return [_.kebabCase(key), ':', value, '!important'].join('');
      }).join(';');

      return 'style="' + resultStyles + '"';
    }

    function tooltip(action, name, cellInfo) {
      if (_.isUndefined(action.description)) {
        return '';
      }

      var tooltipTpl = '<div>'.concat(action.description, '</div>');
      var parentSelector = '[data-action-name=' + name + '][adp-' + cellInfo.data._id + ']';

      return $(tooltipTpl).dxTooltip({
        target: parentSelector,
        showEvent: 'dxhoverstart',
        hideEvent: 'dxhoverend',
        position: 'top',
      });
    }

    function createContents(params) {
      if (_.isUndefined(params.icon)) {
        return params.fullName;
      } else {
        return AdpIconsHelper.getIconHtml(params.icon);//'<i class="' + AdpIconsHelper.getIconClass(params.icon) + '"></i>';
      }
    }
  }
})();
