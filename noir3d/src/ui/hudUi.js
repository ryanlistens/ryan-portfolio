export class HudUi {
  constructor({ locEl, objectiveTextEl }) {
    this.locEl = locEl;
    this.objectiveTextEl = objectiveTextEl;
    this._locTimer = null;
  }

  setObjective(text) {
    this.objectiveTextEl.textContent = text || "—";
  }

  showLocation(text) {
    if (!text) return;
    if (this._locTimer) clearTimeout(this._locTimer);
    this.locEl.textContent = text;
    this.locEl.classList.add("show");
    this._locTimer = setTimeout(() => {
      this.locEl.classList.remove("show");
    }, 2600);
  }
}

