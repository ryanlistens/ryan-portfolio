import * as THREE from 'three';

export class Atmosphere {
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = renderer.scene;
        this.rain = null;
        this._rainVelocities = null;
        this._neonLights = [];
        this._time = 0;
    }

    configure(config = {}) {
        const fogColor = new THREE.Color(config.fog?.color || '#070710');
        this.scene.fog = new THREE.FogExp2(fogColor, config.fog?.density || 0.035);
        this.scene.background = fogColor;

        if (this._ambient) this.scene.remove(this._ambient);
        this._ambient = new THREE.AmbientLight(
            config.ambient?.color || '#141428',
            config.ambient?.intensity ?? 0.4
        );
        this.scene.add(this._ambient);

        if (this._hemi) this.scene.remove(this._hemi);
        this._hemi = new THREE.HemisphereLight('#0a0a20', '#000000', 0.2);
        this.scene.add(this._hemi);

        if (config.rain?.intensity > 0) {
            this._createRain(config.rain.intensity);
        }
    }

    _createRain(intensity) {
        if (this.rain) {
            this.scene.remove(this.rain);
            this.rain.geometry.dispose();
            this.rain.material.dispose();
        }

        const count = Math.floor(4000 * intensity);
        const positions = new Float32Array(count * 3);
        this._rainVelocities = new Float32Array(count);

        const spread = 50;
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = Math.random() * 22;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
            this._rainVelocities[i] = 10 + Math.random() * 10;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x7799bb,
            size: 0.06,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.rain = new THREE.Points(geometry, material);
        this.scene.add(this.rain);
    }

    registerNeon(light, glowMesh, baseIntensity = 2) {
        this._neonLights.push({
            light,
            glow: glowMesh,
            baseIntensity,
            flickerPhase: Math.random() * Math.PI * 2,
            flickerSpeed: 0.3 + Math.random() * 1.5,
        });
    }

    update(dt) {
        this._time += dt;

        if (this.rain) {
            const positions = this.rain.geometry.attributes.position.array;
            const count = positions.length / 3;
            for (let i = 0; i < count; i++) {
                positions[i * 3 + 1] -= this._rainVelocities[i] * dt;
                if (positions[i * 3 + 1] < -0.5) {
                    positions[i * 3 + 1] = 20 + Math.random() * 2;
                    positions[i * 3] += (Math.random() - 0.5) * 2;
                    positions[i * 3 + 2] += (Math.random() - 0.5) * 2;
                }
            }
            this.rain.geometry.attributes.position.needsUpdate = true;

            if (this.renderer.camera) {
                this.rain.position.x = this.renderer.camera.position.x;
                this.rain.position.z = this.renderer.camera.position.z;
            }
        }

        for (const neon of this._neonLights) {
            const t = this._time;
            const base = neon.baseIntensity;
            let flicker = Math.sin(t * neon.flickerSpeed * 12 + neon.flickerPhase) * 0.08
                        + Math.sin(t * neon.flickerSpeed * 27 + neon.flickerPhase) * 0.04;
            if (Math.random() > 0.995) flicker -= 0.4;

            if (neon.glow?.material) {
                neon.glow.material.emissiveIntensity = base + flicker;
            }
            if (neon.light) {
                neon.light.intensity = (base * 1.5) + flicker * 2;
            }
        }
    }
}
