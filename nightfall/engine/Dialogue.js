export class Dialogue {
    constructor() {
        this._overlay = document.getElementById('dialogue-overlay');
        this._speaker = document.getElementById('dialogue-speaker');
        this._text = document.getElementById('dialogue-text');
        this._advance = document.getElementById('dialogue-advance');
        this._choicesEl = document.getElementById('choices-container');

        this._active = false;
        this._typing = false;
        this._fullText = '';
        this._displayedChars = 0;
        this._charTimer = 0;
        this._typeSpeed = 0.03;
        this._callback = null;
        this._choiceCallback = null;
        this._isNarration = false;
        this._waitingForInput = false;
    }

    get isActive() { return this._active; }
    get isWaitingForInput() { return this._waitingForInput; }

    showNarration(text, callback) {
        this._show('', text, true, callback);
    }

    showLine(speaker, text, callback) {
        this._show(speaker, text, false, callback);
    }

    _show(speaker, text, isNarration, callback) {
        this._active = true;
        this._typing = true;
        this._waitingForInput = false;
        this._isNarration = isNarration;
        this._fullText = text;
        this._displayedChars = 0;
        this._charTimer = 0;
        this._callback = callback;

        this._speaker.textContent = speaker;
        this._text.textContent = '';
        this._text.className = isNarration ? 'narration' : '';
        this._advance.classList.add('hidden');
        this._overlay.classList.add('visible');
        this._choicesEl.classList.remove('visible');
    }

    showChoices(options, callback) {
        this._active = true;
        this._waitingForInput = false;
        this._typing = false;
        this._choiceCallback = callback;

        this._choicesEl.innerHTML = '';
        for (let i = 0; i < options.length; i++) {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = options[i].text;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._choicesEl.classList.remove('visible');
                if (this._choiceCallback) {
                    const cb = this._choiceCallback;
                    this._choiceCallback = null;
                    cb(options[i]);
                }
            });
            this._choicesEl.appendChild(btn);
        }
        this._choicesEl.classList.add('visible');
        this._advance.classList.add('hidden');
    }

    hide() {
        this._active = false;
        this._typing = false;
        this._waitingForInput = false;
        this._overlay.classList.remove('visible');
        this._choicesEl.classList.remove('visible');
    }

    advance() {
        if (this._typing) {
            this._displayedChars = this._fullText.length;
            this._text.textContent = this._fullText;
            this._typing = false;
            this._waitingForInput = true;
            this._advance.classList.remove('hidden');
            return false;
        }
        if (this._waitingForInput) {
            this._waitingForInput = false;
            this._advance.classList.add('hidden');
            if (this._callback) {
                const cb = this._callback;
                this._callback = null;
                cb();
            }
            return true;
        }
        return false;
    }

    update(dt) {
        if (!this._typing) return;

        this._charTimer += dt;
        const charsToAdd = Math.floor(this._charTimer / this._typeSpeed);
        if (charsToAdd > 0) {
            this._charTimer -= charsToAdd * this._typeSpeed;
            this._displayedChars = Math.min(
                this._fullText.length,
                this._displayedChars + charsToAdd
            );
            this._text.textContent = this._fullText.substring(0, this._displayedChars);

            if (this._displayedChars >= this._fullText.length) {
                this._typing = false;
                this._waitingForInput = true;
                this._advance.classList.remove('hidden');
            }
        }
    }
}
