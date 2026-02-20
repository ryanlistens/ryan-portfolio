import * as THREE from 'three';

export class CameraDirector {
    constructor(renderer) {
        this.renderer = renderer;
        this.camera = renderer.camera;

        this.mode = 'cinematic';
        this._target = new THREE.Vector3();
        this._currentPos = new THREE.Vector3(0, 5, 10);
        this._currentLookAt = new THREE.Vector3(0, 1, 0);
        this._desiredPos = new THREE.Vector3(0, 5, 10);
        this._desiredLookAt = new THREE.Vector3(0, 1, 0);

        this._followOffset = new THREE.Vector3(0, 3.5, 6);
        this._followLookOffset = new THREE.Vector3(0, 1.2, 0);
        this._followSmoothness = 2.5;

        this._moveQueue = [];
        this._activeMove = null;
        this._moveElapsed = 0;

        this._shakeIntensity = 0;
        this._shakeDecay = 0;

        this._player = null;

        this.camera.position.copy(this._currentPos);
        this.camera.lookAt(this._currentLookAt);
    }

    followPlayer(player) {
        this._player = player;
        this.mode = 'follow';
    }

    setMode(mode) {
        this.mode = mode;
    }

    shake(intensity = 0.1, duration = 0.3) {
        this._shakeIntensity = intensity;
        this._shakeDecay = intensity / duration;
    }

    async executeMove(moveConfig) {
        return new Promise(resolve => {
            this._moveQueue.push({ ...moveConfig, _resolve: resolve });
        });
    }

    executeMoveImmediate(moveConfig) {
        this._moveQueue.push(moveConfig);
    }

    cutTo(position, lookAt) {
        this._currentPos.set(...position);
        this._currentLookAt.set(...lookAt);
        this._desiredPos.copy(this._currentPos);
        this._desiredLookAt.copy(this._currentLookAt);
        this.camera.position.copy(this._currentPos);
        this.camera.lookAt(this._currentLookAt);
    }

    update(dt) {
        this._processMove(dt);
        this._updateShake(dt);

        if (this.mode === 'follow' && this._player && !this._activeMove) {
            this._updateFollow(dt);
        } else if (this.mode === 'cinematic' || this._activeMove) {
            this._updateCinematic(dt);
        }

        this.camera.position.copy(this._currentPos);
        if (this._shakeIntensity > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this._shakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * this._shakeIntensity;
        }
        this.camera.lookAt(this._currentLookAt);
    }

    _updateFollow(dt) {
        const pPos = this._player.position;
        const facing = this._player.facing;

        const behindX = -facing.x * this._followOffset.z;
        const behindZ = -facing.z * this._followOffset.z;

        this._desiredPos.set(
            pPos.x + behindX,
            this._followOffset.y,
            pPos.z + behindZ + this._followOffset.z * 0.3
        );
        this._desiredLookAt.set(
            pPos.x + this._followLookOffset.x,
            this._followLookOffset.y,
            pPos.z + this._followLookOffset.z
        );

        const s = Math.min(1, dt * this._followSmoothness);
        this._currentPos.lerp(this._desiredPos, s);
        this._currentLookAt.lerp(this._desiredLookAt, s);
    }

    _updateCinematic(dt) {
        const s = Math.min(1, dt * 3);
        this._currentPos.lerp(this._desiredPos, s);
        this._currentLookAt.lerp(this._desiredLookAt, s);
    }

    _processMove(dt) {
        if (!this._activeMove && this._moveQueue.length > 0) {
            this._activeMove = this._moveQueue.shift();
            this._moveElapsed = 0;
            this._moveStartPos = this._currentPos.clone();
            this._moveStartLookAt = this._currentLookAt.clone();
        }

        if (!this._activeMove) return;

        const move = this._activeMove;
        const duration = move.duration || 2;
        this._moveElapsed += dt;
        const raw = Math.min(1, this._moveElapsed / duration);
        const t = this._easeInOut(raw);

        switch (move.move) {
            case 'crane_down':
            case 'pan':
            case 'dolly':
            case 'tracking':
            case 'move': {
                const from = move.from ? new THREE.Vector3(...move.from) : this._moveStartPos;
                const to = move.to ? new THREE.Vector3(...move.to) : this._desiredPos;
                this._desiredPos.lerpVectors(from, to, t);
                if (move.lookAt) {
                    const la = new THREE.Vector3(...move.lookAt);
                    if (move.lookAtFrom) {
                        const laFrom = new THREE.Vector3(...move.lookAtFrom);
                        this._desiredLookAt.lerpVectors(laFrom, la, t);
                    } else {
                        this._desiredLookAt.lerp(la, Math.min(1, dt * 4));
                    }
                }
                break;
            }
            case 'close_up': {
                const target = move.target ? new THREE.Vector3(...move.target) : this._currentLookAt;
                const dir = new THREE.Vector3().subVectors(this._currentPos, target).normalize();
                const closePos = target.clone().add(dir.multiplyScalar(2));
                closePos.y = target.y + 0.5;
                this._desiredPos.lerpVectors(this._moveStartPos, closePos, t);
                this._desiredLookAt.lerp(target, Math.min(1, dt * 5));
                break;
            }
            case 'dramatic_reveal': {
                const target = move.target ? new THREE.Vector3(...move.target) : new THREE.Vector3();
                const revealPos = target.clone().add(new THREE.Vector3(2, 1.5, 3));
                this._desiredPos.lerpVectors(this._moveStartPos, revealPos, t);
                this._desiredLookAt.lerp(target, Math.min(1, dt * 4));
                break;
            }
            case 'orbit': {
                const center = move.center ? new THREE.Vector3(...move.center) : this._currentLookAt;
                const radius = move.radius || 5;
                const startAngle = move.startAngle || 0;
                const endAngle = move.endAngle || Math.PI;
                const angle = startAngle + (endAngle - startAngle) * t;
                const height = move.height || 2;
                this._desiredPos.set(
                    center.x + Math.cos(angle) * radius,
                    center.y + height,
                    center.z + Math.sin(angle) * radius
                );
                this._desiredLookAt.copy(center);
                break;
            }
            case 'return': {
                if (this._savedPos) {
                    this._desiredPos.lerpVectors(this._moveStartPos, this._savedPos, t);
                    this._desiredLookAt.lerpVectors(this._moveStartLookAt, this._savedLookAt, t);
                }
                break;
            }
        }

        if (raw >= 1) {
            const resolve = this._activeMove._resolve;
            this._activeMove = null;
            if (resolve) resolve();
        }
    }

    _updateShake(dt) {
        if (this._shakeIntensity > 0) {
            this._shakeIntensity = Math.max(0, this._shakeIntensity - this._shakeDecay * dt);
        }
    }

    savePosition() {
        this._savedPos = this._currentPos.clone();
        this._savedLookAt = this._currentLookAt.clone();
    }

    _easeInOut(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}
