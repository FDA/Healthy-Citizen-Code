import 'babel-polyfill'
import * as Three from 'three';
import * as Fg from '3d-force-graph';
import * as SpriteText from 'three-spritetext'
import * as OrbitControls from 'three-orbit-controls'
import * as FgVr from '3d-force-graph-vr';
import * as Color from 'color'

import './less/style.less'
import './less/a-style.css'

window.Three = Three;
window.ForceGraph = Fg.default;
window.SpriteText = SpriteText.default;
window.OrbitControls = OrbitControls.default(Three);
window.ForceGraphVr = FgVr.default;
window.Color = Color.default;
