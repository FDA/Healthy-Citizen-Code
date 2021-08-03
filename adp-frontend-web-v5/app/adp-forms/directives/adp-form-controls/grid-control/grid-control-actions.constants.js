;(function () {
  angular
    .module('app.adpForms')
    .constant('GRID_CONTROL_ACTIONS', {
  /*    'view': {
        'showInTable': false
      },
      'group': {
        'position': 'grid.top.left',
        'showInTable': false,
        'action': {
          'type': 'action',
          'link': 'group'
        },
        'actionName': 'group'
      },
      'search': {
        'position': 'grid.top.right',
        'showInTable': false,
        'fullName': 'Search....',
        'action': {
          'type': 'action',
          'link': 'search'
        },
        'actionName': 'search'
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
        'actionName': 'syntheticGenerate'
      },*/
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
        'actionName': 'export'
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
        'actionName': 'chooseColumns'
      },
      'gridControlEdit': {
        'permissions': 'accessAsUser',
        'description': 'Update record',
        'fullName': 'Update',
        'icon': {
          'link': 'pencil'
        },
        'action': {
          'type': 'module',
          'link': 'AdpGridControlActions',
          'method': 'edit'
        }
      },
 /*     "gridControlDelete": {
        "description": "Delete record",
        "position": "grid.row",
        "backgroundColor": "#F44336",
        "borderColor": "#f32c1e",
        "textColor": "white",
        "icon": {
          "link": "trash"
        },
        "action": {
          "type": "action",
          "link": "delete"
        },
        "actionOrder": 2
      },
      "gridControlClone": {
        "description": "Clone record",
        "position": "grid.row",
        "backgroundColor": "#4CAF50",
        "borderColor": "#388E3C",
        "textColor": "white",
        "icon": {
          "link": "clone"
        },
        "action": {
          "type": "action",
          "link": "clone"
        },
        "actionOrder": 3
      },*/
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
        'actionName': 'create',
      }
    });
})();
