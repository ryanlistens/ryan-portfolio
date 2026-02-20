import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";

const STORY_STORAGE_KEY = "cinematic-story-lab-draft-v1";
const STORY_SOURCE_PATH = "cinematic-scenes.json";
const MAX_LOG_LINES = 48;
const WORLD_LIMIT = 10.2;

const paletteBook = {
  "amber-noir": {
    clear: 0x05070f,
    fog: 0x0b0f1d,
    ground: 0x121620,
    lane: 0x1e2430,
    building: 0x1a1d28,
    trim: 0xffb57a,
    rain: 0x95b6ff,
    key: 0xffd8af,
    fill: 0x9eb6ff
  },
  "neon-rain": {
    clear: 0x070913,
    fog: 0x111529,
    ground: 0x121521,
    lane: 0x1d2135,
    building: 0x1a1e2c,
    trim: 0xff83c7,
    rain: 0x85e1ff,
    key: 0xff8dc8,
    fill: 0x8eafff
  },
  "cold-mercury": {
    clear: 0x07090d,
    fog: 0x0f131b,
    ground: 0x14171f,
    lane: 0x1a1e27,
    building: 0x181b23,
    trim: 0xb9d0ff,
    rain: 0xc4d6ff,
    key: 0xdce7ff,
    fill: 0x8da9d9
  }
};

const cameraPresets = {
  wideSweep: { offset: [0, 7.6, 11.5], look: [0, 1.1, 0], fov: 54 },
  shoulderLeft: { offset: [-3.5, 2.2, 5.1], look: [0, 1.1, 0], fov: 45 },
  interrogationClose: { offset: [2.2, 2.0, 3.25], look: [0, 1.2, -0.3], fov: 41 },
  pursuit: { offset: [0, 3.4, 6.0], look: [0, 1.1, 0], fov: 50 },
  overheadTension: { offset: [0.08, 10.5, 0.12], look: [0, 0.8, 0], fov: 58 },
  staticTableau: { offset: [-7.2, 4.8, 7.5], look: [0, 1.1, 0], fov: 47 }
};

const dom = {
  canvas: document.getElementById("story-stage"),
  overlayTitle: document.getElementById("overlay-title"),
  overlayText: document.getElementById("overlay-text"),
  overlayObjective: document.getElementById("overlay-objective"),
  metaLocation: document.getElementById("meta-location"),
  metaBeatType: document.getElementById("meta-beat-type"),
  choiceRow: document.getElementById("choice-row"),
  sceneSelect: document.getElementById("scene-select"),
  prevBeatBtn: document.getElementById("prev-beat-btn"),
  nextBeatBtn: document.getElementById("next-beat-btn"),
  restartSceneBtn: document.getElementById("restart-scene-btn"),
  statCredibility: document.getElementById("stat-credibility"),
  statHeat: document.getElementById("stat-heat"),
  statPressure: document.getElementById("stat-pressure"),
  fogControl: document.getElementById("fog-control"),
  cameraControl: document.getElementById("camera-control"),
  paceControl: document.getElementById("pace-control"),
  stageLog: document.getElementById("stage-log"),
  editor: document.getElementById("story-editor"),
  applyStoryBtn: document.getElementById("apply-story-btn"),
  saveDraftBtn: document.getElementById("save-draft-btn"),
  loadSeedBtn: document.getElementById("load-seed-btn"),
  resetStoryBtn: document.getElementById("reset-story-btn"),
  downloadStoryBtn: document.getElementById("download-story-btn"),
  storyUpload: document.getElementById("story-upload")
};

const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = false;

const world = new THREE.Scene();
world.fog = new THREE.FogExp2(0x0d111b, 0.018);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 140);
camera.position.set(0, 7.5, 11);

const ambient = new THREE.AmbientLight(0x7c8fb6, 0.52);
const keyLight = new THREE.DirectionalLight(0xffd9b7, 1.05);
const fillLight = new THREE.DirectionalLight(0xa0baff, 0.75);
keyLight.position.set(5, 10, 6);
fillLight.position.set(-6, 8, -5);
world.add(ambient, keyLight, fillLight);

const groups = {
  env: new THREE.Group(),
  chars: new THREE.Group(),
  clues: new THREE.Group(),
  enemies: new THREE.Group(),
  fx: new THREE.Group()
};
world.add(groups.env, groups.chars, groups.clues, groups.enemies, groups.fx);

const player = createActorMesh("#dbe7ff", true);
player.position.set(0, 0, 4.2);
world.add(player);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const tempVecA = new THREE.Vector3();
const tempVecB = new THREE.Vector3();
const tempVecC = new THREE.Vector3();

const state = {
  seedStoryText: "",
  story: null,
  sceneIndex: 0,
  beatIndex: 0,
  beatResolved: false,
  canAdvance: false,
  selectedPalette: paletteBook["amber-noir"],
  sceneFogBase: 0.018,
  worldState: {
    credibility: 0,
    heat: 0,
    casePressure: 0,
    flags: {}
  },
  cluesCollectedGlobal: new Set(),
  keyState: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    action: false
  },
  prevActionPressed: false,
  controls: {
    fog: 1,
    cameraMotion: 1,
    pace: 1
  },
  beatRuntime: freshBeatRuntime(),
  characterById: new Map(),
  characterByName: new Map(),
  rainPoints: null,
  cameraRig: {
    preset: cameraPresets.wideSweep,
    focus: new THREE.Vector3(0, 1, 0),
    baseLook: new THREE.Vector3(0, 1, 0),
    look: new THREE.Vector3(0, 1, 0),
    fov: 52,
    trackPlayer: false,
    trackMesh: null
  }
};

attachInputHandlers();
attachUiHandlers();
syncStageSize();
window.addEventListener("resize", syncStageSize);

initStory().then(() => {
  logRuntime("Cinematic Story Lab loaded. Edit JSON and hit Apply Draft.");
  animate();
});

async function initStory() {
  const seedStory = await fetchSeedStoryText();
  state.seedStoryText = JSON.stringify(seedStory, null, 2);
  const persisted = window.localStorage.getItem(STORY_STORAGE_KEY);
  const startingText = persisted || state.seedStoryText;
  dom.editor.value = startingText;
  applyStoryText(startingText, { persist: false, preserveFocus: false });
}

async function fetchSeedStoryText() {
  try {
    const response = await fetch(STORY_SOURCE_PATH);
    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    const payload = await response.json();
    return payload;
  } catch (error) {
    logRuntime(`Seed file unavailable (${error.message}). Using fallback story.`, "warn");
    return fallbackStory();
  }
}

function attachUiHandlers() {
  dom.applyStoryBtn.addEventListener("click", () => {
    applyStoryText(dom.editor.value, { persist: true, preserveFocus: true });
  });

  dom.saveDraftBtn.addEventListener("click", () => {
    window.localStorage.setItem(STORY_STORAGE_KEY, dom.editor.value);
    logRuntime("Draft saved to local storage.");
  });

  dom.loadSeedBtn.addEventListener("click", async () => {
    const latestSeed = await fetchSeedStoryText();
    state.seedStoryText = JSON.stringify(latestSeed, null, 2);
    dom.editor.value = state.seedStoryText;
    applyStoryText(state.seedStoryText, { persist: true, preserveFocus: false });
    logRuntime("Seed story file loaded.");
  });

  dom.resetStoryBtn.addEventListener("click", () => {
    dom.editor.value = state.seedStoryText;
    applyStoryText(state.seedStoryText, { persist: true, preserveFocus: false });
    logRuntime("Editor reset to seeded story.");
  });

  dom.downloadStoryBtn.addEventListener("click", () => {
    const blob = new Blob([dom.editor.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cinematic-story-draft-${stamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    logRuntime("Draft exported as JSON.");
  });

  dom.storyUpload.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      dom.editor.value = text;
      applyStoryText(text, { persist: true, preserveFocus: true });
      logRuntime(`Imported ${file.name}.`);
      dom.storyUpload.value = "";
    };
    reader.readAsText(file);
  });

  dom.sceneSelect.addEventListener("change", () => {
    const nextScene = Number(dom.sceneSelect.value || 0);
    if (!Number.isFinite(nextScene)) {
      return;
    }
    setScene(nextScene, 0);
  });

  dom.prevBeatBtn.addEventListener("click", () => {
    goToPreviousBeat();
  });

  dom.nextBeatBtn.addEventListener("click", () => {
    if (!state.canAdvance) {
      logRuntime("Beat locked: resolve objective or make a dialogue choice first.", "warn");
      return;
    }
    goToNextBeat(state.beatRuntime.pendingBeatId || null);
  });

  dom.restartSceneBtn.addEventListener("click", () => {
    setScene(state.sceneIndex, 0);
    logRuntime("Scene restarted.");
  });

  dom.fogControl.addEventListener("input", () => {
    state.controls.fog = Number(dom.fogControl.value || 1);
    applyFog();
  });

  dom.cameraControl.addEventListener("input", () => {
    state.controls.cameraMotion = Number(dom.cameraControl.value || 1);
  });

  dom.paceControl.addEventListener("input", () => {
    state.controls.pace = Number(dom.paceControl.value || 1);
  });

  dom.canvas.addEventListener("pointerdown", onStagePointerDown);
}

function attachInputHandlers() {
  const keyMap = {
    w: "forward",
    W: "forward",
    ArrowUp: "forward",
    s: "backward",
    S: "backward",
    ArrowDown: "backward",
    a: "left",
    A: "left",
    ArrowLeft: "left",
    d: "right",
    D: "right",
    ArrowRight: "right",
    e: "action",
    E: "action",
    " ": "action"
  };

  window.addEventListener("keydown", (event) => {
    const mapped = keyMap[event.key];
    if (!mapped) {
      return;
    }
    state.keyState[mapped] = true;
    if (mapped === "action" || event.key.startsWith("Arrow")) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    const mapped = keyMap[event.key];
    if (!mapped) {
      return;
    }
    state.keyState[mapped] = false;
    if (mapped === "action" || event.key.startsWith("Arrow")) {
      event.preventDefault();
    }
  });

  const touchButtons = document.querySelectorAll("[data-touch]");
  touchButtons.forEach((button) => {
    const control = button.getAttribute("data-touch");
    if (!control) {
      return;
    }
    const down = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      state.keyState[control] = true;
    };
    const up = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      state.keyState[control] = false;
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointerleave", up);
    button.addEventListener("pointercancel", up);
  });
}

function onStagePointerDown(event) {
  const currentBeat = getCurrentBeat();
  if (!currentBeat) {
    return;
  }

  const rect = dom.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (currentBeat.type === "investigation") {
    const hits = raycaster.intersectObjects(groups.clues.children, false);
    if (hits.length > 0) {
      const target = hits[0].object;
      collectClue(target);
      return;
    }
  }

  if (currentBeat.type === "action") {
    state.keyState.action = true;
    window.setTimeout(() => {
      state.keyState.action = false;
    }, 10);
  }
}

function applyStoryText(rawText, options = {}) {
  const opts = {
    persist: true,
    preserveFocus: true,
    ...options
  };

  const previousSceneId = getCurrentScene() ? getCurrentScene().id : null;
  const previousBeatId = getCurrentBeat() ? getCurrentBeat().id : null;

  try {
    const parsed = JSON.parse(rawText);
    const normalized = normalizeStory(parsed);
    validateStory(normalized);
    state.story = normalized;
  } catch (error) {
    logRuntime(`JSON parse/validation error: ${error.message}`, "error");
    return;
  }

  if (opts.persist) {
    window.localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(state.story, null, 2));
  }

  populateSceneSelect();

  let targetSceneIndex = 0;
  let targetBeatIndex = 0;

  if (opts.preserveFocus && previousSceneId) {
    const sceneIdx = state.story.scenes.findIndex((scene) => scene.id === previousSceneId);
    if (sceneIdx >= 0) {
      targetSceneIndex = sceneIdx;
      if (previousBeatId) {
        const beatIdx = state.story.scenes[sceneIdx].beats.findIndex((beat) => beat.id === previousBeatId);
        if (beatIdx >= 0) {
          targetBeatIndex = beatIdx;
        }
      }
    }
  }

  setScene(targetSceneIndex, targetBeatIndex);
  logRuntime(`Story applied: ${state.story.scenes.length} scenes available.`);
}

function normalizeStory(storyInput) {
  const copy = JSON.parse(JSON.stringify(storyInput || {}));
  copy.projectTitle = String(copy.projectTitle || "Untitled Case");
  copy.scenes = Array.isArray(copy.scenes) ? copy.scenes : [];

  copy.scenes.forEach((scene, sceneIndex) => {
    scene.id = String(scene.id || `scene-${sceneIndex + 1}`);
    scene.title = String(scene.title || `Scene ${sceneIndex + 1}`);
    scene.location = String(scene.location || "Unknown location");
    scene.palette = String(scene.palette || "amber-noir");
    scene.fogDensity = Number(scene.fogDensity || 0.018);
    scene.characters = Array.isArray(scene.characters) ? scene.characters : [];
    scene.beats = Array.isArray(scene.beats) ? scene.beats : [];

    scene.characters.forEach((character, charIndex) => {
      character.id = String(character.id || `${scene.id}-char-${charIndex + 1}`);
      character.name = String(character.name || character.id);
      character.role = String(character.role || "Role");
      character.color = String(character.color || "#a8c8ff");
      if (!Array.isArray(character.position)) {
        character.position = [charIndex * 1.8 - 1.8, 0, -2.2];
      }
    });

    scene.beats.forEach((beat, beatIndex) => {
      beat.id = String(beat.id || `${scene.id}-beat-${beatIndex + 1}`);
      beat.type = String(beat.type || "direction").toLowerCase();
      beat.text = String(beat.text || "");
      beat.camera = String(beat.camera || "wideSweep");
      beat.objective = beat.objective ? String(beat.objective) : "";

      if (beat.type === "dialogue") {
        beat.speaker = String(beat.speaker || "");
        beat.choices = Array.isArray(beat.choices) ? beat.choices : [];
      }

      if (beat.type === "investigation") {
        beat.requiredClues = Number(beat.requiredClues || 0);
        beat.clues = Array.isArray(beat.clues) ? beat.clues : [];
      }
    });
  });

  return copy;
}

function validateStory(story) {
  if (!story || !Array.isArray(story.scenes) || story.scenes.length === 0) {
    throw new Error("Story must contain at least one scene.");
  }

  const sceneIds = new Set();
  story.scenes.forEach((scene) => {
    if (!scene.id) {
      throw new Error("Every scene needs an id.");
    }
    if (sceneIds.has(scene.id)) {
      throw new Error(`Duplicate scene id "${scene.id}".`);
    }
    sceneIds.add(scene.id);

    if (!Array.isArray(scene.beats) || scene.beats.length === 0) {
      throw new Error(`Scene "${scene.id}" requires at least one beat.`);
    }

    const beatIds = new Set();
    scene.beats.forEach((beat) => {
      if (!beat.id) {
        throw new Error(`Scene "${scene.id}" has beat without id.`);
      }
      if (beatIds.has(beat.id)) {
        throw new Error(`Duplicate beat id "${beat.id}" in scene "${scene.id}".`);
      }
      beatIds.add(beat.id);
      const allowed = ["direction", "dialogue", "investigation", "action", "vignette"];
      if (!allowed.includes(beat.type)) {
        throw new Error(`Unsupported beat type "${beat.type}" in beat "${beat.id}".`);
      }
    });
  });
}

function populateSceneSelect() {
  dom.sceneSelect.innerHTML = "";
  state.story.scenes.forEach((scene, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${index + 1}. ${scene.title}`;
    dom.sceneSelect.appendChild(option);
  });
}

function setScene(sceneIndex, beatIndex = 0) {
  if (!state.story) {
    return;
  }

  const boundedSceneIndex = clamp(Math.trunc(sceneIndex), 0, state.story.scenes.length - 1);
  state.sceneIndex = boundedSceneIndex;
  const activeScene = getCurrentScene();
  dom.sceneSelect.value = String(state.sceneIndex);

  state.sceneFogBase = Number(activeScene.fogDensity || 0.018);
  state.selectedPalette = paletteBook[activeScene.palette] || paletteBook["amber-noir"];
  buildEnvironment(activeScene, state.selectedPalette);
  placeCharacters(activeScene);

  player.position.set(0, 0, 4.2);
  player.rotation.y = Math.PI;

  const boundedBeatIndex = clamp(Math.trunc(beatIndex), 0, activeScene.beats.length - 1);
  enterBeat(boundedBeatIndex);
}

function enterBeat(beatIndex) {
  const scene = getCurrentScene();
  const boundedBeatIndex = clamp(Math.trunc(beatIndex), 0, scene.beats.length - 1);
  state.beatIndex = boundedBeatIndex;
  state.beatRuntime = freshBeatRuntime();
  state.beatResolved = false;
  clearBeatGroups();

  const beat = getCurrentBeat();
  state.beatRuntime.type = beat.type;
  state.beatRuntime.pendingBeatId = beat.nextBeatId ? String(beat.nextBeatId) : null;

  setCameraForBeat(scene, beat);
  renderBeatOverlay(scene, beat);
  renderChoices([]);

  switch (beat.type) {
    case "dialogue":
      setupDialogueBeat(beat);
      break;
    case "investigation":
      setupInvestigationBeat(beat);
      break;
    case "action":
      setupActionBeat(beat);
      break;
    case "vignette":
    case "direction":
    default:
      setupDirectionLikeBeat(beat);
      break;
  }

  refreshStatsUi();
  updateAdvanceState();
}

function setupDirectionLikeBeat(beat) {
  setObjective(beat.objective || "Observe and move when the pacing feels right.");
  resolveBeat("Beat ready. Advance at your own pace.");
}

function setupDialogueBeat(beat) {
  const hasChoices = Array.isArray(beat.choices) && beat.choices.length > 0;
  if (!hasChoices) {
    setObjective(beat.objective || "No choice required. Advance when ready.");
    resolveBeat("Dialogue beat has no branches.");
    return;
  }
  setObjective(beat.objective || "Choose your tone before advancing.");
  renderChoices(beat.choices);
  lockBeat();
}

function setupInvestigationBeat(beat) {
  const clues = Array.isArray(beat.clues) ? beat.clues : [];
  state.beatRuntime.requiredClues = Math.max(
    1,
    Number(beat.requiredClues || clues.length || 1)
  );
  state.beatRuntime.collectedThisBeat = new Set();

  clues.forEach((clue, index) => {
    const mesh = createClueMesh(clue, index);
    groups.clues.add(mesh);
  });

  if (groups.clues.children.length === 0) {
    resolveBeat("No clues configured for investigation beat.");
    setObjective("No clue objects found in this beat. You can advance.");
    return;
  }

  refreshInvestigationObjective();
  lockBeat();
}

function setupActionBeat(beat) {
  const enemyCount = Math.max(1, Number(beat.enemyCount || 3));
  const spawnRadius = Math.max(4.2, Number(beat.spawnRadius || 7.2));
  state.beatRuntime.actionTimer = Math.max(6, Number(beat.durationSec || 18));
  state.beatRuntime.focus = 100;
  state.beatRuntime.enemies = [];

  for (let i = 0; i < enemyCount; i += 1) {
    const enemy = createEnemyMesh(i);
    const angle = (Math.PI * 2 * i) / enemyCount + Math.random() * 0.5;
    const radius = spawnRadius * (0.88 + Math.random() * 0.24);
    enemy.position.set(Math.cos(angle) * radius, 0.0, Math.sin(angle) * radius);
    enemy.userData.speed = 1.3 + Math.random() * 0.55;
    enemy.userData.phase = Math.random() * Math.PI * 2;
    enemy.userData.lastHitAt = 0;
    groups.enemies.add(enemy);
    state.beatRuntime.enemies.push(enemy);
  }

  refreshActionObjective();
  lockBeat();
}

function refreshInvestigationObjective() {
  const found = state.beatRuntime.collectedThisBeat.size;
  const required = state.beatRuntime.requiredClues;
  const base = getCurrentBeat().objective || "Collect clues.";
  setObjective(`${base} (${found}/${required})`);
}

function refreshActionObjective() {
  const timer = Math.max(0, state.beatRuntime.actionTimer).toFixed(1);
  const alive = state.beatRuntime.enemies.filter((enemy) => enemy.userData.alive !== false).length;
  const focus = Math.max(0, state.beatRuntime.focus).toFixed(0);
  const base = getCurrentBeat().objective || "Hold the line.";
  setObjective(`${base} | ${timer}s | threats ${alive} | focus ${focus}`);
}

function renderBeatOverlay(scene, beat) {
  dom.overlayTitle.textContent = scene.title;
  dom.metaLocation.textContent = scene.location;
  dom.metaBeatType.textContent = `${beat.type.toUpperCase()} ${state.beatIndex + 1}/${scene.beats.length}`;
  dom.overlayText.textContent = dialogueStyledCopy(beat);
}

function dialogueStyledCopy(beat) {
  if (beat.type === "dialogue" && beat.speaker) {
    return `${beat.speaker}: ${beat.text}`;
  }
  return beat.text || "No beat text.";
}

function renderChoices(choices) {
  dom.choiceRow.innerHTML = "";
  if (!Array.isArray(choices) || choices.length === 0) {
    return;
  }

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-btn";
    button.textContent = choice.label || "Select";
    button.addEventListener("click", () => {
      applyChoice(choice);
      [...dom.choiceRow.querySelectorAll("button")].forEach((node) => {
        node.disabled = true;
      });
    });
    dom.choiceRow.appendChild(button);
  });
}

function applyChoice(choice) {
  state.worldState.credibility += Number(choice.credibility || 0);
  state.worldState.heat += Number(choice.heat || 0);
  state.worldState.casePressure += Number(choice.casePressure || 0);

  if (Array.isArray(choice.setFlags)) {
    choice.setFlags.forEach((flag) => {
      state.worldState.flags[String(flag)] = true;
    });
  }

  if (choice.response) {
    dom.overlayText.textContent = String(choice.response);
  }

  if (choice.nextBeatId) {
    state.beatRuntime.pendingBeatId = String(choice.nextBeatId);
  }

  refreshStatsUi();
  resolveBeat("Choice locked. You can advance.");
}

function collectClue(clueMesh) {
  if (!clueMesh || !clueMesh.userData || !clueMesh.userData.clue) {
    return;
  }
  const clue = clueMesh.userData.clue;
  const clueId = String(clue.id || clue.label || `clue-${Date.now()}`);

  if (state.beatRuntime.collectedThisBeat.has(clueId)) {
    return;
  }

  state.beatRuntime.collectedThisBeat.add(clueId);
  state.cluesCollectedGlobal.add(clueId);

  groups.clues.remove(clueMesh);
  disposeObject(clueMesh);

  logRuntime(`Clue found: ${clue.label || clueId}`);
  refreshInvestigationObjective();

  if (state.beatRuntime.collectedThisBeat.size >= state.beatRuntime.requiredClues) {
    state.worldState.credibility += 1;
    refreshStatsUi();
    resolveBeat("Investigation complete.");
  }
}

function resolveBeat(message) {
  state.beatResolved = true;
  state.canAdvance = true;
  updateAdvanceState();
  if (message) {
    logRuntime(message);
  }
}

function lockBeat() {
  state.beatResolved = false;
  state.canAdvance = false;
  updateAdvanceState();
}

function updateAdvanceState() {
  dom.nextBeatBtn.disabled = !state.canAdvance;
}

function setObjective(text) {
  dom.overlayObjective.textContent = text || "";
}

function refreshStatsUi() {
  dom.statCredibility.textContent = String(state.worldState.credibility);
  dom.statHeat.textContent = String(state.worldState.heat);
  dom.statPressure.textContent = String(state.worldState.casePressure);
}

function goToNextBeat(explicitBeatId = null) {
  const scene = getCurrentScene();
  let targetIndex = -1;

  if (explicitBeatId) {
    targetIndex = scene.beats.findIndex((beat) => beat.id === explicitBeatId);
  }

  if (targetIndex < 0) {
    targetIndex = state.beatIndex + 1;
  }

  if (targetIndex < scene.beats.length) {
    enterBeat(targetIndex);
    return;
  }

  if (state.sceneIndex < state.story.scenes.length - 1) {
    setScene(state.sceneIndex + 1, 0);
    logRuntime("Scene complete. Moving to next scene.");
    return;
  }

  lockBeat();
  setObjective("All loaded scenes complete. Keep writing and apply new beats.");
  logRuntime("End of seeded scenes reached.");
}

function goToPreviousBeat() {
  const scene = getCurrentScene();
  if (state.beatIndex > 0) {
    enterBeat(state.beatIndex - 1);
    return;
  }

  if (state.sceneIndex > 0) {
    const prevSceneIndex = state.sceneIndex - 1;
    const prevScene = state.story.scenes[prevSceneIndex];
    setScene(prevSceneIndex, prevScene.beats.length - 1);
    return;
  }

  enterBeat(0);
}

function setCameraForBeat(scene, beat) {
  const preset = cameraPresets[beat.camera] || cameraPresets.wideSweep;
  state.cameraRig.preset = preset;
  state.cameraRig.fov = preset.fov;

  const focusMesh = pickFocusMesh(scene, beat);
  state.cameraRig.trackMesh = null;
  state.cameraRig.trackPlayer = false;

  if (beat.type === "action") {
    state.cameraRig.trackPlayer = true;
    state.cameraRig.focus.copy(player.position).setY(1.05);
  } else if (focusMesh) {
    state.cameraRig.trackMesh = focusMesh;
    state.cameraRig.focus.copy(focusMesh.position).setY(1.05);
  } else {
    state.cameraRig.focus.set(0, 1.05, 0);
  }

  state.cameraRig.baseLook.copy(state.cameraRig.focus);
  state.cameraRig.baseLook.add(tempVecA.fromArray(preset.look));
  state.cameraRig.look.copy(state.cameraRig.baseLook);
}

function pickFocusMesh(scene, beat) {
  if (beat.focusCharacterId && state.characterById.has(beat.focusCharacterId)) {
    return state.characterById.get(beat.focusCharacterId);
  }

  if (beat.speaker) {
    const lower = String(beat.speaker).toLowerCase();
    if (state.characterByName.has(lower)) {
      return state.characterByName.get(lower);
    }
    for (const [name, mesh] of state.characterByName.entries()) {
      if (name.includes(lower) || lower.includes(name)) {
        return mesh;
      }
    }
  }

  if (Array.isArray(scene.characters) && scene.characters.length > 0) {
    const firstId = scene.characters[0].id;
    return state.characterById.get(firstId) || null;
  }

  return null;
}

function clearBeatGroups() {
  clearGroup(groups.clues);
  clearGroup(groups.enemies);
  state.beatRuntime.enemies = [];
  state.beatRuntime.collectedThisBeat = new Set();
  renderChoices([]);
}

function buildEnvironment(sceneData, palette) {
  clearGroup(groups.env);
  clearGroup(groups.fx);
  state.rainPoints = null;

  renderer.setClearColor(palette.clear, 1);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshStandardMaterial({
      color: palette.ground,
      roughness: 0.95,
      metalness: 0.05
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  groups.env.add(ground);

  const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(11.5, 26),
    new THREE.MeshStandardMaterial({
      color: palette.lane,
      roughness: 0.82,
      metalness: 0.14
    })
  );
  lane.rotation.x = -Math.PI / 2;
  lane.position.y = -0.003;
  groups.env.add(lane);

  for (let i = 0; i < 8; i += 1) {
    const z = -12 + i * 3.4;
    const leftHeight = 2.8 + (i % 3) * 0.85;
    const rightHeight = 3.1 + ((i + 1) % 4) * 0.78;
    groups.env.add(makeBuilding(-8.8, z, leftHeight, palette));
    groups.env.add(makeBuilding(8.8, z + 0.7, rightHeight, palette));
  }

  for (let i = -3; i <= 3; i += 1) {
    const x = i * 2.6;
    const lamp = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 2.6, 10),
      new THREE.MeshStandardMaterial({
        color: 0x2f3648,
        roughness: 0.6,
        metalness: 0.7
      })
    );
    post.position.y = 1.3;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({
        color: palette.trim,
        emissive: palette.trim,
        emissiveIntensity: 0.45
      })
    );
    bulb.position.set(0, 2.62, 0);
    const glow = new THREE.PointLight(palette.trim, 0.32, 5.5, 2);
    glow.position.copy(bulb.position);
    lamp.position.set(x, 0, -4.6 + (i % 2 === 0 ? 0.3 : -0.3));
    lamp.add(post, bulb, glow);
    groups.env.add(lamp);
  }

  createRainField(palette.rain);

  keyLight.color.setHex(palette.key);
  fillLight.color.setHex(palette.fill);
  applyFog();
}

function makeBuilding(x, z, height, palette) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, height, 2.4),
    new THREE.MeshStandardMaterial({
      color: palette.building,
      roughness: 0.92,
      metalness: 0.03
    })
  );
  mesh.position.set(x, height / 2, z);
  return mesh;
}

function createRainField(colorHex) {
  const count = 740;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const idx = i * 3;
    positions[idx] = (Math.random() - 0.5) * 28;
    positions[idx + 1] = 0.6 + Math.random() * 12.8;
    positions[idx + 2] = (Math.random() - 0.5) * 28;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: colorHex,
    size: 0.07,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  groups.fx.add(points);
  state.rainPoints = points;
}

function placeCharacters(sceneData) {
  clearGroup(groups.chars);
  state.characterById.clear();
  state.characterByName.clear();

  sceneData.characters.forEach((character, index) => {
    const actor = createActorMesh(character.color || "#a8c8ff", false);
    const [x, y, z] = normalizePosition(character.position, index);
    actor.position.set(x, y, z);
    actor.userData.baseY = y;
    actor.userData.charId = character.id;
    actor.userData.charName = character.name;
    groups.chars.add(actor);
    state.characterById.set(character.id, actor);
    state.characterByName.set(String(character.name).toLowerCase(), actor);
  });
}

function normalizePosition(position, index) {
  if (!Array.isArray(position) || position.length < 3) {
    return [index * 1.8 - 1.8, 0, -2.4];
  }
  return [Number(position[0]), Number(position[1]), Number(position[2])];
}

function createActorMesh(color, isPlayer) {
  const actor = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 1.05, 12),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.42,
      metalness: 0.15
    })
  );
  body.position.y = 0.6;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xf2dfcb,
      roughness: 0.4,
      metalness: 0.02
    })
  );
  head.position.y = 1.3;
  actor.add(body, head);

  if (isPlayer) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.05, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x7ec8ff,
        emissive: 0x2f5f89,
        emissiveIntensity: 0.5,
        roughness: 0.2
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    actor.add(ring);
  }

  return actor;
}

function createClueMesh(clue, index) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({
      color: 0x89d0ff,
      emissive: 0x2f6f97,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.25
    })
  );
  const [x, y, z] = normalizePosition(clue.position, index);
  mesh.position.set(x, y + 0.34, z);
  mesh.userData.clue = clue;
  mesh.userData.floatOffset = Math.random() * Math.PI * 2;
  return mesh;
}

function createEnemyMesh(index) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.2, 9),
    new THREE.MeshStandardMaterial({
      color: 0xff7d7d,
      emissive: 0x8f3030,
      emissiveIntensity: 0.45,
      roughness: 0.45,
      metalness: 0.05
    })
  );
  mesh.position.y = 0.6;
  mesh.userData.alive = true;
  mesh.userData.phase = index * 0.6;
  mesh.userData.fade = 1;
  mesh.userData.speed = 1.4;
  mesh.userData.lastHitAt = 0;
  return mesh;
}

function freshBeatRuntime() {
  return {
    type: "direction",
    pendingBeatId: null,
    requiredClues: 0,
    collectedThisBeat: new Set(),
    actionTimer: 0,
    focus: 100,
    enemies: []
  };
}

function getCurrentScene() {
  if (!state.story || !Array.isArray(state.story.scenes)) {
    return null;
  }
  return state.story.scenes[state.sceneIndex] || null;
}

function getCurrentBeat() {
  const scene = getCurrentScene();
  if (!scene || !Array.isArray(scene.beats)) {
    return null;
  }
  return scene.beats[state.beatIndex] || null;
}

function updatePlayer(deltaSec, elapsedSec) {
  tempVecA.set(
    (state.keyState.right ? 1 : 0) - (state.keyState.left ? 1 : 0),
    0,
    (state.keyState.backward ? 1 : 0) - (state.keyState.forward ? 1 : 0)
  );

  const hasMove = tempVecA.lengthSq() > 0;
  if (hasMove) {
    tempVecA.normalize();
    const actionBoost = getCurrentBeat() && getCurrentBeat().type === "action" ? 1.15 : 0.8;
    const speed = (2.5 + actionBoost) * state.controls.pace;
    player.position.addScaledVector(tempVecA, speed * deltaSec);
    player.position.x = clamp(player.position.x, -WORLD_LIMIT, WORLD_LIMIT);
    player.position.z = clamp(player.position.z, -WORLD_LIMIT, WORLD_LIMIT);
    player.rotation.y = Math.atan2(tempVecA.x, tempVecA.z);
  }

  const bobAmp = hasMove ? 0.055 : 0.02;
  player.position.y = Math.sin(elapsedSec * (hasMove ? 8.8 : 3.5)) * bobAmp;
}

function updateCharacters(elapsedSec) {
  groups.chars.children.forEach((actor, index) => {
    const baseY = Number(actor.userData.baseY || 0);
    actor.position.y = baseY + Math.sin(elapsedSec * 1.7 + index * 1.2) * 0.02;
  });
}

function updateClues(deltaSec, elapsedSec) {
  groups.clues.children.forEach((clue) => {
    clue.rotation.y += deltaSec * 1.3;
    const offset = Number(clue.userData.floatOffset || 0);
    clue.position.y = 0.34 + Math.sin(elapsedSec * 2.5 + offset) * 0.08;
  });
}

function updateRain(deltaSec) {
  if (!state.rainPoints) {
    return;
  }

  const geometry = state.rainPoints.geometry;
  const attr = geometry.getAttribute("position");
  const array = attr.array;
  for (let i = 0; i < array.length; i += 3) {
    array[i + 1] -= (5.8 + Math.random() * 0.8) * deltaSec * state.controls.pace;
    if (array[i + 1] < 0.2) {
      array[i + 1] = 11 + Math.random() * 2.7;
    }
  }
  attr.needsUpdate = true;
}

function updateBeatSystems(deltaSec, elapsedSec) {
  const beat = getCurrentBeat();
  if (!beat) {
    return;
  }

  if (beat.type === "action" && !state.beatResolved) {
    updateActionBeat(deltaSec, elapsedSec);
  }
}

function updateActionBeat(deltaSec, elapsedSec) {
  state.beatRuntime.actionTimer -= deltaSec * state.controls.pace;

  let aliveCount = 0;
  state.beatRuntime.enemies.forEach((enemy) => {
    if (enemy.userData.alive === false) {
      enemy.userData.fade -= deltaSec * 2.2;
      enemy.material.opacity = Math.max(0, enemy.userData.fade);
      enemy.material.transparent = true;
      if (enemy.userData.fade <= 0) {
        groups.enemies.remove(enemy);
        disposeObject(enemy);
      }
      return;
    }

    aliveCount += 1;
    tempVecA.copy(player.position).sub(enemy.position);
    tempVecA.y = 0;
    const distance = tempVecA.length();
    if (distance > 0.001) {
      tempVecA.normalize();
      enemy.position.addScaledVector(tempVecA, enemy.userData.speed * deltaSec * state.controls.pace);
    }

    enemy.position.y = 0.6 + Math.sin(elapsedSec * 6 + enemy.userData.phase) * 0.05;
    enemy.lookAt(player.position.x, enemy.position.y, player.position.z);

    if (distance < 1.1 && elapsedSec - enemy.userData.lastHitAt > 0.58) {
      enemy.userData.lastHitAt = elapsedSec;
      state.beatRuntime.focus -= 8;
      if (state.beatRuntime.focus < 0) {
        state.beatRuntime.focus = 0;
      }
    }
  });

  const actionPressed = state.keyState.action && !state.prevActionPressed;
  if (actionPressed) {
    attemptActionStrike();
  }
  state.prevActionPressed = state.keyState.action;

  if (state.beatRuntime.focus <= 0) {
    state.beatRuntime.focus = 35;
    state.worldState.heat += 1;
    refreshStatsUi();
    logRuntime("You took too many hits. Heat increased.", "warn");
  }

  refreshActionObjective();

  if (aliveCount === 0 || state.beatRuntime.actionTimer <= 0) {
    state.worldState.credibility += 1;
    refreshStatsUi();
    resolveBeat("Action beat complete.");
  }
}

function attemptActionStrike() {
  let nearest = null;
  let nearestDistance = Infinity;

  state.beatRuntime.enemies.forEach((enemy) => {
    if (enemy.userData.alive === false) {
      return;
    }
    const distance = enemy.position.distanceTo(player.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = enemy;
    }
  });

  if (!nearest || nearestDistance > 2.35) {
    logRuntime("Action missed: move closer to a threat.", "warn");
    return;
  }

  nearest.userData.alive = false;
  nearest.userData.fade = 1;
  logRuntime("Threat neutralized.");
}

function updateCamera(deltaSec, elapsedSec) {
  const preset = state.cameraRig.preset || cameraPresets.wideSweep;

  if (state.cameraRig.trackPlayer) {
    tempVecA.copy(player.position).setY(1.05);
    state.cameraRig.focus.lerp(tempVecA, 1 - Math.exp(-deltaSec * 8));
    state.cameraRig.baseLook.copy(state.cameraRig.focus);
    state.cameraRig.baseLook.add(tempVecB.fromArray(preset.look));
  } else if (state.cameraRig.trackMesh) {
    tempVecA.copy(state.cameraRig.trackMesh.position).setY(1.05);
    state.cameraRig.focus.lerp(tempVecA, 1 - Math.exp(-deltaSec * 5));
    state.cameraRig.baseLook.copy(state.cameraRig.focus);
    state.cameraRig.baseLook.add(tempVecB.fromArray(preset.look));
  }

  tempVecA.copy(state.cameraRig.focus).add(tempVecB.fromArray(preset.offset));
  const motion = 0.16 * state.controls.cameraMotion;
  tempVecA.x += Math.sin(elapsedSec * 0.53) * motion;
  tempVecA.y += Math.cos(elapsedSec * 0.63) * motion * 0.7;
  tempVecA.z += Math.sin(elapsedSec * 0.41) * motion;

  const blend = 1 - Math.exp(-deltaSec * 4.6);
  camera.position.lerp(tempVecA, blend);

  tempVecC.copy(state.cameraRig.baseLook);
  tempVecC.y += Math.sin(elapsedSec * 0.35) * 0.05 * state.controls.cameraMotion;
  state.cameraRig.look.lerp(tempVecC, blend);

  camera.lookAt(state.cameraRig.look);
  camera.fov += (state.cameraRig.fov - camera.fov) * blend;
  camera.updateProjectionMatrix();
}

function applyFog() {
  world.fog.color.setHex(state.selectedPalette.fog);
  world.fog.density = clamp(state.sceneFogBase * state.controls.fog, 0.004, 0.08);
}

function animate() {
  requestAnimationFrame(animate);
  const deltaSec = Math.min(0.05, clock.getDelta());
  const elapsedSec = clock.elapsedTime;

  updatePlayer(deltaSec, elapsedSec);
  updateCharacters(elapsedSec);
  updateClues(deltaSec, elapsedSec);
  updateRain(deltaSec);
  updateBeatSystems(deltaSec, elapsedSec);
  updateCamera(deltaSec, elapsedSec);

  renderer.render(world, camera);
}

function syncStageSize() {
  const width = dom.canvas.clientWidth || dom.canvas.parentElement.clientWidth || 900;
  const height = dom.canvas.clientHeight || dom.canvas.parentElement.clientHeight || 520;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function logRuntime(message, level = "info") {
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const entry = document.createElement("div");
  entry.className = "log-line";
  if (level === "warn") {
    entry.style.color = "#ffd2a2";
  } else if (level === "error") {
    entry.style.color = "#ffb0b0";
  } else {
    entry.style.color = "#d6e7ff";
  }
  entry.textContent = `[${stamp}] ${message}`;
  dom.stageLog.prepend(entry);

  while (dom.stageLog.children.length > MAX_LOG_LINES) {
    dom.stageLog.removeChild(dom.stageLog.lastChild);
  }
}

function clearGroup(group) {
  for (let i = group.children.length - 1; i >= 0; i -= 1) {
    const child = group.children[i];
    group.remove(child);
    disposeObject(child);
  }
}

function disposeObject(object) {
  object.traverse((node) => {
    if (node.geometry) {
      node.geometry.dispose();
    }
    if (node.material) {
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material.dispose());
      } else {
        node.material.dispose();
      }
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fallbackStory() {
  return {
    projectTitle: "Fallback Noir Case",
    tone: "Seed story fallback",
    scenes: [
      {
        id: "fallback-scene-1",
        title: "Fallback Scene: Wet Concrete",
        location: "Unnamed Alley",
        palette: "cold-mercury",
        fogDensity: 0.02,
        characters: [
          {
            id: "witness-fallback",
            name: "Witness",
            role: "Witness",
            color: "#a8c8ff",
            position: [-2.4, 0, -2.2]
          }
        ],
        beats: [
          {
            id: "fallback-open",
            type: "direction",
            camera: "wideSweep",
            text: "Rain falls. Sirens stay distant. The city gives you one chance to read the room."
          },
          {
            id: "fallback-chat",
            type: "dialogue",
            camera: "interrogationClose",
            speaker: "Witness",
            text: "You hear that? Somebody is shredding evidence in a hurry.",
            choices: [
              {
                label: "Ask for details",
                response: "Top floor. Red door. No elevator."
              },
              {
                label: "Threaten",
                response: "The witness freezes. You still get the same address, but now everyone is watching.",
                heat: 1
              }
            ]
          },
          {
            id: "fallback-search",
            type: "investigation",
            camera: "shoulderLeft",
            objective: "Collect one clue to unlock the next beat.",
            requiredClues: 1,
            clues: [
              {
                id: "fallback-clue",
                label: "Damaged Keycard",
                position: [1.8, 0.34, 1.9]
              }
            ]
          },
          {
            id: "fallback-fight",
            type: "action",
            camera: "pursuit",
            objective: "Hold for ten seconds.",
            durationSec: 10,
            enemyCount: 2,
            spawnRadius: 6
          }
        ]
      }
    ]
  };
}
