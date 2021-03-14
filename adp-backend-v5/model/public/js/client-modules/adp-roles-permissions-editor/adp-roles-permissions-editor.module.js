;(function () {
  'use strict';

  angular
    .module('app.adpRolesPermissionsEditor', [])
    .controller('AdpRolesPermissionsEditor', RolesPermissionsEditor);

  /** @ngInject */
  function RolesPermissionsEditor(
    AdpSchemaService,
    ActionsHandlers,
    AdpNotificationService,
    GraphqlCollectionQuery,
    GraphqlCollectionMutator,
    ErrorHelpers
  ) {
    var vm = this;
    var gridComponent;
    var rolesSchema = AdpSchemaService.getSchemaByName('roles');
    var loadPromise = Promise.all([loadRoles(), loadPermissions()]);

    vm.isSaving = false;

    vm.$onInit = function () {
      loadPromise
        .then(function (rolesAndPermissions) {
          return {
            roles: transformLoadedRoles(rolesAndPermissions[0]),
            permissions: rolesAndPermissions[1]}
        })
        .then(function (data) {
          var permissions = data.permissions;
          var options = getGridOptions(data.roles, permissions);

          $('#rp-grid-container')
            .dxDataGrid(options);

          vm.onSave = getSaveHandler(data.roles)
          vm.createRole = function(){
            ActionsHandlers.create(rolesSchema)
              .then(loadRoles)
              .then(transformLoadedRoles)
              .then(function(roles) {
                refreshGridOptions(roles, permissions);
              });
          }
        })
    }

    function onPermissionChange(role, permission, operationAdd) {
      role.isChanged = true;
      role.permObj[permission] = operationAdd;
    }

    function getSaveHandler(roles) {
      return function (e) {
        var rolesToSave = _.filter(roles, function (role) {
          return role.isChanged
        })

        if (!rolesToSave.length) {
          AdpNotificationService.notifySuccess('Nothing to be saved');
          return;
        }

        var promises = _.map(rolesToSave, function (role) {
          var record = _.omit(role, ['isChanged', 'permObj']);

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
        cssClass: 'perm-name',
        caption: '',
        fixed: true,
        dataField: 'title',
        sortIndex: 0,
        sortOrder: 'asc',
        width: 220,
        customizeText: function (event) {
          return makeNaturalName(event.value);
        }
      }
    }

    function getRoleColumnOptions(role, index) {
      var roleName = role.name;

      return {
        cssClass: 'perm-checkbox',
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
      }
    }

    function getDataSource(roles, permissions) {
      return _.map(permissions, function (permission, name) {
        var row = {name: name, title: permission};

        _.each(roles, function (role, index) {
          row[getDataFieldName(index)] = !!role.permObj[permission];
        });

        return row;
      })
    }

    function getGridOptions(roles, permissions) {
      return {
        dataSource: getDataSource(roles, permissions),
        columns: getColumnsOptions(roles),
   //     wordWrapEnabled: true,
        paging: {
          enabled: false,
        },
        onInitialized: function(event) {
          gridComponent = event.component;
        },
      };
    }

    function refreshGridOptions(roles, permissions) {
      gridComponent.option({
        dataSource: getDataSource(roles, permissions),
        columns: getColumnsOptions(roles),
      })
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

    function loadPermissions() {
      return Promise.resolve(rolesSchema.fields.permissions.list);
    }

    function transformLoadedRoles(roles) {
      var editableRoles = _.filter(roles, function (role) { return role._actions.update });

      return _.map(editableRoles, function (role) {
        role.isChanged = false;
        role.permObj = _.reduce(role.permissions, function (acc, x) {
          acc[x] = true;
          return acc;
        }, {});

        return role;
      })
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
