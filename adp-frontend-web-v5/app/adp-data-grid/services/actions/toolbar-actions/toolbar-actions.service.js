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
    AdpSchemaService,
    GridActionsTemplate,
    GridOptionsHelpers
  ) {
    var actionFactoriesByType = {
      "action": getForHelperType,
      "link": getForLinkType,
      "module": getForModuleType,
    };
    var toolbarActions = {
      "create": createAddAction,
      "group": assignGroupingToColumns,
      "search": searchAddAction,
    };

    return function (gridOptions, schema, customGridOptions) {
      var actions = getToolbarActions(schema);

      GridOptionsHelpers.addToolbarHandler(gridOptions, function (e) {
        removeUnnecessary(e);
      });

      _.each(actions, function (action) {
        var actionType = _.get(action, "action.type", "")
        var actionLink = _.get(action, "action.link", "")
        var actionFactory = actionFactoriesByType[actionType];
        var actionMethod = actionFactory(actionLink, action);

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
          };
          var context = {
            schema: schema,
            customGridOptions: customGridOptions,
            gridOptions: gridOptions,
            actionOptions: actionOptions
          };

          actionMethod.call(context, getWidgetRegistrator(gridOptions, actionOptions, action));
        }
      })
    }

    function getWidgetRegistrator(gridOptions, actionOptions, action) {
      return function (getWidgetOptions) {
        GridOptionsHelpers.addToolbarHandler(gridOptions, function (e) {
          var itemOptions = getWidgetOptions(e.component, e);

          if (itemOptions) {
            var widgetOptions = Object.assign(itemOptions, actionOptions);

            widgetOptions.cssClass = (widgetOptions.cssClass || "") + " adp-toolbar-action-" + action.__name;

            e.toolbarOptions.items.unshift(widgetOptions);
          }
        });
      }
    }

    function getForHelperType(actionName) {
      var defaultAction = toolbarActions[actionName];

      if (defaultAction) {
        return defaultAction;
      }

      var helperAction = _.get(appModelHelpers, "CustomActions." + actionName);
      if (helperAction) {
        return getHelperButtonFactory(helperAction);
      }
    }

    function getForLinkType(linkUrl) {
      return getLinkButton(linkUrl);
    }

    function getForModuleType(moduleName, action) {
      var injector = angular.element(document)
        .injector();

      if (injector.has(moduleName)) {
        var methodName = _.get(action, "action.method");
        var moduleReturn = injector.get(moduleName);

        if (methodName) {
          return moduleReturn[methodName]();
        } else {
          return moduleReturn;
        }
      } else {
        console.error("No module found for grid-top action:", moduleName);
      }
    }

    function getLinkButton(linkUrl) {
      return function (widgetRegistator) {
        var actionOptions = this.actionOptions;
        var className = "adp-toolbar-menu grid-view-menu " + (actionOptions.className || "");
        var buttonSpec;

        if (actionOptions.icon) {
          buttonSpec = {icon: AdpIconsHelper.getIconClass(actionOptions.icon), hint: actionOptions.title, cssClass: className}
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
      var schema = this.schema;
      var actionOptions = this.actionOptions;
      var buttonText = actionOptions.title || "Create New";
      var className = "btn page-action btn-primary " + actionOptions.className;
      var customOptions = this.customGridOptions;
      return toolbarWidgetRegister(function () {
        return {
          name: "createButton",
          widget: "dxButton",
          template: "<button type=\"button\" class=\"" + className + "\">" + buttonText + "</button>",
          onClick: function () {
            ActionsHandlers.create(schema)
              .then(function () {
                GridOptionsHelpers.refreshGrid(customOptions.gridComponent);
              });
          }
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
        var field = self.schema.fields[column.dataField];
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

    function getToolbarActions(schema) {
      var actions = _.get(schema, "actions.fields", {});
      actions = _.map(actions,
        function (item, name) {
          if (item.position &&
            item.position.substr(0, TOOLBAR_POSITION_SIGNATURE.length) === TOOLBAR_POSITION_SIGNATURE) {
            item.__name = name;
            return item;
          } else {
            return null;
          }
        });

      actions = _.compact(actions);
      actions.sort(AdpSchemaService.getSorter('actionOrder'));

      return actions;
    }

    function getLocalPosition(position) {
      return position.substr(TOOLBAR_POSITION_SIGNATURE.length + 1) === "left" ? "before" : "after";
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
