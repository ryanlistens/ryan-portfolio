export class SceneRunner {
    constructor({ world, camera, dialogue, investigation, player, characters, atmosphere }) {
        this.world = world;
        this.camera = camera;
        this.dialogue = dialogue;
        this.investigation = investigation;
        this.player = player;
        this.characters = characters;
        this.atmosphere = atmosphere;

        this._sceneConfig = null;
        this._beats = [];
        this._beatIndex = -1;
        this._currentBeat = null;
        this._state = 'idle';
        this._freeRoamActive = false;
        this._requiredClues = [];
        this._freeRoamCallback = null;
        this._examineSequence = null;
        this._examineIndex = 0;
        this._sceneEndCallback = null;
        this._waitTimer = 0;
    }

    get state() { return this._state; }

    onSceneEnd(cb) { this._sceneEndCallback = cb; }

    loadScene(sceneConfig) {
        this._sceneConfig = sceneConfig;
        this.atmosphere.configure(sceneConfig.environment || {});
        this.world.build(sceneConfig);
        this.characters.clear();

        for (const charConfig of (sceneConfig.characters || [])) {
            if (charConfig.id === 'player') {
                this.player.spawn(charConfig);
            } else {
                this.characters.create(charConfig);
            }
        }

        this._beats = sceneConfig.beats || [];
        this._beatIndex = -1;
        this._state = 'running';
        this.investigation.reset();

        document.getElementById('scene-location').textContent =
            sceneConfig.subtitle || sceneConfig.title || '';

        this._advanceBeat();
    }

    _advanceBeat() {
        this._beatIndex++;
        if (this._beatIndex >= this._beats.length) {
            this._state = 'complete';
            if (this._sceneEndCallback) this._sceneEndCallback(this._sceneConfig);
            return;
        }

        this._currentBeat = this._beats[this._beatIndex];
        this._processBeat(this._currentBeat);
    }

    async _processBeat(beat) {
        switch (beat.type) {
            case 'narration':
                this.player.disable();
                this.dialogue.showNarration(beat.text, () => {
                    if (!beat.keepDialogue) this.dialogue.hide();
                    this._advanceBeat();
                });
                break;

            case 'dialogue':
                this.player.disable();
                this._runDialogueExchange(beat.exchange, beat.branches, () => {
                    this.dialogue.hide();
                    this._advanceBeat();
                });
                break;

            case 'camera':
                if (beat.concurrent) {
                    this.camera.executeMoveImmediate(beat);
                    this._advanceBeat();
                } else {
                    await this.camera.executeMove(beat);
                    this._advanceBeat();
                }
                break;

            case 'free_roam':
                this._enterFreeRoam(beat);
                break;

            case 'trigger':
                this._processTrigger(beat);
                break;

            case 'reveal':
                this.characters.show(beat.character);
                this._advanceBeat();
                break;

            case 'hide':
                this.characters.hide(beat.character);
                this._advanceBeat();
                break;

            case 'wait':
                this._waitTimer = beat.duration || 2;
                this._state = 'waiting';
                break;

            case 'enable_player':
                this.player.enable();
                this.camera.followPlayer(this.player);
                this._advanceBeat();
                break;

            case 'disable_player':
                this.player.disable();
                this._advanceBeat();
                break;

            case 'scene_end':
                this._state = 'complete';
                if (this._sceneEndCallback) {
                    this._sceneEndCallback({
                        next: beat.next,
                        transition: beat.transition || 'fade_black',
                    });
                }
                break;

            case 'clue':
                this.investigation.collectClue(beat);
                this._advanceBeat();
                break;

            case 'set_camera_mode':
                this.camera.setMode(beat.mode);
                if (beat.mode === 'follow' && this.player) {
                    this.camera.followPlayer(this.player);
                }
                this._advanceBeat();
                break;

            case 'sequence':
                await this._runSequence(beat.steps || []);
                this._advanceBeat();
                break;

            default:
                this._advanceBeat();
                break;
        }
    }

    _enterFreeRoam(beat) {
        this._freeRoamActive = true;
        this._requiredClues = beat.requiredClues || [];
        this.player.enable();
        this.camera.followPlayer(this.player);
        this.investigation.enable();
        this._state = 'free_roam';

        if (beat.hint) {
            this.dialogue.showNarration(beat.hint, () => {
                this.dialogue.hide();
            });
        }
    }

    _exitFreeRoam() {
        this._freeRoamActive = false;
        this.investigation.disable();
        this.player.disable();
        this._state = 'running';
        this._advanceBeat();
    }

    _processTrigger(beat) {
        if (beat.condition === 'clues_found') {
            const target = beat.clues || this._requiredClues;
            if (this.investigation.hasAllClues(target)) {
                this._runTriggerActions(beat.then || [], () => this._advanceBeat());
            } else {
                this._advanceBeat();
            }
        } else {
            this._advanceBeat();
        }
    }

    async _runTriggerActions(actions, onDone) {
        for (const action of actions) {
            await this._executeAction(action);
        }
        if (onDone) onDone();
    }

    _executeAction(action) {
        return new Promise(resolve => {
            switch (action.type) {
                case 'camera':
                    this.camera.executeMove(action).then(resolve);
                    break;
                case 'narration':
                    this.dialogue.showNarration(action.text, () => {
                        if (!action.keepDialogue) this.dialogue.hide();
                        resolve();
                    });
                    break;
                case 'reveal':
                    this.characters.show(action.character);
                    resolve();
                    break;
                case 'hide':
                    this.characters.hide(action.character);
                    resolve();
                    break;
                case 'clue':
                    this.investigation.collectClue(action);
                    resolve();
                    break;
                case 'wait':
                    setTimeout(resolve, (action.duration || 1) * 1000);
                    break;
                default:
                    resolve();
            }
        });
    }

    async _runSequence(steps) {
        for (const step of steps) {
            await this._executeAction(step);
        }
    }

    _runDialogueExchange(lines, branches, onDone) {
        let index = 0;

        const next = () => {
            if (index >= lines.length) {
                if (onDone) onDone();
                return;
            }

            const line = lines[index];
            index++;

            if (line.type === 'choice') {
                this.dialogue.showChoices(line.options, (chosen) => {
                    if (chosen.next && branches && branches[chosen.next]) {
                        this._runDialogueExchange(branches[chosen.next], null, onDone);
                    } else {
                        next();
                    }
                });
            } else if (line.type === 'narration') {
                this.dialogue.showNarration(line.text, next);
            } else if (line.type === 'clue') {
                this.investigation.collectClue(line);
                next();
            } else {
                this.dialogue.showLine(line.speaker || '', line.text, next);
            }
        };

        next();
    }

    handleInteract() {
        if (this._state === 'free_roam' && this.investigation.enabled) {
            const target = this.investigation.getCurrentTarget();
            if (target && target.onExamine) {
                this.investigation.markExamined(target.id);
                this.player.disable();
                this.camera.savePosition();
                this._runExamineSequence(target.onExamine, () => {
                    this.player.enable();
                    this.camera.followPlayer(this.player);
                    this._checkFreeRoamComplete();
                });
                return true;
            }
        }
        return false;
    }

    async _runExamineSequence(steps, onDone) {
        for (const step of steps) {
            await this._executeAction(step);
        }
        this.dialogue.hide();
        if (onDone) onDone();
    }

    _checkFreeRoamComplete() {
        if (this._requiredClues.length > 0 && this.investigation.hasAllClues(this._requiredClues)) {
            setTimeout(() => this._exitFreeRoam(), 500);
        }
    }

    handleAdvance() {
        if (this.dialogue.isActive) {
            return this.dialogue.advance();
        }
        return false;
    }

    update(dt) {
        if (this._state === 'waiting') {
            this._waitTimer -= dt;
            if (this._waitTimer <= 0) {
                this._state = 'running';
                this._advanceBeat();
            }
        }
    }
}
