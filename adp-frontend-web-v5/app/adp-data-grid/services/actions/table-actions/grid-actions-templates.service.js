;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridActionsTemplate', GridActionsTemplate);

  /** @ngInject */
  function GridActionsTemplate(
    AdpIconsHelper,
    ActionsHandlers,
    AdpUnifiedArgs,
    GridOptionsHelpers,
    AdpSchemaService,
    ActionsHelpers
  ) {
    var layoutFactories = {
      menu: menuTemplate,
      spread: spreadButtonsTemplate,
    }

    return function (actions, cellInfo, schema, customGridOptions) {
      // HOTFIX: until UNI-892 completed
      delete actions.listFilter;

      var layoutName = _.get(schema, 'recordActionsLayout', 'spread');
      var layoutFactory = layoutFactories[layoutName] || spreadButtonsTemplate;
      var sortedActions = _.map(actions, function (action, name) {
        action.actionName = name;

        return action;
      }).sort(AdpSchemaService.getSorter('actionOrder'));
      var element = layoutFactory({
        actions: sortedActions,
        cellInfo: cellInfo,
        schema: schema,
        customGridOptions: customGridOptions
      });

      return $("<div class='actions-column-container actions-layout-"+layoutName+"' adp-"+cellInfo.data._id+">").append(element);
    }

    function menuTemplate(params) {
      var actionItems = _.map(params.actions, function (action) {
        var icon = _.isUndefined(action.icon) ? menuEmptyIconSpace() : AdpIconsHelper.getIconHtml(action.icon);
        var title = action.fullName || action.description;
        var data = _.get(params, 'cellInfo.data', {});
        var itemHtml;

        if (action.action.type === 'link') {
          itemHtml = '<a href="' + getLinkActionUrl(action, params) + '">';
        } else {
          itemHtml = '<div>';
        }

        return {
          disabled: ActionsHelpers.evalDisabledAttr(action, data, params.schema),
          template: $(itemHtml).attr('data-action-name', action.actionName).append(icon).append(title),
          action: action.actionName,
        };
      });

      var menuDataSource = [{
        template: "<button class='adp-action-b-tertiary'><i class='fa fa-sort-desc'></i></button>",
        items: actionItems,
      }];

      return $("<div>").dxMenu({
        dataSource: menuDataSource,
        onItemClick: function (event) {
          var actionItem = event.itemData && _.find(params.actions, function (item) {
            return item.actionName === event.itemData.action && item.action.type !== 'link'
          });

          actionItem && handleActionClick(actionItem, params)();
        },
        cssClass: "adp-table-actions-menu",
        elementAttr: {
          class: "adp-" + params.cellInfo.data._id,
        },
      });
    }

    function menuEmptyIconSpace() {
      return "<i class='adp-empty-icon'></i>";
    }

    function spreadButtonsTemplate(params) {
      return _.map(params.actions, function (action) {
        return $(getActionSpreadTemplate(action, params));
      });
    }

    function getActionSpreadTemplate(actionItem, params) {
      var types = {
        action: buttonTemplate,
        link: linkTemplate,
        module: buttonTemplate,
      };

      var actionType = _.get(actionItem, "action.type");
      var templateFn = types[actionType];

      if (_.isUndefined(templateFn)) {
        throw new Error("Unknown action type in " + actionType);
      }

      return templateFn(actionItem, params);
    }

    function buttonTemplate(actionItem, params) {
      var btnClass = _.compact(["adp-grid-action table-action", actionItem.className]).join(" ");
      var data = _.get(params, 'cellInfo.data', {});

      return $("<button>")
        .dxButton({
          elementAttr: {
            class: btnClass,
            "data-action-name": actionItem.actionName,
            style: addStyles(actionItem),
            type: 'button',
          },
          disabled: ActionsHelpers.evalDisabledAttr(actionItem, data, params.schema),
          hint: actionItem.description,
          onClick: handleActionClick(actionItem, params),
          template: createContents(actionItem),
        });
    }

    function linkTemplate(actionItem, params) {
      var linkClass = _.compact(["table-action", actionItem.className]).join(" ");
      var link = getLinkActionUrl(actionItem, params);

      return [
        "<a",
        "style=\"" + addStyles(actionItem) + "\"",
        "class=\"" + linkClass + "\"",
        "href=\"" + link + "\"",
        "adp-" + params.cellInfo.data._id,
        "data-action=" + actionItem.action.link,
        "data-action-name=" + actionItem.actionName,
        ">",
        "<span>",
        createContents(actionItem),
        "</span>",
        "</a>"
      ].join(" ");
    }

    function addStyles(params) {
      var styles = _.pick(params, ["backgroundColor", "borderColor", "textColor"]);
      if (_.isEmpty(styles)) {
        return "";
      }

      return _.map(styles, function (value, key) {
        return [_.kebabCase(key === "textColor" ? "color" : key), ":", value, "!important"].join("");
      }).join(";");
    }

    function createContents(actionItem) {
      if (_.isUndefined(actionItem.icon)) {
        return actionItem.fullName;
      } else {
        return AdpIconsHelper.getIconHtml(actionItem.icon);
      }
    }

    function handleActionClick(actionItem, params) {
      var actionType = actionItem.action.type;

      if (actionType === 'module') {
        return callModuleAction(actionItem, params);
      } else {
        var actionFnName = getActionCallbackName(actionItem);
        var hasCustomAction = _.hasIn(appModelHelpers.CustomActions, actionFnName);
        if (hasCustomAction) {
          return callCustomAction(actionItem, params);
        }

        if (_.hasIn(ActionsHandlers, actionFnName)) {
          return callBuiltInAction(actionItem, params);
        }
      }
    }

    function callCustomAction(actionItem, params) {
      return function () {
        var actionFnArgs = AdpUnifiedArgs.getHelperParamsWithConfig({
          path: "",
          formData: params.cellInfo.data,
          action: actionItem.actionName,
          schema: params.schema,
        });

        var actionCallbackName = getActionCallbackName(actionItem);
        var customActionFn = _.get(appModelHelpers, "CustomActions." + actionCallbackName);
        customActionFn.call(actionFnArgs, params.cellInfo.data);
      }
    }

    function callBuiltInAction(actionItem, params) {
      return function () {
        var actionFnName = getActionCallbackName(actionItem);
        var gridInstance = _.get(params, 'customGridOptions.gridComponent');

        ActionsHandlers[actionFnName](params.schema, params.cellInfo.data, gridInstance);
      }
    }

    function callModuleAction(actionItem, params) {
      return function () {
        var injector = angular.element(document).injector();
        var actionFnArgs = AdpUnifiedArgs.getHelperParamsWithConfig({
          path: "",
          formData: params.cellInfo.data,
          action: actionItem.actionName,
          schema: params.schema,
        });
        var actionCallback = getActionCallbackName(actionItem).split(".");
        var actionModule = actionCallback[0];
        var actionMethod = actionCallback[1];

        if (injector.has(actionModule)) {
          var customActionFn = injector.get(actionModule);

          if (actionMethod) {
            customActionFn = customActionFn[actionMethod];
          }

          if (_.isFunction(customActionFn)) {
            customActionFn.apply(actionFnArgs, [params.cellInfo.data, params.customGridOptions.gridComponent]);
          }
        }
      }
    }

    function getActionCallbackName(actionItem) {
      return actionItem.action.link +
        (actionItem.action.type === "module" && actionItem.action.method ? "." + actionItem.action.method : "");
    }

    function getLinkActionUrl(actionItem, params) {
      var URL_PARAMS_REGEX = /\/:([^\/\n\r]+)/g;

      return actionItem.action.link.replace(URL_PARAMS_REGEX, function (_0, key) {
        return '/' + _.get(params.cellInfo.data, key);
      });
    }
  }
})();
