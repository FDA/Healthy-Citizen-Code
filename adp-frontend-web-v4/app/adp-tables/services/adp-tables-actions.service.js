;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .factory('AdpTablesActionsService', AdpTablesActionsService);

  /** @ngInject */
  function AdpTablesActionsService() {
    function createActions(actions, rowData, tableIndex) {
      var filteredActions = {};

      _.each(actions.fields, function(action, actionName) {
        if (!rowData._actions[actionName]) return;

        // check action.showInTable is false
        if ('showInTable' in action && _.isEmpty(action.showInTable)) return;

        filteredActions[actionName] = action;
      });

      return _.map(filteredActions, function(action, name) {
        if (action.action.type === 'action') {
          return btnTpl(action, name, tableIndex, rowData);
        } else {
          return linkTpl(action, name, tableIndex, rowData)
        }
      }).join('\n');
    }

    function btnTpl(params, name, index, data) {
      return [
        '<button',
          'type="button"',
          getClass(name),
          addStyles(params),
          'data-action=' + params.action.link,
          'data-index=' + index,
          params.fullName ? 'title="' + params.fullName + '"' : '',
        '>',
          '<i class="fa fa-fw fa-' + params.icon.link + '"></i>',
          tooltip(params),
        '</button>'
      ].join(' ');
    }

    function linkTpl(params, name, index, data) {
      var URL_PARAMS_REGEX = /\/:([^\/\n\r]+)/g;

      var link = params.action.link.replace(URL_PARAMS_REGEX, function(_, key) {
        return '/' + data[key];
      });

      return [
        '<a',
          getClass(name),
          addStyles(params),
          'href="' + link + '"',
          'data-index=' + index,
          getHint(params),
        '>',
          createContents(params),
          tooltip(params),
        '</a>'
      ].join(' ');
    }

    function tooltip(params) {
      return params.description ? '<span class="table-action-tooltip">' + params.description + '</span>' : '';
    }

    function createContents(params) {
      if (params.fullName && 'icon' in params) {
        return '<i class="fa fa-fw fa-' + params.icon.link + '"></i>';
      }

      if (params.fullName && !('icon' in params)) {
        return  params.fullName;
      }
    }

    function getHint(params) {
      if (params.fullName && 'icon' in params) {
        return 'title="' + params.fullName + '"';
      } else {
        return '';
      }
    }

    function getClass(name) {
      var CLASSES = {
        'update': 'class="btn btn-success table-action"',
        'delete': 'class="btn btn-danger table-action"'
      };

      return CLASSES[name] || 'class="btn btn-primary table-action"';
    }


    function addStyles(params) {
      var styles = {
        backgroundColor: 'background-color',
        borderColor: 'border-color',
        textColor: 'color'
      };
      var resultStyles = [];

      _.each(styles, function(val, key) {
        if (key in params) {
          var rule = styles[key] + ':' + params[key] + ' !important';
          resultStyles.push(rule);
        }
      });

      return resultStyles.length > 0 ? 'style="' + resultStyles.join(';') + '"' : '';
    }

    return {
      createActions: createActions
    };
  }
})();
