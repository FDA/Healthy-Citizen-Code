;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridActionsTemplate', GridActionsTemplate);

  /** @ngInject */
  function GridActionsTemplate() {
    return function(actions, cellInfo) {
      var actionElements = _.map(actions, function (action, name) {
        var button = $(getActionTemplate(action, name, cellInfo));
        button.append(tooltip(action, name, cellInfo));

        return button;
      });

      return $('<div class="actions-column-container">').append(actionElements);
    }

    function getActionTemplate(actionItem, name, cellInfo) {
      var types = {
        action: buttonTemplate,
        link: linkTemplate,
      };

      var templateFn = types[actionItem.action.type];
      if (_.isUndefined(templateFn)) {
        throw new Error('Unknown action type in ' + actionItem);
      }

      return templateFn(actionItem, name, cellInfo);
    }

    function buttonTemplate(actionItem, name, cellInfo) {
      var index = cellInfo.rowIndex;
      var btnClass = 'class="btn btn-primary table-action"';

      return [
        '<button',
          'type="button"',
          btnClass,
          addStyles(actionItem),
          'adp-' + cellInfo.data._id,
          'data-action=' + actionItem.action.link,
          'data-action-name=' + name,
          'data-index=' + index,
          '>',
            createContents(actionItem),
        '</button>'
      ].join(' ');
    }

    function linkTemplate(actionItem, name, cellInfo) {
      var URL_PARAMS_REGEX = /\/:([^\/\n\r]+)/g;

      var link = actionItem.action.link.replace(URL_PARAMS_REGEX, function(_, key) {
        return '/' + cellInfo.data[key];
      });

      return [
        '<a',
          addStyles(actionItem),
          'class="table-action"',
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
        return  params.fullName;
      } else {
        return '<i class="fa fa-fw fa-' + params.icon.link + '"></i>';
      }
    }
  }
})();
