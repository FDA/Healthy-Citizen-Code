import 'babel-polyfill'

import {AdpNotificationService} from 'common/adp-notification-service.service.js';
import * as Ui from 'common/template-ui-service.js';
import {tagBox} from 'common/tag-box-control.js'

import {AdpForceGraphHelpers} from '../../public/js/client-modules/adp-force-graph/adp-force-graph.helpers.js';
import {ForceGraphControllerLogic} from '../../public/js/client-modules/adp-force-graph/adp-force-graph-3d.logic';

import {notificationService, interval, timeout, http, sce} from 'common/fakeInterfaces';

// All same imports used for our regular 3d-vis library
import '../force-graph/force-graph'

import 'font-awesome/css/font-awesome.min.css'
import 'common/styles/standalone-styles.less'

window.fgData = '__fg_data__';
window.fgConfig = '__fg_config__';

if (DEVELOPMENT_MODE_TEST_DATA || _.isString(window.fgData)) {
  console.warn('WARNING: Graph data is mocked! Config is mocked as well!')
  window.fgData = {
    'legend': {
      'nodes': [
        {
          'text': 'Data Entity',
          'col': 'red',
          'shp': 'torus',
        },
        {
          'text': 'System',
          'col': 'green',
          'shp': 'sphere',
        },
      ],
      'links': [
        {
          'text': 'Provides',
          'col': 'red',
          'w': 3,
        },
      ],
    },
    'tags': [{id:0, text:"Layer0"}, {id:1, text:"Layer1"}],
    'nodes': [
      {
        'id': '5c6ed813d3994d0086ec7a46',
        'n': 'Firms',
        'd': 'Description',
        'col': 'red',
        'size': 4,
        'shp': 'Torus',
      'tags': [0],
        'obj': {
          'Authorative Data': '',
          'Provides Data': '',
          'Type': 'Data Entity',
          'Location Data': 'FIDA, FMS',
          'Data Owner': 'ORA',
        },
      },
      {
        'id': '5c52e4cb1ee82eaef86e26b8',
        'n': 'CPAN Internet Apps',
        'col': 'green',
        'size': 3,
        'shp': 'Sphere',
        'tags': [1],
        'obj': {
          'Authorative Data': '',
          'Provides Data': '',
          'Type': 'System',
        },
      },
    ],
    'links': [
      {
        'n': 'active firms',
        'source': '5c52e4cb1ee82eaef86e26b8',
        'target': '5c6ed813d3994d0086ec7a46',
        'col': 'red',
        'w': 1,
        'pw': 1,
        'pcol': 'lime',
        'pspd': 50,
        'trf': 1,
        'tags': [0,1],
        'obj': {
          'Domain': 'CPAN Internet Apps',
          'Type': 'Provides',
          'Range': 'Firms',
        },
      },
    ],
  };
  window.fgConfig = {labelNodes: true, showLegend: true, tagsFilter:[1]};
}

var $document = $(window.document);

$document.ready(function() {
  const context = {};

  Ui.bindUiHandlers( context );

  ForceGraphControllerLogic.call(context,
    Ui.getInterfaceUpdater(),
    null,
    {},
    interval,
    timeout,
    http,
    sce,
    $document,
    notificationService,
    null, //AdpClientCommonHelper (used to load css+scripts of libs) is not required since 3d libraries already embedded by webpack
    AdpForceGraphHelpers,
    null,
    {
      apiUrl: '',
      ALLOW_PERFORMANCE_MONITOR: false,
    },
    tagBox,
    doLoadData,
    doLoadConfig,
    {}
  );

  timeout(()=>{
    Ui.renderLegend(window.fgData.legend || {});
  }, 0);

  function doLoadData() {
    return Promise.resolve(window.fgData || {})
  }

  function doLoadConfig() {
    return Promise.resolve(window.fgConfig || {})
  }
});
