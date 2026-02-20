export class CaseUi {
  constructor({ openBtn, panelEl, closeBtn, notesEl }) {
    this.openBtn = openBtn;
    this.panelEl = panelEl;
    this.closeBtn = closeBtn;
    this.notesEl = notesEl;

    this.openBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.close();
    });
    this.panelEl.addEventListener("click", (e) => {
      if (e.target === this.panelEl) this.close();
    });
  }

  setNotes(notes) {
    this.notesEl.innerHTML = "";
    for (const n of notes || []) {
      const div = document.createElement("div");
      div.className = "note";
      div.textContent = n;
      this.notesEl.appendChild(div);
    }
  }

  isOpen() {
    return this.panelEl.classList.contains("show");
  }

  open() {
    this.panelEl.classList.add("show");
  }

  close() {
    this.panelEl.classList.remove("show");
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }
}

