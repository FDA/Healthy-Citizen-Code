;(function () {
  'use strict';

  angular
    .module('app.adpRolesPermissionsEditor', [])
    .controller('AdpRolesPermissionsEditor', RolesPermissionsEditor);

  /** @ngInject */
  function RolesPermissionsEditor(
    APP_CONFIG,
    AdpSchemaService,
    ActionsHandlers,
    AdpNotificationService,
    GridActionsTemplate,
    ActionsHelpers,
    GraphqlCollectionQuery,
    GraphqlCollectionMutator,
    ErrorHelpers
  ) {
    var vm = this;
    var gridComponent;
    var lastSortingIndex;
    var rolesSchema = AdpSchemaService.getSchemaByName('roles');
    var permissions = rolesSchema.fields.permissions.list;

    vm.isSaving = false;
    vm.apiUrl = APP_CONFIG.apiUrl;

    vm.$onInit = function () {
      loadRoles()
        .then(transformLoadedRoles)
        .then(function (roles) {
          var options = getGridOptions(roles);

          $('#rp-grid-container').dxDataGrid(options);

          vm.onSave = getSaveHandler(roles);
          vm.createRole = function () {
            ActionsHandlers.create(rolesSchema, null, gridComponent).then(reloadRoles);
          }
        })
    }

    function onPermissionChange(role, permission, operationAdd) {
      role.isChanged = true;
      role.permObj[permission] = operationAdd;
    }

    function getSaveHandler(roles) {
      return function () {
        var rolesToSave = _.filter(roles, function (role) {
          return role.isChanged
        })

        if (!rolesToSave.length) {
          AdpNotificationService.notifySuccess('Nothing to be saved');
          return;
        }

        var promises = _.map(rolesToSave, function (role) {
          var record = roleToRecord(role);

          record.permissions = _.transform(
            _.omit(role.permObj, ['accessAsGuest', 'accessAsUser']),
            function (acc, val, key) {
              val && acc.push(key)
            }, []);

          return GraphqlCollectionMutator
            .update(rolesSchema, record)
            .then(function () {
              role.isChanged = false;
            });
        });

        vm.isSaving = true;

        return Promise.all(promises)
          .then(function () {
            AdpNotificationService.notifySuccess('All changes are saved successfully');
          })
          .catch(function (error) {
            ErrorHelpers.handleError(error, 'Unknown error while saving roles');
            throw error;
          })
          .finally(function () {
            vm.isSaving = false;
          })
      }
    }

    function getColumnsOptions(roles) {
      var columns = _.map(roles, function (role, index) {
        return getRoleColumnOptions(role, index);
      });

      columns.unshift(getFirstColumnOptions());

      return columns;
    }

    function getFirstColumnOptions() {
      return {
        cssClass: 'perm-name perm-td',
        caption: '',
        fixed: true,
        dataField: 'title',
        width: 220,
        customizeText: function (event) {
          return makeNaturalName(event.value);
        },
        headerCellTemplate: function (container, headerCellInfo) {
          container.append(getSortingClickHeader(headerCellInfo.component, 0, 'Permissions'));
        }
      }
    }

    function getRoleColumnOptions(role, index) {
      var roleName = role.name;
      var rolesActions = ActionsHelpers.pickTableActions(rolesSchema);

      return {
        cssClass: 'perm-td',
        caption: makeNaturalName(roleName),
        dataField: getDataFieldName(index),
        cellTemplate: function (container, cellInfo) {
          var permName = cellInfo.data.name;

          container.append($('<input type=\'checkbox\'/>')
            .attr('checked', cellInfo.value)
            .attr('title', 'Permission \'' + permName + '\' to Role \'' + roleName + '\'')
            .click(function (e) {
              onPermissionChange(role, permName, e.currentTarget.checked)
            })
          );
        },
        headerCellTemplate: function (container, headerCellInfo) {
          var actionPermissionsForRecord = role._actions;
          var rolePermittedActions = _.pickBy(rolesActions, function (actionItem, name) {
            return _.get(actionPermissionsForRecord, name, false);
          });

          container.append(getSortingClickHeader(headerCellInfo.component, index + 1, makeNaturalName(roleName)));

          if (!ActionsHelpers.actionsIsEmpty(rolePermittedActions)) {
            var cellInfo = headerCellInfo;

            cellInfo.data = roleToRecord(role);

            var $actionsDropdown = GridActionsTemplate(rolePermittedActions, cellInfo, rolesSchema, {
              gridComponent: gridComponent
            });

            $actionsDropdown.find('.dx-menu')
              .click(function (e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
              });

            var $actionsDropdownContainer = getDropdownContainer();

            $actionsDropdownContainer.append($actionsDropdown)
              .click(function (e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
              });

            container.parent()
              .append($actionsDropdownContainer);
          }
        }
      }
    }

    function getSortingClickHeader(component, colIndex, title) {
      return $('<div/>')
        .text(title)
        .click(
          function () {
            var currentSorting = component.columnOption(colIndex, 'sortOrder');

            component.columnOption(colIndex, {
              sortOrder: currentSorting === 'asc' ? 'desc' : 'asc',
              sortIndex: 0
            });

            if (!_.isUndefined(lastSortingIndex) && lastSortingIndex !== colIndex) {
              component.columnOption(lastSortingIndex, 'sortOrder', undefined);
            }

            lastSortingIndex = colIndex;
          }
        );
    }

    function getDropdownContainer() {
      return $('<div/>')
        .addClass('rp-role-actions-dropdown-container');
    }

    function getDataSource(roles) {
      return _.map(permissions, function (permission, name) {
        var row = {name: name, title: permission};

        _.each(roles, function (role, index) {
          row[getDataFieldName(index)] = !!role.permObj[permission];
        });

        return row;
      })
    }

    function getGridOptions(roles) {
      return {
        dataSource: getDataSource(roles),
        columns: getColumnsOptions(roles),
        hoverStateEnabled: true,
        paging: {
          enabled: false
        },
        stateStoring: {
          enabled: true
        },
        sorting: {
          mode: 'none'
        },
        onInitialized: function (event) {
          gridComponent = event.component;
          gridComponent.refresh = reloadRoles; // Dirty hack to update dataGrid after (role altering) form actions
        }
      };
    }

    function refreshGridOptions(roles) {
      gridComponent.option({
        dataSource: getDataSource(roles),
        columns: getColumnsOptions(roles)
      })
    }

    function reloadRoles() {
      return loadRoles()
        .then(transformLoadedRoles)
        .then(function (roles) {
          vm.onSave = getSaveHandler(roles);
          refreshGridOptions(roles);
        });
    }

    function loadRoles() {
      var params = {
        skip: 0,
        take: 100000
      };

      return GraphqlCollectionQuery(rolesSchema, params)
        .then(function (result) {
          return result.items;
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error while loading roles');
          throw error;
        });
    }

    function transformLoadedRoles(roles) {
      var editableRoles = _.filter(roles, function (role) {
        return role._actions.update
      });

      return _.map(editableRoles, expandRole);
    }

    function expandRole(role) {
      role.isChanged = false;
      role.permObj = _.reduce(role.permissions, function (acc, x) {
        acc[x] = true;
        return acc;
      }, {});

      return role;
    }

    function roleToRecord(role) { // === unExpandRole()
      return _.omit(role, ['isChanged', 'permObj']);
    }

    function getDataFieldName(num) {
      return 'r' + num;
    }

    function makeNaturalName(name) {
      return (name.substr(0, 1)
        .toUpperCase() + name.substr(1))
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]{1,})([A-Z][a-z])/, '$1 $2')
    }
  }

// TODO: Please add code adding new custom action handler here
})();
