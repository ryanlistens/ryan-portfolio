function uniqPush(arr, value) {
  if (arr.includes(value)) return false;
  arr.push(value);
  return true;
}

function isObj(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function matchCond(state, cond) {
  if (!cond) return true;
  if (!isObj(cond)) return false;
  if (Array.isArray(cond.all)) return cond.all.every((c) => matchCond(state, c));
  if (Array.isArray(cond.any)) return cond.any.some((c) => matchCond(state, c));
  if (cond.flagSet) return Boolean(state.flags?.[cond.flagSet]);
  if (cond.flagNotSet) return !state.flags?.[cond.flagNotSet];
  if (cond.hasItem) return state.inventory?.includes(cond.hasItem);
  if (cond.missingItem) return !state.inventory?.includes(cond.missingItem);
  return false;
}

export class StoryRuntime {
  constructor({ storage, content, world, hudUi, dialogueUi, caseUi }) {
    this.storage = storage;
    this.content = content;
    this.world = world;
    this.hudUi = hudUi;
    this.dialogueUi = dialogueUi;
    this.caseUi = caseUi;

    this.scenePath = null;
    this.scene = null;
    this.dialogue = {};

    this.state = this.storage.getJson("state", null) || this._defaultState();
    this.onDebugChanged = null;
  }

  _defaultState() {
    return {
      sceneId: null,
      beatId: null,
      setId: null,
      objective: "",
      flags: {},
      inventory: [],
      notes: [],
    };
  }

  _save() {
    this.storage.setJson("state", this.state);
  }

  async start(scenePath) {
    this.scenePath = scenePath;
    await this._loadScene({ bustCache: false });

    // If we have saved progress and it matches the scene, restore it.
    if (this.state.sceneId !== this.scene.id) {
      this.state = this._defaultState();
      this.state.sceneId = this.scene.id;
    }

    this._applyUiFromState();
    await this._gotoBeat(this.state.beatId || this.scene.startBeat, { forceReloadSet: true });
  }

  async reloadContent() {
    await this._loadScene({ bustCache: true });
    await this._gotoBeat(this.state.beatId || this.scene.startBeat, { forceReloadSet: true });
  }

  async restartScene() {
    this.state = this._defaultState();
    this.storage.remove("state");
    await this.start(this.scenePath);
  }

  action() {
    if (this.dialogueUi.isOpen()) {
      this.dialogueUi.advance();
      return;
    }
    this.world.attack?.();
  }

  onEnemyDown(enemyId) {
    if (!enemyId) return;
    this._setFlag(`enemyDown:${enemyId}`, true);
    void this._emitBeatEvent("enemyDown", enemyId);
  }

  interact(hotspotId) {
    if (this.dialogueUi.isOpen()) {
      this.dialogueUi.advance();
      return;
    }
    void this._handleHotspot(hotspotId);
  }

  onEmptyClick(hit) {
    if (this.dialogueUi.isOpen()) {
      this.dialogueUi.advance();
      return;
    }
    const beat = this._beat();
    if (beat?.allowMove && hit?.point) this.world.movePlayerTo(hit.point);
  }

  _applyUiFromState() {
    this.hudUi.setObjective(this.state.objective || "—");
    this.caseUi.setNotes(this.state.notes || []);
  }

  _beat() {
    if (!this.scene) return null;
    return this.scene.beats?.[this.state.beatId] || null;
  }

  async _loadScene({ bustCache }) {
    const scene = await this.content.loadJson(this.scenePath, { bustCache });
    if (!scene?.id || !scene?.beats || !scene?.startBeat) {
      throw new Error("Scene JSON missing required fields: id, startBeat, beats");
    }
    this.scene = scene;

    if (scene.dialoguePath) {
      this.dialogue = await this.content.loadJson(scene.dialoguePath, { bustCache });
    } else {
      this.dialogue = scene.dialogue || {};
    }
  }

  async _gotoBeat(beatId, { forceReloadSet = false } = {}) {
    const beat = this.scene.beats?.[beatId];
    if (!beat) throw new Error(`Unknown beat: ${beatId}`);

    this.state.sceneId = this.scene.id;
    this.state.beatId = beatId;
    this._save();

    if (typeof this.onDebugChanged === "function") {
      this.onDebugChanged({ sceneId: this.state.sceneId, beatId: this.state.beatId });
    }

    const nextSetId = beat.set || this.state.setId || null;
    if (nextSetId && (forceReloadSet || nextSetId !== this.state.setId)) {
      const setDef = this.scene.sets?.[nextSetId];
      if (!setDef) throw new Error(`Beat references missing set: ${nextSetId}`);
      this.state.setId = nextSetId;
      this._save();
      await this.world.loadSet(setDef);
    }

    if (beat.shot) {
      const shot = this.scene.shots?.[beat.shot] || beat.shot;
      await this.world.setShot(shot);
    }

    if (beat.location) this.hudUi.showLocation(beat.location);
    if (beat.objective != null) this._setObjective(beat.objective);

    if (Array.isArray(beat.onEnter)) await this._runActions(beat.onEnter);
  }

  async _handleHotspot(hotspotId) {
    const beat = this._beat();
    if (!beat?.hotspots) return;

    const candidates = beat.hotspots[hotspotId];
    const list = Array.isArray(candidates) ? candidates : candidates ? [candidates] : [];
    const match = list.find((c) => matchCond(this.state, c.if));
    if (!match) return;

    if (Array.isArray(match.actions)) await this._runActions(match.actions);
  }

  async _emitBeatEvent(type, key) {
    const beat = this._beat();
    const map = beat?.events?.[type];
    if (!map) return;
    const actions = map[key] || map["*"];
    if (Array.isArray(actions)) await this._runActions(actions);
  }

  _setObjective(text) {
    this.state.objective = text || "";
    this._save();
    this.hudUi.setObjective(this.state.objective || "—");
  }

  _addNote(text) {
    if (!text) return;
    if (!this.state.notes) this.state.notes = [];
    if (uniqPush(this.state.notes, text)) {
      this._save();
      this.caseUi.setNotes(this.state.notes);
    }
  }

  _setFlag(flag, value = true) {
    if (!flag) return;
    if (!this.state.flags) this.state.flags = {};
    this.state.flags[flag] = Boolean(value);
    this._save();
  }

  _addItem(itemId) {
    if (!itemId) return;
    if (!this.state.inventory) this.state.inventory = [];
    if (uniqPush(this.state.inventory, itemId)) this._save();
  }

  async _runActions(actions) {
    for (const a of actions) {
      if (!a) continue;
      if (typeof a === "string") {
        // Convenience: treat a string as a dialogue key.
        await this._showDialogue(a);
        continue;
      }
      if (!matchCond(this.state, a.if)) continue;

      switch (a.type) {
        case "wait":
          await new Promise((r) => setTimeout(r, Math.max(0, Number(a.ms) || 0)));
          break;
        case "gotoBeat":
          await this._gotoBeat(a.beat, { forceReloadSet: Boolean(a.reloadSet) });
          return; // beat change exits current action chain
        case "setShot":
          await this.world.setShot(this.scene.shots?.[a.shot] || a.shot);
          break;
        case "setSet":
          if (!a.set) throw new Error("setSet missing 'set'");
          await this.world.loadSet(this.scene.sets?.[a.set] || a.set);
          this.state.setId = a.set;
          this._save();
          break;
        case "setHotspotVisible":
          this.world.setHotspotVisible?.(a.hotspot, Boolean(a.visible));
          break;
        case "showLocation":
          this.hudUi.showLocation(a.text || "");
          break;
        case "setObjective":
          this._setObjective(a.text || "");
          break;
        case "addNote":
          this._addNote(a.text || "");
          break;
        case "setFlag":
          this._setFlag(a.flag, a.value ?? true);
          break;
        case "addItem":
          this._addItem(a.item);
          break;
        case "showDialogue":
          await this._showDialogue(a.key);
          break;
        default:
          throw new Error(`Unknown action type: ${a.type}`);
      }
    }
  }

  async _showDialogue(key) {
    const node = this.dialogue?.[key];
    if (!node) throw new Error(`Missing dialogue key: ${key}`);
    await this.dialogueUi.play(node, {
      onSetFlag: (flag, value) => this._setFlag(flag, value),
      onAddNote: (text) => this._addNote(text),
      onAddItem: (item) => this._addItem(item),
      onGotoBeat: async (beat) => this._gotoBeat(beat, { forceReloadSet: false }),
    });
  }
}

