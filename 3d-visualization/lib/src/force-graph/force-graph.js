import 'babel-polyfill'
import * as Three from 'three';
import Fg from '3d-force-graph';
import FgVr from '3d-force-graph-vr';
import SpriteText from 'three-spritetext'
import OrbitControls from 'three-orbit-controls'
import Color from 'color'
import SimpleBar from 'simplebar'

import './less/style.less'
import './less/a-style.css'
import 'simplebar/dist/simplebar.min.css'

window.Three = Three;
window.Color = Color;
window.ForceGraph = Fg;
window.SpriteText = SpriteText;
window.OrbitControls = OrbitControls(Three);
window.ForceGraphVr = FgVr;
window.SimpleBar = SimpleBar;
