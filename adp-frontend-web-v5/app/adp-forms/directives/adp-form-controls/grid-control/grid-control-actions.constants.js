;(function () {
  angular
    .module('app.adpForms')
    .constant('GRID_CONTROL_ACTIONS', {
      'view': {
        'showInTable': false
      },
      'group': {
        'position': 'grid.top.left',
        'showInTable': false,
        'action': {
          'type': 'action',
          'link': 'group'
        },
        '__name': 'group'
      },
      'search': {
        'position': 'grid.top.right',
        'showInTable': false,
        'fullName': 'Search....',
        'action': {
          'type': 'action',
          'link': 'search'
        },
        '__name': 'search'
      },
      'export': {
        'position': 'grid.top.right',
        'showInTable': false,
        'description': 'Export collection',
        'icon': {
          'type': 'font-awesome',
          'link': 'download'
        },
        'action': {
          'type': 'module',
          'link': 'AdpDataExport'
        },
        '__name': 'export'
      },
      'syntheticGenerate': {
        'position': 'grid.top.right',
        'showInTable': false,
        'description': 'Synthetic content generator',
        'icon': {
          'type': 'font-awesome',
          'link': 'magic'
        },
        'action': {
          'type': 'module',
          'link': 'AdpSyntheticGenerate'
        },
        '__name': 'syntheticGenerate'
      },
      'chooseColumns': {
        'position': 'grid.top.right',
        'showInTable': false,
        'description': 'Configure grid columns',
        'icon': {
          'link': 'columns'
        },
        'action': {
          'type': 'module',
          'link': 'AdpGridColumnChooser'
        },
        '__name': 'chooseColumns'
      },
      'gridControlEdit': {
        'permissions': 'accessAsUser',
        'description': 'Edit',
        'fullName': 'Edit',
        'action': {
          'type': 'module',
          'link': 'AdpGridControlActions',
          'method': 'edit'
        }
      },
      'gridCreateControl': {
        'actionOrder': 1,
        'backgroundColor': '#2196F3',
        'borderColor': '#0c7cd5',
        'description': 'Create new record',
        'fullName': 'Create Record',
        'position': 'grid.top.left',
        'textColor': 'white',
        'icon': {
          'link': 'columns'
        },
        'action': {
          'type': 'module',
          'link': 'AdpGridControlActions',
          'method': 'create'
        },
        '__name': 'create',
      }
    });
})();
