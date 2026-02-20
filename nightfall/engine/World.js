import * as THREE from 'three';

export class World {
    constructor(renderer, atmosphere) {
        this.renderer = renderer;
        this.atmosphere = atmosphere;
        this.scene = renderer.scene;
        this.envGroup = new THREE.Group();
        this.interactables = [];
        this._lights = [];
        this.scene.add(this.envGroup);
    }

    build(sceneConfig) {
        this.clear();
        this._createGround();
        for (const prop of (sceneConfig.props || [])) {
            this._buildProp(prop);
        }
        for (const inter of (sceneConfig.interactables || [])) {
            this._buildInteractable(inter);
        }
    }

    _createGround() {
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(80, 80),
            new THREE.MeshStandardMaterial({
                color: 0x0e0e10,
                roughness: 0.25,
                metalness: 0.8,
            })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.envGroup.add(ground);

        for (let i = 0; i < 8; i++) {
            const puddle = new THREE.Mesh(
                new THREE.CircleGeometry(0.4 + Math.random() * 1.2, 24),
                new THREE.MeshStandardMaterial({
                    color: 0x060612,
                    roughness: 0.02,
                    metalness: 0.98,
                })
            );
            puddle.rotation.x = -Math.PI / 2;
            puddle.position.set(
                (Math.random() - 0.5) * 14,
                0.005,
                (Math.random() - 0.5) * 14
            );
            puddle.receiveShadow = true;
            this.envGroup.add(puddle);
        }
    }

    _buildProp(prop) {
        const builders = {
            building: p => this._building(p),
            streetlight: p => this._streetlight(p),
            neon_sign: p => this._neonSign(p),
            dumpster: p => this._dumpster(p),
            car: p => this._car(p),
            crate: p => this._crate(p),
            barrel: p => this._barrel(p),
            fire_escape: p => this._fireEscape(p),
            phone_booth: p => this._phoneBooth(p),
            bench: p => this._bench(p),
            wall: p => this._wall(p),
        };
        if (builders[prop.type]) builders[prop.type](prop);
    }

    _building(p) {
        const [sx, sy, sz] = p.scale || [4, 10, 6];
        const pos = p.position || [0, 0, 0];
        const mat = new THREE.MeshStandardMaterial({
            color: p.color || 0x12121a,
            roughness: 0.92,
            metalness: 0.05,
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        mesh.position.set(pos[0], sy / 2, pos[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.envGroup.add(mesh);

        const rows = Math.floor(sy / 1.8);
        const cols = Math.floor(sx / 1.6);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.5) continue;
                const lit = Math.random() > 0.45;
                const warmth = 0.7 + Math.random() * 0.3;
                const winColor = lit ? new THREE.Color(warmth, warmth * 0.8, warmth * 0.5) : new THREE.Color(0.04, 0.04, 0.06);
                const wMat = new THREE.MeshStandardMaterial({
                    color: winColor,
                    emissive: lit ? winColor : new THREE.Color(0, 0, 0),
                    emissiveIntensity: lit ? 0.6 : 0,
                    roughness: 0.1,
                });
                const wMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), wMat);
                const wx = pos[0] - sx / 2 + 0.9 + c * 1.6;
                const wy = 1.8 + r * 1.8;
                wMesh.position.set(wx, wy, pos[2] + sz / 2 + 0.01);
                this.envGroup.add(wMesh);
                const wBack = wMesh.clone();
                wBack.material = wMat.clone();
                wBack.position.z = pos[2] - sz / 2 - 0.01;
                wBack.rotation.y = Math.PI;
                this.envGroup.add(wBack);
            }
        }
    }

    _streetlight(p) {
        const pos = p.position || [0, 0, 0];
        const color = p.color || '#ffaa44';
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 5, 8), poleMat);
        pole.position.set(pos[0], 2.5, pos[2]);
        pole.castShadow = true;
        this.envGroup.add(pole);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.04), poleMat);
        arm.position.set(pos[0] + 0.5, 4.95, pos[2]);
        this.envGroup.add(arm);

        const housing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.25, 0.2, 8),
            new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 1,
            })
        );
        housing.position.set(pos[0] + 1.0, 4.85, pos[2]);
        this.envGroup.add(housing);

        const light = new THREE.SpotLight(color, 12, 18, Math.PI / 4.5, 0.6, 1.2);
        light.position.set(pos[0] + 1.0, 4.75, pos[2]);
        light.target.position.set(pos[0] + 1.0, 0, pos[2]);
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 20;
        this.scene.add(light);
        this.scene.add(light.target);
        this._lights.push(light, light.target);

        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(2.5, 5, 16, 1, true),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.02,
                side: THREE.DoubleSide,
                depthWrite: false,
            })
        );
        cone.position.set(pos[0] + 1.0, 2.3, pos[2]);
        this.envGroup.add(cone);
    }

    _neonSign(p) {
        const pos = p.position || [0, 5, 0];
        const text = p.text || 'BAR';
        const color = p.color || '#ff0044';
        const width = text.length * 0.65 + 0.6;

        const back = new THREE.Mesh(
            new THREE.BoxGeometry(width, 1.0, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 })
        );
        back.position.set(pos[0], pos[1], pos[2]);
        this.envGroup.add(back);

        const glowMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 0.92,
        });
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.3, 0.6), glowMat);
        glow.position.set(pos[0], pos[1], pos[2] + 0.05);
        this.envGroup.add(glow);

        const neonLight = new THREE.PointLight(color, 3, 10, 2);
        neonLight.position.set(pos[0], pos[1], pos[2] + 0.8);
        this.scene.add(neonLight);
        this._lights.push(neonLight);

        this.atmosphere.registerNeon(neonLight, glow, 2.5);
    }

    _dumpster(p) {
        const pos = p.position || [0, 0, 0];
        const rot = p.rotation?.[1] || 0;
        const mat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.85, metalness: 0.3 });
        const group = new THREE.Group();

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.9), mat);
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        const lid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.9), mat);
        lid.position.set(0, 1.12, -0.08);
        lid.rotation.x = -0.25;
        group.add(lid);

        group.position.set(pos[0], 0, pos[2]);
        group.rotation.y = rot;
        this.envGroup.add(group);
    }

    _car(p) {
        const pos = p.position || [0, 0, 0];
        const rot = p.rotation || [0, 0, 0];
        const color = p.color || 0x10101a;
        const group = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.85 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), bodyMat);
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 2.0), bodyMat);
        cabin.position.set(0, 1.1, -0.2);
        cabin.castShadow = true;
        group.add(cabin);

        const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1520, roughness: 0.05, metalness: 0.9 });
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.55), glassMat);
        windshield.position.set(0, 1.1, 0.81);
        windshield.rotation.x = 0.15;
        group.add(windshield);

        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
        const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10);
        for (const [wx, wy, wz] of [[-0.85, 0.28, 1.4], [0.85, 0.28, 1.4], [-0.85, 0.28, -1.4], [0.85, 0.28, -1.4]]) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(wx, wy, wz);
            wheel.rotation.z = Math.PI / 2;
            group.add(wheel);
        }

        if (p.headlights) {
            for (const side of [-0.6, 0.6]) {
                const hl = new THREE.SpotLight('#ffeecc', 5, 15, Math.PI / 6, 0.5, 1.5);
                hl.position.set(side, 0.5, 2.2);
                hl.target.position.set(side, 0, 6);
                group.add(hl);
                group.add(hl.target);
            }
        }

        group.position.set(pos[0], 0, pos[2]);
        group.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
        this.envGroup.add(group);
    }

    _crate(p) {
        const pos = p.position || [0, 0, 0];
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.7, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 })
        );
        mesh.position.set(pos[0], 0.35, pos[2]);
        mesh.castShadow = true;
        this.envGroup.add(mesh);
    }

    _barrel(p) {
        const pos = p.position || [0, 0, 0];
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.3, 0.9, 12),
            new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8, metalness: 0.2 })
        );
        mesh.position.set(pos[0], 0.45, pos[2]);
        mesh.castShadow = true;
        this.envGroup.add(mesh);
    }

    _fireEscape(p) {
        const pos = p.position || [0, 0, 0];
        const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.75, metalness: 0.5 });
        for (let i = 0; i < 3; i++) {
            const platform = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), mat);
            platform.position.set(pos[0], 3 + i * 2.8, pos[2]);
            this.envGroup.add(platform);
            const rail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.02), mat);
            rail.position.set(pos[0], 3.35 + i * 2.8, pos[2] + 0.45);
            this.envGroup.add(rail);
        }
        for (const dx of [-0.5, 0.5]) {
            const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.03, 8.5, 0.03), mat);
            ladder.position.set(pos[0] + dx, 5, pos[2]);
            this.envGroup.add(ladder);
        }
    }

    _phoneBooth(p) {
        const pos = p.position || [0, 0, 0];
        const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.6, metalness: 0.4 });
        const booth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.9), mat);
        booth.position.set(pos[0], 1.1, pos[2]);
        booth.castShadow = true;
        this.envGroup.add(booth);

        const glassMat = new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.4 });
        for (const [rx, rz, ry] of [[0, 0.451, 0], [0, -0.451, Math.PI], [0.451, 0, Math.PI / 2]]) {
            const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.5), glassMat);
            pane.position.set(pos[0] + rx, 1.2, pos[2] + rz);
            pane.rotation.y = ry;
            this.envGroup.add(pane);
        }
    }

    _bench(p) {
        const pos = p.position || [0, 0, 0];
        const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.4), mat);
        seat.position.set(pos[0], 0.5, pos[2]);
        this.envGroup.add(seat);
        for (const dx of [-0.6, 0.6]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mat);
            leg.position.set(pos[0] + dx, 0.25, pos[2]);
            this.envGroup.add(leg);
        }
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.04), mat);
        back.position.set(pos[0], 0.78, pos[2] - 0.18);
        this.envGroup.add(back);
    }

    _wall(p) {
        const pos = p.position || [0, 0, 0];
        const scale = p.scale || [10, 4, 0.3];
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(...scale),
            new THREE.MeshStandardMaterial({ color: p.color || 0x14141a, roughness: 0.9 })
        );
        mesh.position.set(pos[0], scale[1] / 2, pos[2]);
        if (p.rotation) mesh.rotation.y = p.rotation[1] || 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.envGroup.add(mesh);
    }

    _buildInteractable(config) {
        const pos = config.position || [0, 0, 0];
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(
                (config.radius || 1.5) * 0.25,
                (config.radius || 1.5) * 0.3,
                32
            ),
            new THREE.MeshBasicMaterial({
                color: 0xc8b89a,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false,
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos[0], 0.02, pos[2]);
        this.envGroup.add(ring);

        this.interactables.push({
            ...config,
            ring,
            _baseScale: ring.scale.x,
        });
    }

    updateInteractableHighlights(playerPos, dt, time) {
        for (const inter of this.interactables) {
            const pos = inter.position || [0, 0, 0];
            const dx = playerPos.x - pos[0];
            const dz = playerPos.z - pos[2];
            const dist = Math.sqrt(dx * dx + dz * dz);
            const radius = inter.radius || 1.5;
            const inRange = dist < radius;

            const targetOpacity = inRange ? 0.5 + Math.sin(time * 3) * 0.2 : 0;
            const mat = inter.ring.material;
            mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, dt * 6);

            const pulse = 1 + Math.sin(time * 2) * 0.05;
            inter.ring.scale.setScalar(inter._baseScale * pulse);
        }
    }

    getInteractableInRange(playerPos) {
        for (const inter of this.interactables) {
            const pos = inter.position || [0, 0, 0];
            const dx = playerPos.x - pos[0];
            const dz = playerPos.z - pos[2];
            if (Math.sqrt(dx * dx + dz * dz) < (inter.radius || 1.5)) {
                return inter;
            }
        }
        return null;
    }

    clear() {
        while (this.envGroup.children.length) {
            const child = this.envGroup.children[0];
            this.envGroup.remove(child);
            child.traverse?.(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
        }
        for (const l of this._lights) this.scene.remove(l);
        this._lights = [];
        this.interactables = [];
    }
}
