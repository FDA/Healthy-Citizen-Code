import 'babel-polyfill'
import * as Three from 'three';
import Fg from '3d-force-graph';

import SpriteText from 'three-spritetext'
import OrbitControls from 'three-orbit-controls'
import Color from 'color'
import SimpleBar from 'simplebar'
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {SelectiveGlowPass} from './SelectiveGlowPass.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import Stats from 'stats.js';

import './less/style.less'
import './less/a-style.css'
import 'simplebar/dist/simplebar.min.css'

window.Three = Three;
window.Color = Color;
window.ForceGraph = Fg;
window.SpriteText = SpriteText;
window.OrbitControls = OrbitControls(Three);
window.EffectComposer = EffectComposer;
window.RenderPass = RenderPass;
window.SimpleBar = SimpleBar;
window.UnrealBloomPass = UnrealBloomPass;
window.SelectiveGlowPass = SelectiveGlowPass;
window.Stats = Stats;

if (typeof BLOCK_FORCE_GRAPH_VR_IMPORT === 'undefined') {
  window.ForceGraphVr = require('3d-force-graph-vr').default;
}
