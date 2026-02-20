function normalizeNode(node) {
  if (Array.isArray(node)) return node;
  if (node && Array.isArray(node.lines)) return node.lines;
  throw new Error("Dialogue node must be an array or { lines: [...] }");
}

export class DialogueUi {
  constructor({ rootEl, speakerEl, textEl, choicesEl }) {
    this.rootEl = rootEl;
    this.speakerEl = speakerEl;
    this.textEl = textEl;
    this.choicesEl = choicesEl;

    this._open = false;
    this._lines = [];
    this._i = 0;
    this._resolve = null;
    this._hooks = null;

    this.rootEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.advance();
    });
  }

  isOpen() {
    return this._open;
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this.rootEl.classList.remove("show");
    this._lines = [];
    this._i = 0;
    this.choicesEl.innerHTML = "";
    this._hooks = null;
    if (this._resolve) {
      const r = this._resolve;
      this._resolve = null;
      r();
    }
  }

  async play(node, hooks) {
    if (this._open) this.close();
    this._hooks = hooks || {};
    this._lines = normalizeNode(node);
    this._i = 0;
    this._open = true;
    this.rootEl.classList.add("show");
    this._render();
    return await new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  advance() {
    if (!this._open) return;
    // If choices are visible, ignore advance.
    if (this.choicesEl.childElementCount > 0) return;
    this._i++;
    this._render();
  }

  _applyEffects(effects) {
    if (!effects) return;
    const effs = Array.isArray(effects) ? effects : [effects];
    for (const e of effs) {
      if (!e) continue;
      if (e.type === "setFlag") this._hooks?.onSetFlag?.(e.flag, e.value ?? true);
      else if (e.type === "addNote") this._hooks?.onAddNote?.(e.text);
      else if (e.type === "addItem") this._hooks?.onAddItem?.(e.item);
      else if (e.type === "gotoBeat") this._hooks?.onGotoBeat?.(e.beat);
    }
  }

  _render() {
    if (!this._open) return;
    if (this._i >= this._lines.length) {
      this.close();
      return;
    }

    const line = this._lines[this._i] || {};
    this.speakerEl.textContent = String(line.speaker || "—");
    this.textEl.textContent = String(line.text || "");

    this.choicesEl.innerHTML = "";
    if (Array.isArray(line.effects)) this._applyEffects(line.effects);

    if (Array.isArray(line.choices) && line.choices.length > 0) {
      for (const ch of line.choices) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = String(ch.text || "…");
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          if (ch.effects) this._applyEffects(ch.effects);
          this.close();
        });
        this.choicesEl.appendChild(b);
      }
    }
  }
}

