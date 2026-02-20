import * as THREE from 'three';

const SKIN = 0xd4a574;
const DARK_COAT = 0x1a1a22;
const LIGHT_SHIRT = 0xc8c0b0;

export class Characters {
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = renderer.scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this._characters = [];
    }

    create(config) {
        const charGroup = new THREE.Group();
        const appearance = config.appearance || {};
        const coatColor = new THREE.Color(appearance.coat || DARK_COAT);
        const shirtColor = new THREE.Color(appearance.shirt || LIGHT_SHIRT);

        const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.85 });
        const skinMat = new THREE.MeshStandardMaterial({ color: appearance.skin || SKIN, roughness: 0.7 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.85 });

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skinMat);
        head.position.y = 1.62;
        head.castShadow = true;
        charGroup.add(head);

        if (appearance.hat !== false) {
            const brim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.26, 0.02, 16),
                coatMat
            );
            brim.position.y = 1.75;
            charGroup.add(brim);
            const crown = new THREE.Mesh(
                new THREE.CylinderGeometry(0.14, 0.16, 0.14, 12),
                coatMat
            );
            crown.position.y = 1.83;
            charGroup.add(crown);
        }

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.2), coatMat);
        torso.position.y = 1.25;
        torso.castShadow = true;
        charGroup.add(torso);

        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.16), shirtMat);
        collar.position.y = 1.48;
        charGroup.add(collar);

        if (appearance.longCoat !== false) {
            const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.35, 0.22), coatMat);
            skirt.position.y = 0.85;
            skirt.castShadow = true;
            charGroup.add(skirt);
        }

        for (const side of [-1, 1]) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.1), coatMat);
            arm.position.set(side * 0.22, 1.2, 0);
            arm.castShadow = true;
            charGroup.add(arm);

            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), skinMat);
            hand.position.set(side * 0.22, 0.95, 0);
            charGroup.add(hand);
        }

        for (const side of [-1, 1]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.12), new THREE.MeshStandardMaterial({ color: 0x12121a, roughness: 0.85 }));
            leg.position.set(side * 0.09, 0.45, 0);
            leg.castShadow = true;
            charGroup.add(leg);

            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.18), shoeMat);
            shoe.position.set(side * 0.09, 0.2, 0.03);
            charGroup.add(shoe);
        }

        if (appearance.cigarette) {
            const cig = new THREE.Mesh(
                new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6),
                new THREE.MeshBasicMaterial({ color: 0xf0e0c0 })
            );
            cig.rotation.z = Math.PI / 2;
            cig.position.set(0.13, 1.55, 0.15);
            charGroup.add(cig);

            const ember = new THREE.Mesh(
                new THREE.SphereGeometry(0.012, 6, 4),
                new THREE.MeshBasicMaterial({ color: 0xff4400 })
            );
            ember.position.set(0.17, 1.55, 0.15);
            charGroup.add(ember);

            const emberLight = new THREE.PointLight(0xff4400, 0.3, 1);
            emberLight.position.copy(ember.position);
            charGroup.add(emberLight);
        }

        if (config.state === 'dead') {
            charGroup.rotation.z = Math.PI / 2;
            charGroup.position.y = -0.7;
        }

        const pos = config.position || [0, 0, 0];
        charGroup.position.set(pos[0], charGroup.position.y + (pos[1] || 0), pos[2]);
        if (config.facing) {
            const angle = Math.atan2(config.facing[0], config.facing[2]);
            charGroup.rotation.y = angle;
        }
        if (config.rotation) charGroup.rotation.y = config.rotation;

        charGroup.visible = !config.hidden;
        this.group.add(charGroup);

        const charData = {
            id: config.id,
            mesh: charGroup,
            config,
            _idlePhase: Math.random() * Math.PI * 2,
            _breathSpeed: 0.8 + Math.random() * 0.4,
            hidden: !!config.hidden,
        };
        this._characters.push(charData);
        return charData;
    }

    show(id) {
        const char = this._characters.find(c => c.id === id);
        if (char) {
            char.mesh.visible = true;
            char.hidden = false;
        }
    }

    hide(id) {
        const char = this._characters.find(c => c.id === id);
        if (char) {
            char.mesh.visible = false;
            char.hidden = true;
        }
    }

    getPosition(id) {
        const char = this._characters.find(c => c.id === id);
        return char?.mesh.position;
    }

    getMesh(id) {
        const char = this._characters.find(c => c.id === id);
        return char?.mesh;
    }

    update(dt) {
        const t = performance.now() / 1000;
        for (const char of this._characters) {
            if (char.hidden || char.config.state === 'dead') continue;
            const breathe = Math.sin(t * char._breathSpeed + char._idlePhase) * 0.003;
            char.mesh.position.y = (char.config.state === 'dead' ? -0.7 : 0) + breathe;
        }
    }

    clear() {
        while (this.group.children.length) {
            const child = this.group.children[0];
            this.group.remove(child);
            child.traverse?.(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
        }
        this._characters = [];
    }
}
