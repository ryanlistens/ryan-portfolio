import * as THREE from 'three';

export class Player {
    constructor(renderer, input, characters) {
        this.renderer = renderer;
        this.input = input;
        this.characters = characters;

        this.position = new THREE.Vector3(0, 0, 0);
        this.facing = new THREE.Vector3(0, 0, -1);
        this.mesh = null;
        this.speed = 3.5;
        this.enabled = false;
        this._walkTime = 0;
        this._moving = false;
        this._bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
    }

    spawn(config) {
        const pos = config.position || [0, 0, 0];
        this.position.set(pos[0], 0, pos[2]);

        const charData = this.characters.create({
            id: 'player',
            position: [pos[0], 0, pos[2]],
            facing: config.facing || [0, 0, -1],
            appearance: {
                coat: '#1a1a28',
                hat: true,
                longCoat: true,
                cigarette: true,
                ...config.appearance,
            },
        });
        this.mesh = charData.mesh;

        if (config.facing) {
            this.facing.set(config.facing[0], 0, config.facing[2]).normalize();
        }
    }

    setBounds(bounds) {
        Object.assign(this._bounds, bounds);
    }

    enable() { this.enabled = true; }
    disable() { this.enabled = false; }

    update(dt) {
        if (!this.enabled || !this.mesh) return;

        const mx = this.input.movement.x;
        const mz = this.input.movement.y;
        this._moving = Math.abs(mx) > 0.1 || Math.abs(mz) > 0.1;

        if (this._moving) {
            this._walkTime += dt;
            const moveX = mx * this.speed * dt;
            const moveZ = mz * this.speed * dt;

            this.position.x = Math.max(this._bounds.minX, Math.min(this._bounds.maxX, this.position.x + moveX));
            this.position.z = Math.max(this._bounds.minZ, Math.min(this._bounds.maxZ, this.position.z + moveZ));

            this.facing.set(mx, 0, mz).normalize();
            const targetAngle = Math.atan2(mx, mz);
            let currentAngle = this.mesh.rotation.y;
            let diff = targetAngle - currentAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * Math.min(1, dt * 8);
        }

        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;

        if (this._moving) {
            const bob = Math.sin(this._walkTime * 8) * 0.02;
            this.mesh.position.y = bob;
            this.mesh.rotation.z = Math.sin(this._walkTime * 4) * 0.02;
        } else {
            this.mesh.position.y *= 0.9;
            this.mesh.rotation.z *= 0.9;
        }
    }

    get isMoving() { return this._moving; }
}
