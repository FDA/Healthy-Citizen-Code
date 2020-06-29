import 'babel-polyfill'

import {AdpNotificationService} from './adp-notification-service.service.js';
import {AdpForceGraphHelpers} from '../../../public/js/client-modules/adp-force-graph/adp-force-graph.helpers.js';
import {ForceGraphControllerLogic} from '../../../public/js/client-modules/adp-force-graph/adp-force-graph-3d.logic';

import * as Ui from './ui.js';
import {tagBox} from './tag-box-control.js'
// TODO: import just force-graph.js file which in turn imports most of listed here. Just need to separate with VR lib listed there...
import * as THREE from 'three/build/three.js';
import SpriteText from 'three-spritetext/dist/three-spritetext.js'
import Fg from '3d-force-graph/dist/3d-force-graph.js';
import OrbitControls from 'three-orbit-controls'
import Color from 'color'
import SimpleBar from 'simplebar'

import 'font-awesome/css/font-awesome.min.css'
import '../../src/force-graph/less/style.less'
import '../../src/force-graph/less/a-style.css'
import '../styles/styles-addon.less'
import 'simplebar/dist/simplebar.min.css'

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

window.Three = THREE;
window.SpriteText = SpriteText;
window.ForceGraph = Fg;

window.OrbitControls = OrbitControls(THREE);
window.Color = Color;
window.SimpleBar = SimpleBar;

window.toastr = {
  error: msg => alert(`Error: ${msg}`),
  success: msg => alert(msg),
};

function main() {
  const context = {};
  const mockTimeout = window.setTimeout;
  const mockHttp = {
    get: () => Promise.resolve({
        data: window.fgData
      }
    ),
    post: () => Promise.resolve(),
  };
  const mockSce = {trustAsHtml: html=>html}
  const mockInterval = function(a,b){ window.setInterval(a,b);};
  mockInterval.cancel = function(a){window.clearInterval(a)};

  Ui.bindUiHandlers( context );

  ForceGraphControllerLogic.call(context,
    Ui.onInterfaceUpdate,
    null,
    {},
    mockInterval,
    mockTimeout,
    mockHttp,
    mockSce,
    $(window.document),
    AdpNotificationService,
    null, //AdpClientCommonHelper (used to load css+scripts of libs) is not required since 3d libraries already embedded by webpack
    AdpForceGraphHelpers,
    null,
    {apiUrl: ''},
    tagBox,
    window.fgConfig || {});

  setTimeout(()=>{
    Ui.renderLegend(window.fgData.legend || {});
  }, 0);
}

main();
