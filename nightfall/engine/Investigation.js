export class Investigation {
    constructor() {
        this._promptEl = document.getElementById('interact-prompt');
        this._cluePopup = document.getElementById('clue-popup');
        this._clueName = document.getElementById('clue-name');
        this._clueCountEl = document.getElementById('clue-count');

        this.collectedClues = new Set();
        this.enabled = false;
        this._currentTarget = null;
        this._examining = false;
        this._cluePopupTimer = 0;
    }

    get isExamining() { return this._examining; }

    enable() { this.enabled = true; }
    disable() {
        this.enabled = false;
        this._hidePrompt();
    }

    setTarget(interactable) {
        if (interactable !== this._currentTarget) {
            this._currentTarget = interactable;
            if (interactable && !this.collectedClues.has(interactable.id + '_done')) {
                this._showPrompt(interactable.prompt || 'Examine');
            } else {
                this._hidePrompt();
            }
        }
    }

    clearTarget() {
        this._currentTarget = null;
        this._hidePrompt();
    }

    getCurrentTarget() {
        if (this._currentTarget && !this.collectedClues.has(this._currentTarget.id + '_done')) {
            return this._currentTarget;
        }
        return null;
    }

    markExamined(id) {
        this.collectedClues.add(id + '_done');
        this._hidePrompt();
    }

    collectClue(clue) {
        this.collectedClues.add(clue.id);
        this._showCluePopup(clue.name);
        this._updateClueCount();
    }

    hasClue(id) {
        return this.collectedClues.has(id);
    }

    hasAllClues(clueIds) {
        return clueIds.every(id => this.collectedClues.has(id));
    }

    _showPrompt(text) {
        this._promptEl.textContent = text;
        this._promptEl.classList.add('visible');
    }

    _hidePrompt() {
        this._promptEl.classList.remove('visible');
    }

    _showCluePopup(name) {
        this._clueName.textContent = name;
        this._cluePopup.classList.add('visible');
        this._cluePopupTimer = 3;
    }

    _updateClueCount() {
        const count = [...this.collectedClues].filter(c => !c.endsWith('_done')).length;
        this._clueCountEl.textContent = count > 0 ? `CLUES: ${count}` : '';
    }

    update(dt) {
        if (this._cluePopupTimer > 0) {
            this._cluePopupTimer -= dt;
            if (this._cluePopupTimer <= 0) {
                this._cluePopup.classList.remove('visible');
            }
        }
    }

    reset() {
        this.collectedClues.clear();
        this.enabled = false;
        this._examining = false;
        this._currentTarget = null;
        this._hidePrompt();
        this._cluePopup.classList.remove('visible');
        this._clueCountEl.textContent = '';
    }
}
