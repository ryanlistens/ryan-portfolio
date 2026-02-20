export class Input {
    constructor(container) {
        this.movement = { x: 0, y: 0 };
        this.interactPressed = false;
        this.advancePressed = false;

        this._keys = {};
        this._interactDown = false;
        this._advanceDown = false;
        this._prevInteract = false;
        this._prevAdvance = false;

        this._touchJoystickId = null;
        this._touchStart = null;
        this._joystickPos = { x: 0, y: 0 };

        this._joystickEl = document.getElementById('touch-joystick');
        this._thumbEl = document.getElementById('joystick-thumb');
        this._isTouchDevice = false;

        this._setupKeyboard();
        this._setupTouch(container);
        this._setupClick(container);
    }

    _setupKeyboard() {
        window.addEventListener('keydown', e => {
            this._keys[e.code] = true;
            if (['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => {
            this._keys[e.code] = false;
        });
    }

    _setupTouch(container) {
        container.addEventListener('touchstart', e => {
            this._isTouchDevice = true;
            this._joystickEl?.classList.add('active');

            for (const touch of e.changedTouches) {
                const x = touch.clientX;
                const w = window.innerWidth;

                if (x < w * 0.45 && this._touchJoystickId === null) {
                    this._touchJoystickId = touch.identifier;
                    this._touchStart = { x: touch.clientX, y: touch.clientY };
                    this._joystickPos = { x: 0, y: 0 };

                    if (this._joystickEl) {
                        this._joystickEl.style.left = (touch.clientX - 60) + 'px';
                        this._joystickEl.style.bottom = (window.innerHeight - touch.clientY - 60) + 'px';
                    }
                } else if (x >= w * 0.45) {
                    this._interactDown = true;
                    this._advanceDown = true;
                }
            }
            e.preventDefault();
        }, { passive: false });

        container.addEventListener('touchmove', e => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this._touchJoystickId && this._touchStart) {
                    const dx = touch.clientX - this._touchStart.x;
                    const dy = touch.clientY - this._touchStart.y;
                    const maxDist = 50;
                    this._joystickPos.x = Math.max(-1, Math.min(1, dx / maxDist));
                    this._joystickPos.y = Math.max(-1, Math.min(1, dy / maxDist));

                    if (this._thumbEl) {
                        this._thumbEl.style.left = `calc(50% + ${dx * 0.6}px)`;
                        this._thumbEl.style.top = `calc(50% + ${dy * 0.6}px)`;
                    }
                }
            }
            e.preventDefault();
        }, { passive: false });

        const endTouch = e => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this._touchJoystickId) {
                    this._touchJoystickId = null;
                    this._touchStart = null;
                    this._joystickPos = { x: 0, y: 0 };
                    if (this._thumbEl) {
                        this._thumbEl.style.left = '50%';
                        this._thumbEl.style.top = '50%';
                    }
                }
            }
        };
        container.addEventListener('touchend', endTouch);
        container.addEventListener('touchcancel', endTouch);
    }

    _setupClick(container) {
        container.addEventListener('click', () => {
            this._interactDown = true;
            this._advanceDown = true;
        });
    }

    get isTouchDevice() {
        return this._isTouchDevice;
    }

    update() {
        let mx = 0, my = 0;
        if (this._keys['KeyA'] || this._keys['ArrowLeft']) mx -= 1;
        if (this._keys['KeyD'] || this._keys['ArrowRight']) mx += 1;
        if (this._keys['KeyW'] || this._keys['ArrowUp']) my -= 1;
        if (this._keys['KeyS'] || this._keys['ArrowDown']) my += 1;

        if (this._touchJoystickId !== null) {
            mx = this._joystickPos.x;
            my = this._joystickPos.y;
        }

        const len = Math.sqrt(mx * mx + my * my);
        if (len > 1) { mx /= len; my /= len; }
        this.movement.x = mx;
        this.movement.y = my;

        const interactNow = this._interactDown || this._keys['KeyE'];
        this.interactPressed = interactNow && !this._prevInteract;
        this._prevInteract = interactNow;
        this._interactDown = false;

        const advanceNow = this._advanceDown || this._keys['Space'] || this._keys['Enter'];
        this.advancePressed = advanceNow && !this._prevAdvance;
        this._prevAdvance = advanceNow;
        this._advanceDown = false;
    }

    consumeInteract() { this.interactPressed = false; }
    consumeAdvance() { this.advancePressed = false; }
}
