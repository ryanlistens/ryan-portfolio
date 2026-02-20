import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { Atmosphere } from './Atmosphere.js';
import { World } from './World.js';
import { Characters } from './Characters.js';
import { Player } from './Player.js';
import { CameraDirector } from './Camera.js';
import { Dialogue } from './Dialogue.js';
import { Investigation } from './Investigation.js';
import { SceneRunner } from './SceneRunner.js';

class Game {
    constructor() {
        this._lastTime = 0;
        this._time = 0;
        this._ready = false;
    }

    async init() {
        const canvas = document.getElementById('game-canvas');
        const container = document.getElementById('game-container');

        this.input = new Input(container);
        this.renderer = new Renderer(canvas);
        this.atmosphere = new Atmosphere(this.renderer);
        this.world = new World(this.renderer, this.atmosphere);
        this.characters = new Characters(this.renderer);
        this.player = new Player(this.renderer, this.input, this.characters);
        this.camera = new CameraDirector(this.renderer);
        this.dialogue = new Dialogue();
        this.investigation = new Investigation();

        this.sceneRunner = new SceneRunner({
            world: this.world,
            camera: this.camera,
            dialogue: this.dialogue,
            investigation: this.investigation,
            player: this.player,
            characters: this.characters,
            atmosphere: this.atmosphere,
        });

        this.sceneRunner.onSceneEnd((info) => {
            this._handleSceneEnd(info);
        });

        this._updateLoadBar(40);
        await this._loadFirstScene();
        this._updateLoadBar(100);

        await this._delay(600);
        document.getElementById('loading-screen').classList.add('hidden');

        this._ready = true;
        this._lastTime = performance.now();
        requestAnimationFrame(t => this._loop(t));
    }

    async _loadFirstScene() {
        try {
            const module = await import('../scenes/cold_open.js');
            const sceneConfig = module.default;

            this._updateLoadBar(70);
            await this._delay(300);

            await this._showTitleCard(sceneConfig.title, sceneConfig.subtitle);

            this.sceneRunner.loadScene(sceneConfig);
            if (sceneConfig.playerBounds) {
                this.player.setBounds(sceneConfig.playerBounds);
            }
        } catch (err) {
            console.error('Failed to load scene:', err);
            this._showError('Scene failed to load. Check console.');
        }
    }

    async _showTitleCard(title, subtitle) {
        const card = document.getElementById('title-card');
        document.getElementById('title-card-title').textContent = title || '';
        document.getElementById('title-card-subtitle').textContent = subtitle || '';
        card.classList.add('visible');
        await this._delay(3000);
        card.classList.remove('visible');
        await this._delay(1500);
    }

    _handleSceneEnd(info) {
        if (!info) return;

        const fade = document.getElementById('fade-overlay');
        fade.classList.add('visible');

        setTimeout(async () => {
            if (info.next) {
                try {
                    const module = await import(`../scenes/${info.next}.js`);
                    await this._showTitleCard(module.default.title, module.default.subtitle);
                    this.sceneRunner.loadScene(module.default);
                    if (module.default.playerBounds) {
                        this.player.setBounds(module.default.playerBounds);
                    }
                } catch (err) {
                    console.error('Failed to load next scene:', err);
                }
            }
            fade.classList.remove('visible');
        }, 2000);
    }

    _loop(timestamp) {
        requestAnimationFrame(t => this._loop(t));
        if (!this._ready) return;

        const dt = Math.min(0.1, (timestamp - this._lastTime) / 1000);
        this._lastTime = timestamp;
        this._time += dt;

        this.input.update();

        if (this.input.advancePressed || this.input.interactPressed) {
            const advanced = this.sceneRunner.handleAdvance();
            if (!advanced && this.input.interactPressed) {
                this.sceneRunner.handleInteract();
            }
            this.input.consumeAdvance();
            this.input.consumeInteract();
        }

        this.sceneRunner.update(dt);
        this.player.update(dt);
        this.camera.update(dt);
        this.atmosphere.update(dt);
        this.characters.update(dt);
        this.investigation.update(dt);
        this.dialogue.update(dt);

        if (this.sceneRunner.state === 'free_roam') {
            const target = this.world.getInteractableInRange(this.player.position);
            this.investigation.setTarget(target);
            if (!target) this.investigation.clearTarget();
        }

        this.world.updateInteractableHighlights(this.player.position, dt, this._time);
        this.renderer.render(dt);
    }

    _updateLoadBar(pct) {
        const bar = document.getElementById('loading-bar');
        if (bar) bar.style.width = pct + '%';
    }

    _showError(msg) {
        document.getElementById('loading-hint').textContent = msg;
        document.getElementById('loading-hint').style.color = '#cc4444';
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const game = new Game();
game.init().catch(err => console.error('Game init failed:', err));
