;(function () {
  "use strict";
  var TOOLBAR_POSITION_SIGNATURE = "grid.top";

  angular
    .module("app.adpDataGrid")
    .factory("GridToolbarActions", GridToolbarActions);

  /** @ngInject */
  function GridToolbarActions(
    $location,
    AdpClientCommonHelper,
    ActionsHandlers,
    AdpIconsHelper,
    AdpUnifiedArgs,
    ActionsHelpers,
    GridActionsTemplate,
    GridOptionsHelpers
  ) {
    var actionFactoriesByType = {
      "action": getForHelperType,
      "link": getForLinkType,
      "module": ActionsHelpers.getForModuleType,
    };
    var toolbarActions = {
      "create": createAddAction,
      "group": assignGroupingToColumns,
      "search": searchAddAction,
    };

    return function (gridOptions, schema, customGridOptions) {
      var actions = ActionsHelpers.getActionsByPosition(schema, function (action) {
        var position = _.get(action, 'position', '');
        return _.startsWith(position, TOOLBAR_POSITION_SIGNATURE);
      });

      GridOptionsHelpers.addToolbarHandler(gridOptions, function (e) {
        removeUnnecessary(e);
      });

      _.each(actions, function (action) {
        var actionType = _.get(action, "action.type", "")
        var actionLink = _.get(action, "action.link", "")
        var actionFactory = actionFactoriesByType[actionType];
        var actionMethod = actionFactory && actionFactory(actionLink, action);

        if (_.isFunction(actionMethod)) {
          var actionOptions = {
            title: action.fullName || "",
            description: action.description || "",
            location: getLocalPosition(action.position),
            sortIndex: action.actionOrder,
            icon: action.icon,
            className: action.className,
            locateInMenu: action.locateInMenu || "auto",
            table: action.table,
            params: action.params,
          };
          var context = AdpUnifiedArgs.getHelperParamsWithConfig({
            path: "",
            formData: null,
            action: "toolbarAction",
            schema: schema,
          });

          context.fieldSchema = action;
          context.customGridOptions = customGridOptions;
          context.gridOptions = gridOptions;
          context.actionOptions = actionOptions;

          actionMethod.call(context, getWidgetRegistrator(context));
        }
      })
    }

    function getWidgetRegistrator(widgetArgs) {
      var gridOptions = widgetArgs.gridOptions;
      var actionOptions = widgetArgs.actionOptions;
      var action = widgetArgs.fieldSchema;
      var schema = widgetArgs.modelSchema;

      return function (getWidgetOptions) {
        GridOptionsHelpers.addToolbarHandler(gridOptions, function (e) {
          var itemOptions = getWidgetOptions(e.component, e);

          if (itemOptions) {
            var widgetOptions = Object.assign(itemOptions, actionOptions);

            widgetOptions.cssClass = (widgetOptions.cssClass || "") + " adp-toolbar-action-" + action.__name;

            if (widgetOptions.options) {
              widgetOptions.options.disabled = ActionsHelpers.evalDisabledAttr(action, null, schema);
            }

            e.toolbarOptions.items.unshift(widgetOptions);
          }
        });
      }
    }

    function getForHelperType(actionName) {
      var actionMethod = toolbarActions[actionName];

      if (actionMethod) {
        return actionMethod;
      }

      actionMethod = ActionsHelpers.getForHelperType(actionName);

      if (actionMethod) {
        return getHelperButtonFactory(actionMethod);
      }
    }

    function getForLinkType(linkUrl) {
      return function (widgetRegistator) {
        var actionOptions = this.actionOptions;
        var className = "adp-toolbar-menu grid-view-menu " + (actionOptions.className || "");
        var buttonSpec;

        if (actionOptions.icon) {
          buttonSpec = {template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions, {className: className})};
        } else {
          buttonSpec = {text: actionOptions.title}
        }

        return widgetRegistator(function () {
          return {
            widget: "dxMenu",
            options: {
              dataSource: [buttonSpec],
              cssClass: className,
              onItemClick: function () {
                $location.path(linkUrl);
              }
            }
          }
        });
      }
    }

    function createAddAction(toolbarWidgetRegister) {
      var schema = this.modelSchema;
      var actionOptions = this.actionOptions;
      var buttonText = actionOptions.title || "Create New";
      var className = "btn page-action btn-primary " + (actionOptions.className || "");
      var customOptions = this.customGridOptions;
      var row = this.row;
      var actionItem = this.fieldSchema;
      var disabled = ActionsHelpers.evalDisabledAttr(actionItem, row, schema) ? ' disabled' : '';

      return toolbarWidgetRegister(function () {
        return {
          name: 'createButton',
          widget: 'dxButton',
          template: '<button type="button" class="' + className + '" ' + disabled + '>' + buttonText + '</button>',
          onClick: function () {
            ActionsHandlers.create(schema)
              .then(function () {
                GridOptionsHelpers.refreshGrid(customOptions.gridComponent);
              });
          },
        }
      })
    }

    function getHelperButtonFactory(actionCb) {
      return function (toolbarWidgetRegister) {
        var self = this;

        return toolbarWidgetRegister(function () {
          return {
            widget: "dxMenu",
            options: {
              dataSource: [{template: AdpClientCommonHelper.getMenuItemTemplate(self.actionOptions)}],
              cssClass: "adp-toolbar-menu grid-view-menu",
              onItemClick: function () {
                actionCb.call(self)
              },
            },
          };
        });
      }
    }

    function assignGroupingToColumns(toolbarWidgetRegister) {
      var gridOptions = this.gridOptions;
      var actionOptions = this.actionOptions;
      var self = this;

      gridOptions.columns.forEach(function (column) {
        var field = self.modelSchema.fields[column.dataField];
        if (!field) {
          return;
        }
        var grp = _.get(field, "parameters.grouping", {});
        _.assign(column, grp);
      });

      gridOptions.groupPanel = {visible: true};
      if (actionOptions.title) {
        gridOptions.groupPanel.emptyPanelText = actionOptions.title;
      }

      return toolbarWidgetRegister(function (gridComponent, toolbarEvent) {
        return getReInsertItem(toolbarEvent.toolbarOptions.items, "groupPanel", self.actionOptions)
      })
    }

    function searchAddAction(toolbarWidgetRegister) {
      var actionOptions = this.actionOptions;

      this.gridOptions.searchPanel = {
        visible: true,
        placeholder: actionOptions.title || "Search..."
      };

      return toolbarWidgetRegister(function (gridComponent, toolbarEvent) {
        return getReInsertItem(toolbarEvent.toolbarOptions.items, "searchPanel", actionOptions)
      })
    }

    function getReInsertItem(items, itemName, actionOptions) {
      var found = _.remove(items, function (item) {
        return item.name === itemName
      })

      if (found.length) {
        return Object.assign(found[0], actionOptions);
      }
    }

    function getLocalPosition(position) {
      var setting = position.substr(TOOLBAR_POSITION_SIGNATURE.length + 1);
      var location = {left: "before", center: "center"}[setting];

      return location || "after";
    }

    function removeUnnecessary(e) {
      // we have to remove columnChooser from toolbar because we add custom one.
      // Disabling columnChooser by grid config is not an option!

      e.toolbarOptions.items = _.filter(e.toolbarOptions.items, function (item) {
        return item.name !== "columnChooserButton"
      })
    }
  }
})();
