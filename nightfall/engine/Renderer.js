import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FilmNoirShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        grainIntensity: { value: 0.05 },
        vignetteRadius: { value: 0.85 },
        vignetteSoftness: { value: 0.45 },
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float grainIntensity;
        uniform float vignetteRadius;
        uniform float vignetteSoftness;
        varying vec2 vUv;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);

            float grain = (hash(vUv * 800.0 + time * 100.0) - 0.5) * grainIntensity;
            color.rgb += grain;

            vec2 center = vUv - 0.5;
            float dist = length(center * vec2(1.0, 0.75));
            float vignette = smoothstep(vignetteRadius, vignetteRadius - vignetteSoftness, dist);
            color.rgb *= vignette;

            float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            color.rgb = mix(color.rgb, vec3(luma) * vec3(0.95, 0.95, 1.08), 0.12);

            gl_FragColor = color;
        }
    `,
};

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            40,
            window.innerWidth / window.innerHeight,
            0.1, 200
        );

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.7;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.bloomPass = new UnrealBloomPass(size, 0.5, 0.4, 0.82);
        this.composer.addPass(this.bloomPass);

        this.filmPass = new ShaderPass(FilmNoirShader);
        this.composer.addPass(this.filmPass);

        this._time = 0;
        window.addEventListener('resize', () => this._resize());
        this._resize();
    }

    _resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
    }

    render(dt) {
        this._time += dt;
        this.filmPass.uniforms.time.value = this._time;
        this.composer.render();
    }
}
