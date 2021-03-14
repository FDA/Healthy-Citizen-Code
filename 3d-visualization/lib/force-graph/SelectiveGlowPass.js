import {
  ShaderMaterial,
  MeshBasicMaterial,
  Layers
} from 'three/build/three.js';
import {Pass} from 'three/examples/jsm/postprocessing/Pass.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const vertexShaderNoChanges = `
  varying vec2 vUv;

  void main() {
  	vUv = uv;
  	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;
const fragmentShaderComposeBloomOverScene = `
  uniform sampler2D tDiffuse;
  uniform sampler2D bloomTexture;
  varying vec2 vUv;
  void main() {
    vec4 diffuse = texture2D( tDiffuse, vUv );
    float baseIntense = length(diffuse.xyz);
  
    if (baseIntense > 0.0) {
      if (baseIntense < 0.1) {
        vec4 bloom = texture2D( bloomTexture, vUv );
        float coof = baseIntense / 0.1;
        gl_FragColor = diffuse * coof + bloom * (1.0 - coof); 
      } else {
        gl_FragColor = diffuse; 
      }
    } else {
      gl_FragColor = texture2D( bloomTexture, vUv );
    }
   }
`;

class SelectiveGlowPass extends Pass {
  constructor(scene, camera, renderer) {
    super();

    const materials = {};
    const darkMaterial = new MeshBasicMaterial({color: 'black'});
    const bloomPass = new UnrealBloomPass();
    const scenePass = new RenderPass(scene, camera);

    this.scene = scene;

    this.bloomComposer = new EffectComposer(renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(scenePass);
    this.bloomComposer.addPass(bloomPass);

    this.uniforms = {
      tDiffuse: {value: null},
      bloomTexture: {value: null},
    };

    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShaderNoChanges,
      fragmentShader: fragmentShaderComposeBloomOverScene
    });

    this.fsQuad = new Pass.FullScreenQuad(this.material);

    this.darkenNonBloomed = obj => {
      if (obj.material && (obj.__data && !obj.__data.isGlow) || !obj.__data) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
      }
    }

    this.restoreMaterial = obj => {
      if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
      }
    }
  }

  render(renderer, writeBuffer, readBuffer) {
    this.scene.traverse(this.darkenNonBloomed);
    this.bloomComposer.render();
    this.scene.traverse(this.restoreMaterial);

    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.uniforms.bloomTexture.value = this.bloomComposer.renderTarget2.texture;

    renderer.setRenderTarget(null);
    this.fsQuad.render(renderer);
  }
}

export {SelectiveGlowPass};
