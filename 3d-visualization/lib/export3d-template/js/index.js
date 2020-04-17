import 'babel-polyfill'

import {AdpNotificationService} from './adp-notification-service.service.js';
import {AdpForceGraphHelpers} from '../../../public/js/client-modules/adp-force-graph/adp-force-graph.helpers.js';
import {ForceGraphControllerLogic} from '../../../public/js/client-modules/adp-force-graph/adp-force-graph-3d.logic';

import * as Ui from './ui.js';
import {tagBox} from './tag-box-control.js'
import * as THREE from 'three/build/three.js';
import * as SpriteText from 'three-spritetext/dist/three-spritetext.js'
import * as Fg from '3d-force-graph/dist/3d-force-graph.js';
import * as OrbitControls from 'three-orbit-controls'
import * as Color from 'color'

import '../styles/styles-addon.less'
import 'font-awesome/css/font-awesome.min.css'
import '../../src/force-graph/less/style.less'
import '../../src/force-graph/less/a-style.css'

window.fgData = '__fg_data__';
window.fgConfig = '__fg_config__';

if (DEVELOPMENT_MODE_TEST_DATA) {
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
    'tags': ["Layer0", "Layer1"],
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
  window.fgConfig = {labelNodes: true, animCamera: true, tagsFilter:[1]};
}

window.Three = THREE;
window.SpriteText = SpriteText;
window.ForceGraph = Fg.default;

window.OrbitControls = OrbitControls.default(Three);
window.Color = Color.default;

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
