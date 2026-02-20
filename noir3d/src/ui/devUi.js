export class DevUi {
  constructor({
    rootEl,
    reloadBtn,
    restartBtn,
    msgEl,
    sceneEl,
    beatEl,
    onReload,
    onRestart,
  }) {
    this.rootEl = rootEl;
    this.reloadBtn = reloadBtn;
    this.restartBtn = restartBtn;
    this.msgEl = msgEl;
    this.sceneEl = sceneEl;
    this.beatEl = beatEl;
    this.onReload = onReload;
    this.onRestart = onRestart;

    this.reloadBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this._run("Reloading content…", this.onReload);
    });
    this.restartBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this._run("Restarting scene…", this.onRestart);
    });
  }

  isOpen() {
    return this.rootEl.classList.contains("show");
  }

  open() {
    this.rootEl.classList.add("show");
  }

  close() {
    this.rootEl.classList.remove("show");
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  setDebug(sceneId, beatId) {
    this.sceneEl.textContent = sceneId || "—";
    this.beatEl.textContent = beatId || "—";
  }

  async _run(msg, fn) {
    this.msgEl.textContent = msg;
    try {
      await fn?.();
      this.msgEl.textContent = "OK.";
      setTimeout(() => {
        if (this.msgEl.textContent === "OK.") this.msgEl.textContent = "";
      }, 1500);
    } catch (err) {
      this.msgEl.textContent = `Error: ${err?.message || err}`;
    }
  }
}

