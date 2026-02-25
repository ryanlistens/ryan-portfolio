import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";

const dom = {
  titleScreen: document.getElementById("title-screen"),
  tapPrompt: document.getElementById("tap-prompt"),
  startBtn: document.getElementById("start-btn"),
  typewriterScreen: document.getElementById("typewriter-screen"),
  typewriterText: document.getElementById("typewriter-text"),
  gameRoot: document.getElementById("game-root"),
  canvas: document.getElementById("game-canvas"),
  hudLocation: document.getElementById("hud-location"),
  hudTime: document.getElementById("hud-time"),
  hudMusic: document.getElementById("hud-music"),
  objectiveText: document.getElementById("objective-text"),
  interactionText: document.getElementById("interaction-text"),
  dialogueBox: document.getElementById("dialogue-box"),
  evidenceOverlay: document.getElementById("evidence-overlay"),
  evidenceTitle: document.getElementById("evidence-title"),
  evidenceText: document.getElementById("evidence-text"),
  closeEvidenceBtn: document.getElementById("close-evidence-btn"),
  joystick: document.getElementById("joystick"),
  joystickKnob: document.getElementById("joystick-knob"),
  btnA: document.getElementById("btn-a"),
  btnB: document.getElementById("btn-b")
};

const INTRO_TEXT = ["Nightclub interior.", "Little Italy.", "Summer 1979. 11:54 PM."].join("\n");

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 160);
const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  powerPreference: "high-performance"
});

const envGroup = new THREE.Group();
const charGroup = new THREE.Group();
const fxGroup = new THREE.Group();
const markerGroup = new THREE.Group();
scene.add(envGroup, charGroup, fxGroup, markerGroup);

const ambient = new THREE.AmbientLight(0x6a6075, 0.9);
const key = new THREE.DirectionalLight(0xffd2a6, 1.3);
const fill = new THREE.DirectionalLight(0x7aa7ff, 0.7);
key.position.set(8, 16, 7);
key.castShadow = true;
key.shadow.mapSize.width = 1024;
key.shadow.mapSize.height = 1024;
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 40;
key.shadow.camera.left = -15;
key.shadow.camera.right = 15;
key.shadow.camera.top = 15;
key.shadow.camera.bottom = -15;
key.shadow.bias = -0.002;
fill.position.set(-10, 12, -8);
scene.add(ambient, key, fill);

const state = {
  running: false,
  introStarted: false,
  phase: "menu",
  sceneType: "walk",
  playerCanMove: false,
  dialogueTimer: null,
  evidenceOpen: false,
  evidenceReturnCanMove: false,
  inDialogue: false,
  dialogueQueue: [],
  dialogueResolve: null,
  controls: {
    up: false, down: false, left: false, right: false,
    aQueued: false, bQueued: false, aHeld: false, bHeld: false,
    joyX: 0, joyY: 0, joyActive: false
  },
  player: {
    mesh: null, body: null,
    leftLeg: null, rightLeg: null, leftArm: null, rightArm: null,
    pos: new THREE.Vector3(7.4, 0, 6.8),
    yaw: Math.PI * 0.88,
    seated: true
  },
  dateMesh: null,
  bartenderMesh: null,
  amberManMesh: null,
  intruderMesh: null,
  womensDoorPos: new THREE.Vector3(),
  mensDoorPos: new THREE.Vector3(),
  interactions: [],
  nearestInteraction: null,
  activeBaseHint: "Move with joystick or WASD.",
  flags: new Set(),
  smoke: [],
  danceTiles: [],
  cabaretLights: [],
  animations: [],
  obstacles: [],
  music: null,
  cameraBounds: null,
  worldBounds: null,
  driving: { lane: 1, progress: 0, cars: [], buildings: [], speed: 12, target: 100 },
  cameraYaw: Math.PI * 0.88,
  cameraYawInitialized: false
};

const tempA = new THREE.Vector3();
const tempB = new THREE.Vector3();

initRendererProfile();
buildPlayerMesh();
attachInput();
syncViewport();
window.addEventListener("resize", syncViewport);

function initRendererProfile() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x09080d, 1);
  scene.fog = new THREE.FogExp2(0x0a0a10, 0.034);
}

function buildPlayerMesh() {
  const root     = new THREE.Group();
  const coat     = new THREE.MeshToonMaterial({ color: 0x1a1b20 });
  const skin     = new THREE.MeshToonMaterial({ color: 0xeed5b3 });
  const trousers = new THREE.MeshToonMaterial({ color: 0x151618 });
  const shoe     = new THREE.MeshToonMaterial({ color: 0x100e0c });
  const hatMat   = new THREE.MeshToonMaterial({ color: 0x0e0c0a });
  const eyeMat   = new THREE.MeshToonMaterial({ color: 0x111111 });
  const beltMat  = new THREE.MeshToonMaterial({ color: 0x0a0806 });
  const bandMat  = new THREE.MeshToonMaterial({ color: 0x3a2a0e });

  // Trench coat — wide hourglass silhouette
  const coatHem   = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.32, 12), coat);
  coatHem.position.y = 0.50;
  const coatWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.22, 12), coat);
  coatWaist.position.y = 0.76;
  const coatChest = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.22, 0.30, 12), coat);
  coatChest.position.y = 0.98;
  // Wide coat shoulders — dominant silhouette feature
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.11, 0.32), coat);
  shoulders.position.y = 1.15;
  // Belt
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.065, 12), beltMat);
  belt.position.y = 0.65;

  // Head — large cartoon proportion
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), skin);
  head.position.y = 1.38;
  // Eyes
  const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 8), eyeMat);
  lEye.position.set(-0.080, 1.39, 0.20);
  const rEye = lEye.clone(); rEye.position.set(0.080, 1.39, 0.20);

  // Wide-brim fedora — iconic detective silhouette
  const brim  = new THREE.Mesh(new THREE.CylinderGeometry(0.340, 0.355, 0.040, 16), hatMat);
  brim.position.y = 1.57;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.205, 0.240, 14), hatMat);
  crown.position.y = 1.70;
  const band  = new THREE.Mesh(new THREE.CylinderGeometry(0.160, 0.160, 0.048, 14), bandMat);
  band.position.y = 1.585;

  // Arms — wide coat sleeves, box-style for toon look
  const lUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.40, 0.18), coat);
  lUpperArm.position.set(-0.42, 0.92, 0);
  const rUpperArm = lUpperArm.clone(); rUpperArm.position.set(0.42, 0.92, 0);

  // Legs — hidden under coat, feet poke out below hem
  const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.32, 0.13), trousers);
  lThigh.position.set(-0.09, 0.37, 0);
  const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.11), trousers);
  lShin.position.set(0, -0.28, 0);  // in lThigh local: half_thigh(0.16) + half_shin(0.12)
  lThigh.add(lShin);
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.065, 0.22), shoe);
  lShoe.position.set(0, -0.445, 0.028);
  lThigh.add(lShoe);
  const rThigh = lThigh.clone();  // deep-clones rShin and rShoe as children
  rThigh.position.set(0.09, 0.37, 0);

  root.add(coatHem, coatWaist, coatChest, shoulders, belt);
  root.add(lThigh, rThigh);   // shins/shoes are children of thighs
  root.add(head, lEye, rEye);
  root.add(brim, crown, band);
  root.add(lUpperArm, rUpperArm);

  state.player.mesh = root;
  state.player.body = coatChest;
  state.player.leftLeg = lThigh;
  state.player.rightLeg = rThigh;
  state.player.leftShin = lShin;
  state.player.rightShin = rThigh.children[0];  // cloned rShin
  state.player.leftArm = lUpperArm;
  state.player.rightArm = rUpperArm;
  root.position.copy(state.player.pos);
  root.rotation.y = state.player.yaw;
  charGroup.add(root);
}

function attachInput() {
  const startCase = () => {
    if (state.introStarted) return;
    state.introStarted = true;
    runIntro();
  };
  bindPress(dom.titleScreen, startCase);
  bindPress(dom.startBtn, (event) => { if (event) event.stopPropagation(); startCase(); });
  bindPress(dom.closeEvidenceBtn, () => { closeEvidence(); });

  const keyMap = {
    w: "up", W: "up", ArrowUp: "up",
    s: "down", S: "down", ArrowDown: "down",
    a: "left", A: "left", ArrowLeft: "left",
    d: "right", D: "right", ArrowRight: "right",
    e: "interact", E: "interact", Enter: "interact", j: "interact", J: "interact",
    b: "action", B: "action", " ": "action", k: "action", K: "action"
  };
  window.addEventListener("keydown", (event) => {
    const action = keyMap[event.key];
    if (!action) return;
    if (action === "interact") queueButton("a", true);
    else if (action === "action") queueButton("b", true);
    else state.controls[action] = true;
    if (event.key.startsWith("Arrow") || action === "interact" || action === "action") event.preventDefault();
  });
  window.addEventListener("keyup", (event) => {
    const action = keyMap[event.key];
    if (!action) return;
    if (action === "interact") state.controls.aHeld = false;
    else if (action === "action") state.controls.bHeld = false;
    else state.controls[action] = false;
    if (event.key.startsWith("Arrow") || action === "interact" || action === "action") event.preventDefault();
  });
  bindPress(dom.btnA, () => queueButton("a", false));
  bindPress(dom.btnB, () => queueButton("b", false));
  bindPress(dom.canvas, () => {
    if (state.inDialogue) { displayNextDialogueLine(); return; }
    if (state.evidenceOpen) { closeEvidence(); return; }
    if (!state.nearestInteraction) return;
    triggerInteraction(state.nearestInteraction);
  }, 260);
  setupJoystick();
}

function bindPress(element, handler, minGapMs = 120) {
  if (!element) return;
  let last = 0;
  const wrapped = (event) => {
    if (event && event.cancelable) event.preventDefault();
    const now = performance.now();
    if (now - last < minGapMs) return;
    last = now;
    handler(event);
  };
  element.addEventListener("pointerdown", wrapped);
  element.addEventListener("touchstart", wrapped, { passive: false });
  element.addEventListener("mousedown", wrapped);
  element.addEventListener("click", wrapped);
}

function queueButton(which, hold) {
  if (which === "a") {
    if (!state.controls.aHeld || !hold) state.controls.aQueued = true;
    if (hold) state.controls.aHeld = true;
    return;
  }
  if (!state.controls.bHeld || !hold) state.controls.bQueued = true;
  if (hold) state.controls.bHeld = true;
}

function setupJoystick() {
  const pad = dom.joystick;
  const knob = dom.joystickKnob;
  if (!pad || !knob) return;
  const setKnob = (x, y) => { knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`; };
  const update = (x, y) => {
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = x - cx, dy = y - cy;
    const max = rect.width * 0.31;
    const dist = Math.hypot(dx, dy);
    if (dist > max) { const s = max / dist; dx *= s; dy *= s; }
    state.controls.joyX = dx / max;
    state.controls.joyY = dy / max;
    setKnob(dx, dy);
  };
  const clear = () => {
    state.controls.joyActive = false;
    state.controls.joyX = 0;
    state.controls.joyY = 0;
    setKnob(0, 0);
  };
  pad.addEventListener("pointerdown", (e) => {
    if (e.cancelable) e.preventDefault();
    state.controls.joyActive = true;
    update(e.clientX, e.clientY);
    try { pad.setPointerCapture(e.pointerId); } catch (_) {}
  });
  pad.addEventListener("pointermove", (e) => {
    if (!state.controls.joyActive) return;
    if (e.cancelable) e.preventDefault();
    update(e.clientX, e.clientY);
  });
  pad.addEventListener("pointerup", clear);
  pad.addEventListener("pointercancel", clear);
  pad.addEventListener("pointerleave", clear);
  pad.addEventListener("touchstart", (e) => {
    const t = e.changedTouches && e.changedTouches[0]; if (!t) return;
    if (e.cancelable) e.preventDefault();
    state.controls.joyActive = true; update(t.clientX, t.clientY);
  }, { passive: false });
  pad.addEventListener("touchmove", (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t || !state.controls.joyActive) return;
    if (e.cancelable) e.preventDefault();
    update(t.clientX, t.clientY);
  }, { passive: false });
  pad.addEventListener("touchend", (e) => { if (e.cancelable) e.preventDefault(); clear(); }, { passive: false });
  pad.addEventListener("touchcancel", (e) => { if (e.cancelable) e.preventDefault(); clear(); }, { passive: false });
}

// ─── Intro / Scene Transition ──────────────────────────────────────

async function runIntro() {
  dom.tapPrompt.textContent = "loading\u2026";
  await fadeOut(dom.titleScreen);
  startMusic(); // Music cues as the setting card appears
  await runTypewriter(INTRO_TEXT);
  dom.gameRoot.classList.remove("hidden");
  loadNightclubScene("seated");
  if (!state.running) { state.running = true; animate(); }
}

function fadeOut(element) {
  return new Promise((resolve) => {
    element.style.transition = "opacity 700ms ease";
    element.style.opacity = "0";
    window.setTimeout(() => {
      element.classList.add("hidden");
      element.style.opacity = "1";
      element.style.transition = "";
      resolve();
    }, 730);
  });
}

function runTypewriter(text) {
  dom.typewriterText.textContent = "";
  dom.typewriterScreen.classList.remove("hidden");
  return new Promise((resolve) => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      dom.typewriterText.textContent = text.slice(0, index);
      if (index >= text.length) {
        window.clearInterval(timer);
        window.setTimeout(() => { dom.typewriterScreen.classList.add("hidden"); resolve(); }, 1050);
      }
    }, 35);
  });
}

async function transitionToScene(cardText, loadFn) {
  state.playerCanMove = false;
  state.inDialogue = false;
  dom.dialogueBox.classList.add("hidden");
  dom.gameRoot.classList.add("hidden");
  await runTypewriter(cardText);
  dom.gameRoot.classList.remove("hidden");
  loadFn();
}

// ─── Music ─────────────────────────────────────────────────────────

async function startMusic() {
  if (state.music && !state.music.paused) return;
  const audio = state.music || new Audio();
  state.music = audio;
  audio.loop = true;
  audio.volume = 0.68;
  // Wider set of candidate paths to handle different deploy layouts
  const candidates = [
    "music/nightclub.mp3",
    "songs/nightclub.mp3",
    "./music/nightclub.mp3",
    "assets/music/nightclub.mp3"
  ];
  for (const src of candidates) {
    const ok = await tryAudioSource(audio, src);
    if (!ok) continue;
    try {
      await audio.play();
      return; // successfully playing
    } catch (err) {
      if (err && err.name === "NotAllowedError") {
        // Autoplay blocked — queue a one-time retry on next user gesture
        scheduleAudioUnlock(audio);
        return;
      }
    }
  }
}

function scheduleAudioUnlock(audio) {
  const unlock = () => {
    audio.play().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function tryAudioSource(audio, src) {
  return new Promise((resolve) => {
    let done = false;
    const pass = () => { if (done) return; done = true; cl(); resolve(true); };
    const fail = () => { if (done) return; done = true; cl(); resolve(false); };
    const cl = () => {
      audio.removeEventListener("canplaythrough", pass);
      audio.removeEventListener("error", fail);
    };
    audio.addEventListener("canplaythrough", pass, { once: true });
    audio.addEventListener("error", fail, { once: true });
    audio.src = src;
    audio.load();
    window.setTimeout(fail, 3500); // slightly longer timeout
  });
}

// ─── Dialogue System ───────────────────────────────────────────────

function showDialogue(text, durationMs = 2500) {
  dom.dialogueBox.textContent = text;
  dom.dialogueBox.classList.remove("hidden");
  if (state.dialogueTimer) window.clearTimeout(state.dialogueTimer);
  state.dialogueTimer = window.setTimeout(() => {
    dom.dialogueBox.classList.add("hidden");
    state.dialogueTimer = null;
  }, durationMs);
}

function showDialogueSequence(lines, onComplete) {
  state.dialogueQueue = Array.isArray(lines) ? [...lines] : [lines];
  state.inDialogue = true;
  state.dialogueResolve = onComplete || null;
  if (state.dialogueTimer) { window.clearTimeout(state.dialogueTimer); state.dialogueTimer = null; }
  displayNextDialogueLine();
}

function displayNextDialogueLine() {
  if (state.dialogueQueue.length === 0) { endDialogueSequence(); return; }
  const line = state.dialogueQueue.shift();
  if (typeof line === "object" && line.action) line.action();
  const text = typeof line === "string" ? line : line.text;
  dom.dialogueBox.textContent = text;
  dom.dialogueBox.classList.remove("hidden");
}

function endDialogueSequence() {
  state.inDialogue = false;
  dom.dialogueBox.classList.add("hidden");
  if (state.dialogueResolve) {
    const cb = state.dialogueResolve;
    state.dialogueResolve = null;
    cb();
  }
}

// ─── Scene: Nightclub ──────────────────────────────────────────────

function loadNightclubScene(startPhase) {
  resetWorld();
  state.sceneType = "walk";
  state.phase = startPhase;
  state.playerCanMove = startPhase !== "seated";
  state.player.seated = startPhase === "seated";
  state.player.pos.set(7.4, 0.5, 6.8);
  state.player.yaw = Math.PI * 0.88;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = true;
  state.flags.delete("bathroom-mirror");
  state.flags.delete("bathroom-sink");

  state.cameraBounds = { minX: -11.5, maxX: 11.5, minZ: -10.5, maxZ: 10.5, maxY: 6.0 };
  state.worldBounds = { minX: -11.2, maxX: 11.2, minZ: -10.8, maxZ: 10.8 };

  dom.hudLocation.textContent = "Nightclub";
  scene.fog = new THREE.FogExp2(0x0a0a10, 0.022);
  renderer.setClearColor(0x0c0b12, 1);

  buildNightclubGeometry();
  buildNightclubCharacters();
  registerNightclubInteractions();

  if (startPhase === "seated") {
    setObjective("Seated at your table. Press A to talk. Press B to stand.", "Move with joystick or WASD.");
  } else {
    setObjective("Rejoin your date.", "Press A near her.");
  }
}

function buildNightclubGeometry() {
  // Polished nightclub floor with slight reflectivity
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshStandardMaterial({ color: 0x140f14, roughness: 0.55, metalness: 0.15 })
  );
  floor.rotation.x = -Math.PI / 2;
  envGroup.add(floor);

  // Walls with richer material
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x17111a, roughness: 0.82, metalness: 0.05 });
  const walls = [
    new THREE.Mesh(new THREE.BoxGeometry(25, 3.6, 0.4), wallMat),
    new THREE.Mesh(new THREE.BoxGeometry(25, 3.6, 0.4), wallMat),
    new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 23), wallMat.clone()),
    new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 23), wallMat.clone())
  ];
  walls[0].position.set(0, 1.8, -11.3);
  walls[1].position.set(0, 1.8, 11.3);
  walls[2].position.set(-12.2, 1.8, 0); walls[2].material.color.setHex(0x161219);
  walls[3].position.set(12.2, 1.8, 0); walls[3].material.color.setHex(0x161219);
  walls.forEach((m) => envGroup.add(m));

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(25, 23),
    new THREE.MeshStandardMaterial({ color: 0x0e0a12, roughness: 0.95, metalness: 0.02 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3.6;
  envGroup.add(ceiling);

  // Ceiling beams
  for (let i = 0; i < 3; i++) {
    const beam = makeBox(-5 + i * 5, 3.5, 0, 0.2, 0.15, 22, 0x1a1520, 0.8);
    envGroup.add(beam);
  }

  // Baseboard trim along walls
  envGroup.add(makeBox(0, 0.08, -11.1, 25, 0.16, 0.12, 0x3a2a1e, 0.6));
  envGroup.add(makeBox(0, 0.08, 11.1, 25, 0.16, 0.12, 0x3a2a1e, 0.6));
  envGroup.add(makeBox(-12.0, 0.08, 0, 0.12, 0.16, 23, 0x3a2a1e, 0.6));
  envGroup.add(makeBox(12.0, 0.08, 0, 0.12, 0.16, 23, 0x3a2a1e, 0.6));

  // ── Wall artifacts — noir atmosphere ──
  // Neon "BAR" sign on left wall near entrance
  const neonMat = new THREE.MeshStandardMaterial({ color: 0xff2244, emissive: 0xff1133, emissiveIntensity: 1.6, roughness: 0.3 });
  const neonB = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.06), neonMat);
  neonB.position.set(-11.9, 2.2, 4.0); envGroup.add(neonB);
  const neonBarLight = new THREE.PointLight(0xff2244, 0.5, 4, 2);
  neonBarLight.position.set(-11.5, 2.2, 4.0); fxGroup.add(neonBarLight);
  state.animations.push((dt, t) => { neonBarLight.intensity = 0.4 + Math.sin(t * 5.3) * 0.14; return true; });
  // Framed "WANTED" style poster on back wall (z=-11)
  envGroup.add(makeBox(6.5, 1.9, -11.1, 0.9, 1.3, 0.06, 0x3a2c1a, 0.6));        // outer frame
  envGroup.add(makeBox(6.5, 1.9, -11.08, 0.74, 1.1, 0.04, 0xe8dcc0, 0.9));       // paper
  envGroup.add(makeBox(6.5, 2.12, -11.07, 0.58, 0.08, 0.03, 0x2a1a08, 0.7));     // "WANTED" text bar
  envGroup.add(makeBox(6.5, 1.88, -11.07, 0.44, 0.42, 0.03, 0xb0a898, 0.7));     // face silhouette
  envGroup.add(makeBox(6.5, 1.6,  -11.07, 0.56, 0.12, 0.03, 0x3a2a18, 0.7));     // fine print
  // Small framed photo cluster — back wall left
  [-2.0, -0.8, 0.4].forEach((px, i) => {
    envGroup.add(makeBox(px, 2.1 + (i % 2) * 0.18, -11.1, 0.46, 0.36, 0.05, 0x1a1410, 0.7)); // frame
    envGroup.add(makeBox(px, 2.1 + (i % 2) * 0.18, -11.08, 0.36, 0.28, 0.03, 0x8a9aaa, 0.5)); // photo
  });
  // Vintage poster on right wall — dining side
  envGroup.add(makeBox(12.0, 2.2, -6.0, 0.06, 1.4, 1.0, 0x2a1a08, 0.7));    // frame
  envGroup.add(makeBox(12.0, 2.2, -6.0, 0.04, 1.2, 0.85, 0xd4b870, 0.5));   // warm paper
  envGroup.add(makeBox(12.0, 2.5, -6.0, 0.03, 0.12, 0.7, 0x3a1a0a, 0.7));   // title band
  envGroup.add(makeBox(12.0, 2.1, -6.0, 0.03, 0.55, 0.65, 0x6a4a28, 0.6));  // illustration block
  // "LIVE TONIGHT" neon-style text strip above stage
  const liveMat = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffbb00, emissiveIntensity: 1.4 });
  const liveSign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.32, 0.06), liveMat);
  liveSign.position.set(-8.6, 3.38, -11.0); envGroup.add(liveSign);
  const liveLight = new THREE.PointLight(0xffdd44, 0.45, 5, 2);
  liveLight.position.set(-8.6, 3.2, -10.6); fxGroup.add(liveLight);
  state.animations.push((dt, t) => { liveLight.intensity = 0.38 + Math.sin(t * 4.8) * 0.10; return true; });

  // ── Wainscoting — dark wood paneling, lower ~1m of walls ──
  envGroup.add(makeBox(0, 0.5, -11.05, 24.2, 1.0, 0.07, 0x251205, 0.75));   // back wall panel
  envGroup.add(makeBox(0, 1.02, -11.05, 24.2, 0.05, 0.09, 0x4a2c12, 0.35)); // back wall cap rail
  envGroup.add(makeBox(11.95, 0.5, 0, 0.07, 1.0, 22.4, 0x251205, 0.75));    // right wall panel
  envGroup.add(makeBox(11.95, 1.02, 0, 0.09, 0.05, 22.4, 0x4a2c12, 0.35));  // right wall cap rail
  envGroup.add(makeBox(0, 0.5, 11.05, 24.2, 1.0, 0.07, 0x251205, 0.75));    // front wall panel
  envGroup.add(makeBox(0, 1.02, 11.05, 24.2, 0.05, 0.09, 0x4a2c12, 0.35));  // front wall cap rail

  // ── Wall sconces — warm amber brass fixtures ──
  const sconceMat = new THREE.MeshStandardMaterial({ color: 0x8a6028, metalness: 0.58, roughness: 0.38 });
  const sconceGlowMat = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffcc44, emissiveIntensity: 0.95 });
  // Back wall sconces (z=-11.3), 3 fixtures
  [-5.5, 0.5, 6.0].forEach((sx, si) => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.07), sconceMat);
    plate.position.set(sx, 2.04, -11.06); envGroup.add(plate);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 6), sconceMat);
    arm.rotation.x = Math.PI / 2; arm.position.set(sx, 2.08, -10.9); envGroup.add(arm);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.09, 0.13, 8), sconceMat);
    shade.position.set(sx, 2.05, -10.78); envGroup.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), sconceGlowMat);
    bulb.position.set(sx, 1.99, -10.78); envGroup.add(bulb);
    const sconceLight = new THREE.PointLight(0xffbb66, 0.44, 6.0, 2);
    sconceLight.position.set(sx, 1.95, -10.5); fxGroup.add(sconceLight);
    state.animations.push((dt, t) => { sconceLight.intensity = 0.40 + Math.sin(t * 5.8 + si * 2.1) * 0.06; return true; });
  });
  // Right wall sconces (x=12.2), 3 fixtures — dining/booth side
  [-4.2, 0.3, 5.0].forEach((sz, si) => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.22), sconceMat);
    plate.position.set(11.95, 2.04, sz); envGroup.add(plate);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.09, 0.13, 8), sconceMat);
    shade.rotation.z = Math.PI / 2; shade.position.set(11.77, 2.05, sz); envGroup.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), sconceGlowMat);
    bulb.position.set(11.77, 1.99, sz); envGroup.add(bulb);
    const sconceLight = new THREE.PointLight(0xffbb66, 0.40, 5.5, 2);
    sconceLight.position.set(11.55, 1.94, sz); fxGroup.add(sconceLight);
    state.animations.push((dt, t) => { sconceLight.intensity = 0.36 + Math.sin(t * 6.2 + si * 1.8) * 0.05; return true; });
  });
  // Left wall sconces (x=-12.2), 2 fixtures near bar and stage
  [-2.5, -7.5].forEach((sz, si) => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.22), sconceMat);
    plate.position.set(-11.95, 2.04, sz); envGroup.add(plate);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.09, 0.13, 8), sconceMat);
    shade.rotation.z = -Math.PI / 2; shade.position.set(-11.77, 2.05, sz); envGroup.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), sconceGlowMat);
    bulb.position.set(-11.77, 1.99, sz); envGroup.add(bulb);
    const sconceLight = new THREE.PointLight(0xffbb66, 0.34, 5.0, 2);
    sconceLight.position.set(-11.55, 1.94, sz); fxGroup.add(sconceLight);
    state.animations.push((dt, t) => { sconceLight.intensity = 0.30 + Math.sin(t * 5.4 + si * 2.4) * 0.05; return true; });
  });

  // ── Banquette booth seating along right wall (dining platform side) ──
  // Deep crimson velvet bench: seat at x≈11.3, back panel against right wall
  envGroup.add(makeBox(11.35, 0.63, 0.3, 1.1, 0.14, 13.4, 0x7a1618, 0.86));   // seat cushion
  envGroup.add(makeBox(11.78, 1.05, 0.3, 0.36, 0.9, 13.4, 0x5e1215, 0.88));   // seat back
  envGroup.add(makeBox(10.81, 0.63, 0.3, 0.06, 0.16, 13.4, 0x5a1018, 0.9));   // front trim edge
  // Armrest dividers partitioning the bench into 6 booth sections
  [-5.75, -3.35, -0.95, 1.45, 3.85, 6.25].forEach((az) => {
    envGroup.add(makeBox(11.55, 0.82, az, 0.64, 0.44, 0.07, 0x4a0c10, 0.8));
  });

  envGroup.add(makeBox(-6.6, 0.04, -6.2, 8.8, 0.08, 8.8, 0x180f18, 0.36));
  buildDanceFloor(-9.9, -9.5);

  envGroup.add(makeBox(-9.0, 0.35, -10.1, 5.4, 0.7, 4.3, 0x23232b, 0.26));
  envGroup.add(makeBox(-11.2, 1.1, -9.4, 1.2, 2.2, 1.1, 0x12151c, 0.22));
  envGroup.add(makeBox(-6.9, 1.1, -9.4, 1.2, 2.2, 1.1, 0x12151c, 0.22));

  envGroup.add(makeBox(5.1, 0.24, 0.2, 9.7, 0.48, 15.4, 0x1e1820, 0.12));
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 14.8),
    new THREE.MeshStandardMaterial({ color: 0x6d0f18, roughness: 0.88 })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(5.1, 0.5, 0.2);
  envGroup.add(carpet);

  // Step up to dining platform — two risers at the left edge (x≈0.6)
  // Bottom riser (half-step): y=0.25 center, height 0.5, width 0.4, spans full platform z
  envGroup.add(makeBox(0.6, 0.15, 0.2, 0.45, 0.30, 14.6, 0x1c1820, 0.15));
  // Top riser flush with platform: capped by carpet
  envGroup.add(makeBox(1.0, 0.30, 0.2, 0.45, 0.60, 14.6, 0x1e1820, 0.12));
  // Lip/nosing trim on step edge (decorative brass edge)
  envGroup.add(makeBox(0.62, 0.305, 0.2, 0.04, 0.02, 14.6, 0xb89040, 0.2));
  // Stage steps — single broad step up from dance floor to bandstand (left side)
  envGroup.add(makeBox(-5.8, 0.35, -10.1, 1.8, 0.70, 4.2, 0x23232b, 0.28));
  envGroup.add(makeBox(-5.1, 0.175, -10.1, 0.5, 0.35, 4.2, 0x1e1e26, 0.3));

  // All tables sit on the raised dining platform (baseY = 0.5)
  buildTableSet(4.2, -4.6, false, 0.5);
  buildTableSet(6.7, -1.3, false, 0.5);
  buildTableSet(4.1, 2.0, false, 0.5);
  buildTableSet(7.6, 5.3, true, 0.5);

  // Bar counter with polished top
  envGroup.add(makeBox(-8.6, 0.72, 8.1, 4.7, 1.44, 1.6, 0x4f311f, 0.22));
  const barTop = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.08, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.18, metalness: 0.25 })
  );
  barTop.position.set(-8.6, 1.46, 8.1);
  envGroup.add(barTop);
  // Bar back shelving
  envGroup.add(makeBox(-8.6, 1.7, 9.4, 3.6, 1.1, 0.6, 0x2e231e, 0.3));
  envGroup.add(makeBox(-8.6, 2.3, 9.4, 3.8, 0.06, 0.55, 0x3a2a1e, 0.4));
  envGroup.add(makeBox(-8.6, 1.15, 9.4, 3.8, 0.06, 0.55, 0x3a2a1e, 0.4));
  // Bar under-counter light strip
  const barGlow = new THREE.PointLight(0xffaa44, 0.25, 4, 2);
  barGlow.position.set(-8.6, 0.15, 7.2);
  fxGroup.add(barGlow);

  const womensDoor = makeDoor(0.9, -10.9, 0xb22543);
  const mensDoor = makeDoor(-3.1, -10.9, 0x9d7a23);
  envGroup.add(womensDoor, mensDoor);
  state.womensDoorPos.copy(womensDoor.position).setY(0);
  state.mensDoorPos.copy(mensDoor.position).setY(0);

  envGroup.add(makeDoor(0.0, 10.9, 0x272029));

  // Disco ball - higher detail with faceted appearance
  const discoBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 24, 20),
    new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.04, metalness: 0.96 })
  );
  discoBall.position.set(-6.6, 3.4, -6.2);
  envGroup.add(discoBall);
  // Mirror facets on disco ball
  const facetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0.98 });
  for (let i = 0; i < 20; i++) {
    const facet = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), facetMat);
    const phi = Math.acos(1 - 2 * (i + 0.5) / 20);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    facet.position.set(
      0.61 * Math.sin(phi) * Math.cos(theta),
      0.61 * Math.cos(phi),
      0.61 * Math.sin(phi) * Math.sin(theta)
    );
    facet.lookAt(facet.position.clone().multiplyScalar(2));
    discoBall.add(facet);
  }
  const discoLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5 })
  );
  discoLine.position.set(-6.6, 4.2, -6.2);
  envGroup.add(discoLine);
  // Disco spotlight that casts rotating light patterns
  const discoSpot = new THREE.PointLight(0xffffff, 0.6, 12, 2);
  discoSpot.position.set(-6.6, 3.3, -6.2);
  fxGroup.add(discoSpot);
  state.animations.push((dt, t) => {
    discoBall.rotation.y += dt * 0.5;
    // Shimmer the disco spotlight color
    const r = 0.5 + 0.5 * Math.sin(t * 3.0);
    const g = 0.5 + 0.5 * Math.sin(t * 3.0 + 2.1);
    const b = 0.5 + 0.5 * Math.sin(t * 3.0 + 4.2);
    discoSpot.color.setRGB(r, g, b);
    discoSpot.intensity = 0.4 + Math.sin(t * 5) * 0.2;
    return true;
  });

  // Bar stools — 3 stools aligned with the 3 patrons (counter face at z=7.3)
  const stoolXs = [-10.0, -8.1, -6.8];  // match barPatronCfgs x positions exactly
  stoolXs.forEach((sx) => {
    // Stool seat
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.06, 10),
      new THREE.MeshStandardMaterial({ color: 0x6a1a1a, roughness: 0.5 }));
    stool.position.set(sx, 0.96, 6.8);
    envGroup.add(stool);
    // Stool leg (chrome)
    const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.94, 6),
      new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6, roughness: 0.2 }));
    stoolLeg.position.set(sx, 0.50, 6.8);
    envGroup.add(stoolLeg);
    // Footrest ring
    const footRest = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }));
    footRest.position.set(sx, 0.36, 6.8); footRest.rotation.x = Math.PI / 2;
    envGroup.add(footRest);
  });

  for (let i = 0; i < 8; i++) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2 + Math.random() * 0.12, 6),
      new THREE.MeshStandardMaterial({ color: [0x2a5a1a, 0x5a2a1a, 0x1a2a5a, 0x8a6a2a][i % 4], roughness: 0.15, metalness: 0.1 }));
    bottle.position.set(-9.4 + i * 0.45, 2.35, 9.3);
    envGroup.add(bottle);
  }

  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }));
  mic.position.set(-8.4, 1.0, -9.6);
  envGroup.add(mic);
  const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 }));
  micHead.position.set(-8.4, 1.68, -9.6);
  envGroup.add(micHead);

  addCabaretLights();
  addSmoke();

  state.obstacles = [
    makeObstacle(-10.5, -7.0, -11.2, -8.5),
    makeObstacle(-10.5, -6.5, 7.0, 9.5),
    makeObstacle(3.4, 5.0, -5.4, -3.8),
    makeObstacle(5.9, 7.5, -2.1, -0.5),
    makeObstacle(3.3, 4.9, 1.2, 2.8),
    makeObstacle(6.8, 8.4, 4.5, 6.1)
  ];
}

function buildDanceFloor(startX, startZ) {
  const colors = [0xff2f2f, 0x2f6eff, 0xffe14b, 0xff40cc, 0x40ffaa, 0xffffff];
  state.danceTiles = [];
  for (let x = 0; x < 4; x += 1) {
    for (let z = 0; z < 4; z += 1) {
      const color = colors[(x * 3 + z) % colors.length];
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.78, 0.08, 1.78),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.34, roughness: 0.15, metalness: 0.25 })
      );
      tile.position.set(startX + x * 1.8, 0.08, startZ + z * 1.8);
      envGroup.add(tile);
      // Thin border between tiles
      const border = new THREE.Mesh(
        new THREE.BoxGeometry(1.82, 0.09, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 })
      );
      border.position.set(startX + x * 1.8, 0.07, startZ + z * 1.8 - 0.9);
      envGroup.add(border);
      state.danceTiles.push({ mesh: tile, phase: Math.random() * Math.PI * 2, baseColor: color });
    }
  }
  // Under-floor glow light
  const danceGlow = new THREE.PointLight(0xff88cc, 0.5, 8, 2);
  danceGlow.position.set(startX + 3.6, 0.3, startZ + 3.6);
  fxGroup.add(danceGlow);
  state.animations.push((dt, t) => {
    danceGlow.intensity = 0.3 + Math.sin(t * 2.0) * 0.25;
    return true;
  });
}

function buildTableSet(x, z, playerTable = false, baseY = 0) {
  // b = helper so every y coordinate accounts for the floor level
  const b = (y) => y + baseY;

  const cloth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.8, 0.66, 14),
    new THREE.MeshStandardMaterial({ color: 0x9f1f2d, roughness: 0.86 })
  );
  cloth.position.set(x, b(0.35), z);
  envGroup.add(cloth);
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 0.05, 14),
    new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.5, metalness: 0.25 })
  );
  top.position.set(x, b(0.71), z);
  envGroup.add(top);

  // Cocktail candle in glass holder
  const candleHolder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.055, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.55 })
  );
  candleHolder.position.set(x + 0.1, b(0.78), z + 0.06);
  envGroup.add(candleHolder);
  const candle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8),
    new THREE.MeshStandardMaterial({ color: 0xf3ead7, roughness: 0.44 })
  );
  candle.position.set(x + 0.1, b(0.84), z + 0.06);
  envGroup.add(candle);
  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff6600, emissiveIntensity: 1.2, roughness: 0.3 })
  );
  flame.position.set(x + 0.1, b(0.93), z + 0.06);
  envGroup.add(flame);
  const candleLight = new THREE.PointLight(0xffb86f, 0.38, 3.2, 2);
  candleLight.position.set(x + 0.1, b(1.0), z + 0.06);
  fxGroup.add(candleLight);
  state.animations.push((dt, t) => { candleLight.intensity = 0.28 + Math.sin(t * 7.3 + x) * 0.12; return true; });

  // Ashtray with cigarette
  const ashtray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.04, 10),
    new THREE.MeshStandardMaterial({ color: 0x7c8795, roughness: 0.3, metalness: 0.5 })
  );
  ashtray.position.set(x - 0.22, b(0.745), z - 0.1);
  envGroup.add(ashtray);
  if (!playerTable) {
    const butts = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.09, 5),
      new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6 }));
    butts.rotation.z = 1.1; butts.position.set(x - 0.21, b(0.756), z - 0.09);
    envGroup.add(butts);
  }
  const matchbook = makeBox(x - 0.06, b(0.758), z - 0.24, 0.08, 0.03, 0.055, 0xc83828, 0.5);
  envGroup.add(matchbook);

  if (!playerTable) {
    // Two cocktail glasses with different drinks
    const drinkColors = [0xcc5a12, 0x3a6a9a];
    const drinkOffsets = [[0.3, -0.14], [-0.24, 0.22]];
    drinkOffsets.forEach(([dx, dz], i) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6),
        new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.1, metalness: 0.2 }));
      stem.position.set(x + dx, b(0.80), z + dz);
      envGroup.add(stem);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.01, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: drinkColors[i % 2], roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.82 }));
      bowl.position.set(x + dx, b(0.875), z + dz);
      envGroup.add(bowl);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 8),
        new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.1, metalness: 0.2 }));
      base.position.set(x + dx, b(0.737), z + dz);
      envGroup.add(base);
    });
  }

  // Chairs — placed on opposite sides, at table surface level
  if (!playerTable) {
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.75 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x6a2820, roughness: 0.8 });
    [[-0.88, 0], [0.88, 0]].forEach(([dx, dz], i) => {
      const cx = x + dx, cz = z + dz;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.38), seatMat);
      seat.position.set(cx, b(0.46), cz);
      envGroup.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.50, 0.04), chairMat);
      back.position.set(cx, b(0.73), cz + (i === 0 ? -0.19 : 0.19));
      envGroup.add(back);
      [-0.16, 0.16].forEach((lx) => {
        [-0.16, 0.16].forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 5), chairMat);
          leg.position.set(cx + lx, b(0.22), cz + lz);
          envGroup.add(leg);
        });
      });
    });
  }
}

function buildNightclubCharacters() {
  // ── Singer (shirtless Black man, tight flared white pants, gold chain) ──
  const singerSkin = 0x2c1a0e;
  const singer = makePerson(singerSkin, 0xe8e4dc, false); // white flared pants; will add skin torso overlay
  singer.position.set(-8.4, 0.70, -9.8);
  singer.scale.set(1.06, 1.1, 1.06);
  // Gold chain necklace
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.010, 5, 16),
    new THREE.MeshStandardMaterial({ color: 0xd4a020, metalness: 0.88, roughness: 0.14, emissive: 0x553800, emissiveIntensity: 0.4 }));
  chain.position.set(0, 0.93, 0.06); chain.rotation.x = Math.PI / 2 - 0.25;
  singer.add(chain);
  // Tight white flared pants (replace pants material appearance via overlay)
  const pantFlareL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.10, 0.24, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d8, roughness: 0.55 }));
  pantFlareL.position.set(-0.08, 0.17, 0);
  const pantFlareR = pantFlareL.clone(); pantFlareR.position.set(0.08, 0.17, 0);
  singer.add(pantFlareL, pantFlareR);
  // Belt buckle
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xd4a020, metalness: 0.9, roughness: 0.1 }));
  buckle.position.set(0, 0.47, 0.19);
  singer.add(buckle);
  // Bare-chest skin overlays (shirtless look over the white outfit base)
  const chestSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.145, 0.30, 10),
    new THREE.MeshStandardMaterial({ color: singerSkin, roughness: 0.42 }));
  chestSkin.position.set(0, 0.76, 0);
  const abSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.145, 0.17, 10),
    new THREE.MeshStandardMaterial({ color: singerSkin, roughness: 0.42 }));
  abSkin.position.set(0, 0.56, 0);
  singer.add(chestSkin, abSkin);
  charGroup.add(singer);
  state.animations.push((dt, t) => {
    singer.position.y = 0.70 + Math.abs(Math.sin(t * 5.8)) * 0.12;
    singer.rotation.y = Math.sin(t * 2.6) * 0.5;
    singer.rotation.z = Math.sin(t * 5.8) * 0.07;
    // Arms pump on the beat
    if (singer.userData.leftArm)  singer.userData.leftArm.rotation.z  = 0.10 + Math.sin(t * 5.8) * 0.55;
    if (singer.userData.rightArm) singer.userData.rightArm.rotation.z = -0.10 - Math.sin(t * 5.8 + Math.PI) * 0.45;
    // Head tilts and nods expressively
    if (singer.userData.head) {
      singer.userData.head.rotation.x = Math.sin(t * 5.8) * 0.12;
      singer.userData.head.rotation.y = Math.sin(t * 2.6 + 0.5) * 0.18;
    }
    return true;
  });

  // ── Drummer with drum kit ──
  const drummer = makePerson(0x8a5a30, 0x1c1c22, false);
  drummer.position.set(-10.2, 0.70, -11.0);
  drummer.rotation.y = 0.3;
  charGroup.add(drummer);
  // Drum kit geometry — all y positions raised by 0.70 to sit on stage surface
  const drumBase = makeBox(-10.2, 0.98, -10.5, 1.2, 0.55, 0.9, 0x8a1a22, 0.3);
  envGroup.add(drumBase);
  const snare = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0xd0c8b8, roughness: 0.4, metalness: 0.3 }));
  snare.position.set(-10.0, 1.34, -10.3); envGroup.add(snare);
  const hihat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10),
    new THREE.MeshStandardMaterial({ color: 0xd4b040, metalness: 0.7, roughness: 0.2 }));
  hihat.position.set(-9.7, 1.50, -10.4); envGroup.add(hihat);
  const cymbalStand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.78, 5),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }));
  cymbalStand.position.set(-9.7, 1.12, -10.4); envGroup.add(cymbalStand);
  // Drumming animation
  state.animations.push((dt, t) => {
    const beat = Math.sin(t * 7.2);
    drummer.rotation.z = beat * 0.06;
    return true;
  });

  // ── DJ Booth — all y positions raised by 0.70 to sit on stage surface ──
  const djBoothBase = makeBox(-7.2, 1.20, -10.5, 2.0, 1.0, 0.8, 0x1a1520, 0.4);
  envGroup.add(djBoothBase);
  const djBooth = makeBox(-7.2, 1.76, -10.5, 2.0, 0.1, 0.8, 0x2a2030, 0.25);
  envGroup.add(djBooth);
  // Turntable platters
  [[-7.6], [-6.8]].forEach(([tx]) => {
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 18),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.3 }));
    platter.position.set(tx, 1.84, -10.5); envGroup.add(platter);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.045, 10),
      new THREE.MeshStandardMaterial({ color: 0xcc3030, roughness: 0.5 }));
    label.position.set(tx, 1.865, -10.5); envGroup.add(label);
    state.animations.push((dt, t) => { platter.rotation.y += dt * 3.5; return true; });
  });
  // Mixer
  const mixer = makeBox(-7.2, 1.84, -10.5, 0.3, 0.07, 0.22, 0x222222, 0.4);
  envGroup.add(mixer);
  // DJ glow
  const djGlow = new THREE.PointLight(0x8844ff, 0.5, 4, 2);
  djGlow.position.set(-7.2, 2.20, -10.2); fxGroup.add(djGlow);
  state.animations.push((dt, t) => { djGlow.intensity = 0.3 + Math.sin(t * 4.1) * 0.22; return true; });
  // DJ character
  const dj = makePerson(0xf0d0a8, 0x0a0a14, false);
  dj.position.set(-7.2, 0.70, -9.8);
  dj.rotation.y = Math.PI;
  // Headphones
  const hpBar = makeBox(0, 1.18, 0, 0.32, 0.04, 0.04, 0x222222, 0.3);
  dj.add(hpBar);
  const hpL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 }));
  hpL.position.set(-0.16, 1.1, 0.06); dj.add(hpL);
  const hpR = hpL.clone(); hpR.position.set(0.16, 1.1, 0.06); dj.add(hpR);
  charGroup.add(dj);
  state.animations.push((dt, t) => {
    dj.rotation.y = Math.PI + Math.sin(t * 1.2) * 0.3;
    return true;
  });

  // ── Area fill lights for character visibility ──
  // Stage spotlight — warm key light for band area
  const stageKey = new THREE.PointLight(0xffcc88, 1.2, 10, 2);
  stageKey.position.set(-8.6, 3.5, -10.0); fxGroup.add(stageKey);
  state.animations.push((dt, t) => { stageKey.intensity = 1.0 + Math.sin(t * 1.8) * 0.18; return true; });
  // Dance floor warm fill
  const danceKey = new THREE.PointLight(0xff9966, 0.9, 12, 2);
  danceKey.position.set(-8.8, 2.8, -7.5); fxGroup.add(danceKey);
  state.animations.push((dt, t) => { danceKey.intensity = 0.8 + Math.sin(t * 2.5 + 1) * 0.15; return true; });
  // Dining platform warm fill
  const diningFill = new THREE.PointLight(0xffd8a0, 0.7, 12, 2);
  diningFill.position.set(5.5, 3.0, 0.0); fxGroup.add(diningFill);

  // ── Dancers on dance floor ──
  const dancerConfigs = [
    { x: -9.9, z: -9.5, skin: 0xf2c89a, dress: 0xff3388 },
    { x: -8.1, z: -9.5, skin: 0x4a2810, dress: 0xffaa00 },
    { x: -9.0, z: -7.7, skin: 0xe8d0a8, dress: 0x4488ff },
    { x: -7.2, z: -7.7, skin: 0x7a4a28, dress: 0xcc44aa }
  ];
  const heightVariants = [0.92, 1.0, 0.88, 1.06, 0.96, 1.03, 0.90, 1.08];
  dancerConfigs.forEach((dc, i) => {
    const dancer = makePerson(dc.skin, dc.dress, i % 2 === 0);
    dancer.position.set(dc.x, 0, dc.z);
    dancer.scale.setScalar(heightVariants[i % heightVariants.length]);
    charGroup.add(dancer);
    state.animations.push((dt, t) => {
      if (state.phase === "scream" || state.phase === "aftermath") return false;
      const phase = t * 5.4 + i * 1.57;
      dancer.position.y = Math.abs(Math.sin(phase)) * 0.1;
      dancer.rotation.y = t * (i % 2 === 0 ? 1.1 : -0.9);
      dancer.rotation.z = Math.sin(phase * 0.5) * 0.08;
      return true;
    });
  });

  // ── Seated couples at tables (tables at 4.2/-4.6, 6.7/-1.3, 4.1/2.0) ──
  const tableSeats = [
    { tx: 4.2, tz: -4.6, wDress: 0xeb4d9c, wSkin: 0xf1d7b8, mSuit: 0x1a2b40, mShirt: 0xe8a050, mSkin: 0xecd2b0 },
    { tx: 6.7, tz: -1.3, wDress: 0x45a8d3, wSkin: 0xc8906a, mSuit: 0x3a1a4a, mShirt: 0x60cc88, mSkin: 0x8a5030 },
    { tx: 4.1, tz: 2.0,  wDress: 0xbc4fd1, wSkin: 0xf0c8a0, mSuit: 0x2a3a18, mShirt: 0xd44030, mSkin: 0xecd0a8 }
  ];
  tableSeats.forEach((cfg, idx) => {
    // Woman on left side of table, man on right — y=0.5 (on dining platform)
    const woman = makePerson(cfg.wSkin, cfg.wDress, true);
    woman.position.set(cfg.tx - 0.85, 0.5, cfg.tz);
    woman.rotation.y = Math.PI / 2; // facing right (toward man)
    woman.scale.setScalar(0.88 + idx * 0.06);  // slight height variety
    // Leisure suit man with open-chest shirt detail
    const man = makePerson(cfg.mSkin, cfg.mSuit, false);
    man.position.set(cfg.tx + 0.85, 0.5, cfg.tz);
    man.rotation.y = -Math.PI / 2; // facing left (toward woman)
    man.scale.setScalar(0.95 + idx * 0.05);
    // Wide lapels
    const lapelMat = new THREE.MeshStandardMaterial({ color: darkenColor(cfg.mSuit, 0.78), roughness: 0.55 });
    const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.22, 0.04), lapelMat);
    lapelL.position.set(-0.1, 0.82, 0.19); lapelL.rotation.z = 0.28;
    const lapelR = lapelL.clone(); lapelR.position.set(0.1, 0.82, 0.19); lapelR.rotation.z = -0.28;
    const shirtStripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.20, 0.035),
      new THREE.MeshStandardMaterial({ color: cfg.mShirt, roughness: 0.5 }));
    shirtStripe.position.set(0, 0.81, 0.21);
    // Big collar wings
    const colL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.055, 0.03),
      new THREE.MeshStandardMaterial({ color: cfg.mShirt, roughness: 0.5 }));
    colL.position.set(-0.13, 0.97, 0.19); colL.rotation.z = -0.42;
    const colR = colL.clone(); colR.position.set(0.13, 0.97, 0.19); colR.rotation.z = 0.42;
    man.add(lapelL, lapelR, shirtStripe, colL, colR);
    addCigarette(man, 0.3, 0.65, 0.13);
    charGroup.add(woman, man);

    // Animated: nodding, laughing, leaning — phase-offset per couple
    state.animations.push((dt, t) => {
      const ph = t * 1.6 + idx * 2.1;
      // Bodies stay mostly facing each other with slight lean-in
      woman.rotation.x = Math.sin(ph * 0.7) * 0.06;
      woman.rotation.y = Math.PI / 2 + Math.sin(ph * 0.38) * 0.14;
      man.rotation.x = Math.sin(ph * 0.5 + 1) * 0.055;
      man.rotation.y = -Math.PI / 2 + Math.sin(ph * 0.33 + 0.8) * 0.16;
      // Head: independent glances and nods — more lifelike than whole-body rotation
      if (woman.userData.head) {
        woman.userData.head.rotation.y = Math.sin(ph * 0.55) * 0.26;
        woman.userData.head.rotation.x = Math.sin(ph * 0.9) * 0.10;
      }
      if (man.userData.head) {
        man.userData.head.rotation.y = Math.sin(ph * 0.48 + 1.2) * 0.22;
        man.userData.head.rotation.x = Math.sin(ph * 0.78 + 0.5) * 0.08;
      }
      // Man occasionally raises right arm — gesturing while talking
      const gesture = Math.max(0, Math.sin(ph * 0.35 + 2.0));
      if (man.userData.rightArm) man.userData.rightArm.rotation.z = -0.10 - gesture * 0.38;
      // Bob to the music (base y=0.5 for dining platform)
      woman.position.y = 0.5 + Math.sin(t * 2.8 + idx) * 0.018;
      man.position.y = 0.5 + Math.sin(t * 2.6 + idx + 1.2) * 0.015;
      return true;
    });
  });

  // ── Date (seated at player table) ──
  const date = makePerson(0xf2d8bc, 0xec4b94, true);
  date.position.set(6.9, 0.5, 7.2);
  date.rotation.y = -Math.PI / 2;
  charGroup.add(date);
  state.dateMesh = date;
  // Date animation: alive and present — glances at player, sways to music, raises drink
  state.animations.push((dt, t) => {
    // Gentle seated sway with glances toward player side
    date.rotation.y = -Math.PI / 2 + Math.sin(t * 0.48) * 0.28;
    date.rotation.x = Math.sin(t * 0.72) * 0.045;
    date.position.y = 0.5 + Math.sin(t * 2.5) * 0.014;
    // Head: thoughtful tilt and slow look-around
    if (date.userData.head) {
      date.userData.head.rotation.y = Math.sin(t * 0.55) * 0.22;
      date.userData.head.rotation.x = Math.sin(t * 0.38 + 1.0) * 0.08;
    }
    // Right arm occasionally raises — sipping her drink
    const drinkLift = Math.max(0, Math.sin(t * 0.55 + 0.8));
    if (date.userData.rightArm) date.userData.rightArm.rotation.z = -0.10 - drinkLift * 0.55;
    return true;
  });

  // ── Bartender (standing behind bar) ── positioned between counter (z≈8.9) and back shelving (z≈9.4)
  const bartender = makePerson(0xf0d8b8, 0x191c24, false);
  bartender.position.set(-8.5, 0, 8.5);
  bartender.rotation.y = Math.PI;
  charGroup.add(bartender);
  state.bartenderMesh = bartender;
  state.animations.push((dt, t) => {
    // Bartender polishes glasses and leans, checks the room
    bartender.rotation.y = Math.PI + Math.sin(t * 0.7) * 0.45;
    bartender.rotation.x = Math.sin(t * 1.1) * 0.04;
    if (bartender.userData.rightArm) bartender.userData.rightArm.rotation.z = -0.10 + Math.sin(t * 2.2) * 0.45; // polishing motion
    return true;
  });

  // ── Bar patrons (3 people on stools, nursing drinks) ──
  const barPatronCfgs = [
    { x: -10.0, skin: 0xf0c890, outfit: 0x2a1a0a, female: false },
    { x:  -8.1, skin: 0xd0906a, outfit: 0x1a2a3a, female: true  },
    { x:  -6.8, skin: 0xc08858, outfit: 0x0a1a2a, female: false  }
  ];
  barPatronCfgs.forEach((cfg, pi) => {
    const patron = makePerson(cfg.skin, cfg.outfit, cfg.female);
    patron.position.set(cfg.x, 0, 7.4); // standing right behind stool, bar hides lower body
    patron.rotation.y = Math.PI; // facing bar
    charGroup.add(patron);
    state.animations.push((dt, t) => {
      const ph = t * 0.9 + pi * 2.3;
      patron.rotation.x = Math.sin(ph * 0.6) * 0.09;
      patron.rotation.y = Math.PI + Math.sin(ph * 0.4) * 0.28; // wider glance
      // Head nods independently — nod to the music
      if (patron.userData.head) {
        patron.userData.head.rotation.x = Math.sin(t * 2.4 + pi) * 0.10;
        patron.userData.head.rotation.y = Math.sin(t * 0.8 + pi * 0.7) * 0.14;
      }
      // Raise drink to mouth periodically
      const drinkLift = Math.max(0, Math.sin(t * 0.65 + pi * 1.8));
      if (patron.userData.rightArm) patron.userData.rightArm.rotation.z = 0.10 - drinkLift * 0.6;
      return true;
    });
  });

  // ── Amber Man (by the wall — leather jacket, biker cap, smoking) ──
  const amber = makePerson(0xefd0ad, 0x0d0d0d, false);
  amber.position.set(-3.5, 0, -8.7);
  amber.rotation.y = 0.8;
  // Leather jacket collar
  const lcL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.3, metalness: 0.12 }));
  lcL.position.set(-0.09, 0.94, 0.19); lcL.rotation.z = 0.22;
  const lcR = lcL.clone(); lcR.position.set(0.09, 0.94, 0.19); lcR.rotation.z = -0.22;
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.22, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.75, roughness: 0.2 }));
  zip.position.set(0, 0.82, 0.21);
  amber.add(lcL, lcR, zip);
  const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xca8a2b, emissive: 0x5f3610, emissiveIntensity: 0.46 }));
  glasses.position.set(0, 1.0, 0.17);
  amber.add(glasses);
  const bikerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
  bikerCap.position.set(0, 1.12, 0);
  amber.add(bikerCap);
  addCigarette(amber, 0.08, 1.02, 0.18);
  addSmokeCloud(amber, 0, 1.5, 0);
  charGroup.add(amber);
  state.amberManMesh = amber;
  state.animations.push((dt, t) => {
    // Slow body rotation — watching the room with suspicion
    amber.rotation.y = 0.8 + Math.sin(t * 0.5) * 0.28;
    amber.rotation.x = Math.sin(t * 0.32) * 0.03;
    // Head follows with extra lag for a cool detached look
    if (amber.userData.head) {
      amber.userData.head.rotation.y = Math.sin(t * 0.6 + 0.4) * 0.18;
      amber.userData.head.rotation.x = Math.sin(t * 0.45) * 0.06;
    }
    // Right arm occasionally raises cigarette
    const smokeRaise = Math.max(0, Math.sin(t * 0.42 + 1.2));
    if (amber.userData.rightArm) amber.userData.rightArm.rotation.z = -0.10 - smokeRaise * 0.50;
    return true;
  });
}

function addCigarette(parent, x, y, z) {
  const cig = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6),
    new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6 })
  );
  cig.rotation.z = Math.PI / 2 + 0.3;
  cig.position.set(x, y, z);
  parent.add(cig);
  const ember = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 4, 4),
    new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 })
  );
  ember.position.set(0.06, 0, 0);
  cig.add(ember);
}

function addSmokeCloud(parent, x, y, z) {
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.06 + Math.random() * 0.06 })
    );
    puff.position.set(x + (Math.random() - 0.5) * 0.3, y + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.2);
    parent.add(puff);
    state.animations.push((dt, t) => {
      puff.position.y += dt * 0.08;
      if (puff.position.y > y + 0.8) puff.position.y = y;
      return true;
    });
  }
}

function registerNightclubInteractions() {
  clearInteractions();
  addInteraction("talk-date", "A", () => state.phase === "seated", () => state.dateMesh.position, 1.8, () => {
    showDialogue("Date: I love this song!", 1700);
  });
  addInteraction("stand-up", "B", () => state.phase === "seated", () => state.dateMesh.position, 1.9, () => {
    state.phase = "explore";
    state.playerCanMove = true;
    state.player.seated = false;
    setObjective("Walk the room. Talk to bartender at the bar.", "A to interact. B is action.");
    showDialogue("You stand up and the room opens around you.", 2600);
  });
  addInteraction("amber-man", "B", () => state.phase === "explore" || state.phase === "dance-invite", () => state.amberManMesh.position, 1.7, () => {
    showDialogue("\u2026", 1100);
  });
  addInteraction("bartender", "A", () => state.phase === "explore", () => state.bartenderMesh.position, 1.8, () => {
    state.phase = "dance-invite";
    setObjective("Your date moved to the dance floor. Meet her and press A.", "Dance floor is lit on the left.");
    showDialogue("Date: Come on, detective. Dance before this song dies.", 3600);
    moveDateTo(-6.5, -6.0, 0);
  });
  addInteraction("dance-date", "A", () => state.phase === "dance-invite", () => state.dateMesh.position, 1.9, () => { runDanceBeat(); });
  addInteraction("womens-door", "A", () => state.phase === "scream", () => state.womensDoorPos, 1.8, () => { loadBathroomScene(); });
}

function runDanceBeat() {
  if (state.flags.has("dance-sequence")) return;
  state.flags.add("dance-sequence");
  state.phase = "dancing";
  state.playerCanMove = false;
  showDialogue("You dance until the track snaps into the next beat.", 2900);
  window.setTimeout(() => { showDialogue("Date: I need the bathroom to powder my nose.", 2600); }, 3200);
  window.setTimeout(() => {
    state.phase = "scream";
    state.playerCanMove = true;
    setObjective("A scream cuts the room. Enter the women's room.", "Move to the red restroom door and press A.");
    showDialogue("A scream silences the club. Glasses freeze in mid-air.", 3200);
    scene.fog.color.setHex(0x1a1a18);
    scene.fog.density = 0.022;
    // Music cuts dead
    if (state.music && !state.music.paused) { state.music.pause(); }
    // House lights slam up — harsh, fluorescent-cold
    ambient.intensity = 3.8;
    // Emergency flash: cold white strobe that fades slowly
    const emergFlash = new THREE.PointLight(0xddeeff, 5.0, 20, 1);
    emergFlash.position.set(0, 3.8, 0); fxGroup.add(emergFlash);
    state.animations.push((dt, t) => {
      emergFlash.intensity = Math.max(0, emergFlash.intensity - dt * 1.4);
      return emergFlash.intensity > 0.05;
    });
    // All NPCs panic-flee toward exit (front door, z≈11) — skip the player
    charGroup.children.slice().forEach((npc, i) => {
      if (npc === state.player.mesh) return;
      let fled = false;
      state.animations.push((dt, t) => {
        if (fled) return false;
        // Sprint toward front exit
        npc.position.z += dt * (3.5 + i * 0.2);
        npc.rotation.y = Math.PI; // face exit (+z)
        // Run bob
        npc.position.y = Math.abs(Math.sin(t * 10 + i * 0.9)) * 0.12;
        if (npc.position.z > 13) { npc.visible = false; fled = true; return false; }
        return true;
      });
    });
    // Stop dance tiles flashing — glow dies to black
    state.danceTiles.forEach((tile) => { tile.mesh.material.emissiveIntensity = 0; });
  }, 6000);
}

function moveDateTo(x, z, targetY = null) {
  const target = new THREE.Vector3(x, targetY !== null ? targetY : state.dateMesh.position.y, z);
  state.animations.push((dt) => {
    tempA.copy(target).sub(state.dateMesh.position);
    if (tempA.length() < 0.08) return false;
    tempA.normalize();
    state.dateMesh.position.addScaledVector(tempA, dt * 1.95);
    state.dateMesh.rotation.y = Math.atan2(tempA.x, tempA.z);
    return true;
  });
}

// ─── Scene: Bathroom ───────────────────────────────────────────────

function loadBathroomScene() {
  resetWorld();
  state.sceneType = "walk";
  state.phase = "bathroom";
  state.playerCanMove = true;
  state.player.seated = false;
  state.player.pos.set(-2.6, 0, 2.0);
  state.player.yaw = Math.PI; // face -z toward crime scene (body at z=-2.5)
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = false; // first-person — no visible player body

  state.cameraBounds = { minX: -6.5, maxX: 6.5, minZ: -5.5, maxZ: 5.5, maxY: 4.5 };
  state.worldBounds = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };

  dom.hudLocation.textContent = "Powder Room";
  
  scene.fog = new THREE.FogExp2(0x1a2029, 0.025);
  renderer.setClearColor(0x181e28, 1);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.88 }));
  floor.rotation.x = -Math.PI / 2; envGroup.add(floor);
  const bathLight1 = new THREE.PointLight(0xaabbdd, 0.6, 10, 2);
  bathLight1.position.set(-1, 2.8, 3); fxGroup.add(bathLight1);
  const bathLight2 = new THREE.PointLight(0x8899bb, 0.4, 8, 2);
  bathLight2.position.set(3, 2.8, -2); fxGroup.add(bathLight2);
  const wc = 0x3a4558;
  envGroup.add(makeBox(0, 1.6, -6, 14, 3.2, 0.35, wc, 0.74));
  envGroup.add(makeBox(0, 1.6, 6, 14, 3.2, 0.35, wc, 0.74));
  envGroup.add(makeBox(-7, 1.6, 0, 0.35, 3.2, 12, wc, 0.74));
  envGroup.add(makeBox(7, 1.6, 0, 0.35, 3.2, 12, wc, 0.74));
  // Tile dado line on walls
  envGroup.add(makeBox(0, 0.72, -5.82, 13.8, 0.06, 0.04, 0x506070, 0.4));
  envGroup.add(makeBox(0, 0.72, 5.82, 13.8, 0.06, 0.04, 0x506070, 0.4));

  // Sink counter with faucet
  envGroup.add(makeBox(-1.1, 0.45, 4.8, 5.8, 0.9, 1.2, 0x2e333d, 0.6));
  const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.52),
    new THREE.MeshStandardMaterial({ color: 0xd0d8e0, roughness: 0.25, metalness: 0.15 }));
  sinkBasin.position.set(-0.5, 0.92, 4.82); envGroup.add(sinkBasin);
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 7),
    new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 0.7, roughness: 0.2 }));
  faucet.position.set(-0.5, 1.06, 4.69); envGroup.add(faucet);

  // Mirror on back wall — flush against wall (z≈5.82), faces player
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x9aaccc, roughness: 0.12, metalness: 0.88 }));
  mirror.position.set(-1.1, 1.66, 5.78); mirror.rotation.y = Math.PI; envGroup.add(mirror);
  // Mirror frame
  envGroup.add(makeBox(-1.1, 1.66, 5.81, 5.7, 1.8, 0.05, 0x2a1a10, 0.6));
  // Mirror crack detail
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
  crack.position.set(1.6, 2.18, 5.77); crack.rotation.z = 0.55; envGroup.add(crack);

  // Stall partition
  envGroup.add(makeBox(2.8, 1.3, -2.7, 4.4, 2.6, 0.3, 0x27303f, 0.75));
  // Stall door (ajar)
  const stallDoor = makeBox(0.7, 1.1, -3.3, 0.08, 2.0, 0.85, 0x2d3648, 0.7);
  stallDoor.rotation.y = 0.45; envGroup.add(stallDoor);

  // Blood pool — irregular shape built from overlapping circles
  const bloodMat = new THREE.MeshStandardMaterial({ color: 0x4a0610, roughness: 0.97 });
  const blood = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), bloodMat);
  blood.rotation.x = -Math.PI / 2; blood.position.set(3.3, 0.01, -2.2); envGroup.add(blood);
  const bloodTrail = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x3e0408, roughness: 0.98 }));
  bloodTrail.rotation.x = -Math.PI / 2; bloodTrail.rotation.z = 0.6;
  bloodTrail.position.set(2.6, 0.011, -2.6); envGroup.add(bloodTrail);
  const bloodSplat = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), bloodMat);
  bloodSplat.rotation.x = -Math.PI / 2; bloodSplat.position.set(2.2, 0.011, -3.1); envGroup.add(bloodSplat);

  // Crime-scene atmosphere: flickering harsh overhead light
  const crimeLight = new THREE.PointLight(0xc8dde8, 0.8, 9, 2);
  crimeLight.position.set(3.3, 2.8, -2.5); fxGroup.add(crimeLight);
  state.animations.push((dt, t) => {
    crimeLight.intensity = 0.7 + Math.sin(t * 43) * 0.06 + Math.sin(t * 17) * 0.04;
    return true;
  });

  charGroup.add(makeCorpse(3.2, 0.01, -2.5));

  // Clues
  const compact = makeBox(3.5, 0.58, -2.45, 0.34, 0.05, 0.34, 0xaeb9d3, 0.24);
  envGroup.add(compact);
  // Razor blade evidence near sink
  const razor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.85, roughness: 0.1 }));
  razor.position.set(-0.28, 0.935, 4.84); razor.rotation.y = 0.3; envGroup.add(razor);
  // White powder residue lines on mirror ledge
  const powderLine1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.005, 0.018),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 }));
  powderLine1.position.set(-1.4, 0.936, 4.84); envGroup.add(powderLine1);
  const powderLine2 = powderLine1.clone();
  powderLine2.position.set(-1.1, 0.936, 4.84); envGroup.add(powderLine2);
  const sinkClue = makeBox(-0.7, 0.938, 4.83, 0.58, 0.04, 0.3, 0xf7f7f7, 0.5);
  envGroup.add(sinkClue);

  state.obstacles = [makeObstacle(1.0, 5.1, -3.4, -1.4), makeObstacle(-4.0, 2.1, 4.2, 5.6)];

  clearInteractions();
  addInteraction("compact", "B", () => !state.flags.has("bathroom-mirror"), () => compact.position, 1.4, () => {
    state.flags.add("bathroom-mirror");
    openEvidence("Compact mirror", "Hmm\u2026 she could have been too busy minding her nose to notice the dealer of her last blowline.");
    updateBathroomObjective();
  });
  addInteraction("sink", "B", () => !state.flags.has("bathroom-sink"), () => sinkClue.position, 1.4, () => {
    state.flags.add("bathroom-sink");
    openEvidence("Sink counter", "White lines on the mirror. Bloody razor blade near the faucet.");
    updateBathroomObjective();
  });
  addInteraction("exit-bathroom", "A",
    () => state.flags.has("bathroom-mirror") && state.flags.has("bathroom-sink"),
    () => new THREE.Vector3(-5.8, 0, 0), 1.9, () => loadClubAftermath()
  );
  updateBathroomObjective();
}

function updateBathroomObjective() {
  const count = Number(state.flags.has("bathroom-mirror")) + Number(state.flags.has("bathroom-sink"));
  if (count >= 2) setObjective("Evidence logged. Leave the powder room.", "Press A at the exit.");
  else setObjective(`Inspect clue points (${count}/2).`, "Use B on compact mirror and sink evidence.");
}

// ─── Scene: Club Aftermath ─────────────────────────────────────────

function loadClubAftermath() {
  loadNightclubScene("aftermath");
  state.phase = "aftermath";
  state.playerCanMove = true;
  state.player.seated = false;
  dom.hudLocation.textContent = "Nightclub";
  
  scene.fog.color.setHex(0x1f2630);
  scene.fog.density = 0.052;
  renderer.setClearColor(0x19202b, 1);

  state.player.pos.set(4.6, 0, 4.8);
  state.player.yaw = Math.PI * 0.96;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.dateMesh.position.set(6.2, 0.5, 5.4);
  for (const tile of state.danceTiles) tile.mesh.material.emissiveIntensity = 0.06;

  clearInteractions();
  addInteraction("date-aftermath", "A", () => !state.flags.has("aftermath-talked"), () => state.dateMesh.position, 1.9, () => {
    state.flags.add("aftermath-talked");
    showDialogueSequence([
      "Date: I just went in with all the drinks\u2026 and then I saw all the\u2026 is she actually dead?",
      "You: It wasn\u2019t her time of the month.",
      "Date: Can we go home?",
      { text: "You: Let me just use the men\u2019s room real quick.", action: () => {
        setObjective("Enter the men\u2019s room.", "Walk to the gold restroom door and press A.");
        addInteraction("mens-door-aftermath", "A", () => true, () => state.mensDoorPos, 1.8, () => { loadMensRoomScene(); });
      }}
    ]);
  });
  setObjective("Talk to your date.", "Press A near her.");
}

// ─── Scene: Men's Room ─────────────────────────────────────────────

function loadMensRoomScene() {
  resetWorld();
  state.sceneType = "walk";
  state.phase = "mensroom";
  state.playerCanMove = true;
  state.player.seated = false;
  state.player.pos.set(0, 0, 4);
  state.player.yaw = Math.PI;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = false; // first-person — no visible player body

  state.cameraBounds = { minX: -5.5, maxX: 5.5, minZ: -5, maxZ: 5.5, maxY: 4.5 };
  state.worldBounds = { minX: -4.5, maxX: 4.5, minZ: -4.5, maxZ: 4.5 };

  dom.hudLocation.textContent = "Men's Room";
  
  scene.fog = new THREE.FogExp2(0x18202a, 0.065);
  renderer.setClearColor(0x10161e, 1);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x1e2832, roughness: 0.88 }));
  floor.rotation.x = -Math.PI / 2; envGroup.add(floor);
  const wc = 0x2a3442;
  envGroup.add(makeBox(0, 1.6, -5, 10, 3.2, 0.35, wc, 0.74));
  envGroup.add(makeBox(0, 1.6, 5, 10, 3.2, 0.35, wc, 0.74));
  envGroup.add(makeBox(-5, 1.6, 0, 0.35, 3.2, 10, wc, 0.74));
  envGroup.add(makeBox(5, 1.6, 0, 0.35, 3.2, 10, wc, 0.74));

  const um = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.3, metalness: 0.1 });
  const u1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.5), um);
  u1.position.set(4.7, 0.9, -1.5); envGroup.add(u1);
  const u2 = u1.clone(); u2.position.set(4.7, 0.9, 0.5); envGroup.add(u2);
  envGroup.add(makeBox(4.65, 1.0, -0.5, 0.08, 1.2, 0.3, 0x3a4252, 0.6));

  envGroup.add(makeBox(-4.2, 1.3, -2.8, 0.15, 2.6, 2.0, 0x27303f, 0.75));
  envGroup.add(makeBox(-3.25, 1.3, -3.75, 2.0, 2.6, 0.1, 0x27303f, 0.75));
  const s1Door = makeBox(-3.25, 1.1, -1.85, 0.08, 2.0, 0.9, 0x2d3648, 0.7);
  envGroup.add(s1Door);

  envGroup.add(makeBox(-4.2, 1.3, 0.2, 0.15, 2.6, 2.0, 0x27303f, 0.75));
  envGroup.add(makeBox(-3.25, 1.3, -0.75, 2.0, 2.6, 0.1, 0x27303f, 0.75));
  const s2Door = makeBox(-3.25, 1.1, 1.15, 0.08, 2.0, 0.9, 0x2d3648, 0.7);
  envGroup.add(s2Door);

  const guy1 = makePerson(0xecd2b0, 0x1a1e26, false);
  guy1.position.set(-3.7, 0.36, 0.1); guy1.scale.setScalar(0.85); guy1.visible = false;
  charGroup.add(guy1);
  const guy2 = makePerson(0xf0d8b8, 0x252a34, false);
  guy2.position.set(-3.4, 0.36, 0.5); guy2.scale.setScalar(0.85); guy2.visible = false;
  charGroup.add(guy2);

  envGroup.add(makeBox(2.5, 0.45, 4.3, 4.2, 0.9, 1.0, 0x2e333d, 0.6));
  const mr = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.4), new THREE.MeshStandardMaterial({ color: 0x8a97b3, roughness: 0.2, metalness: 0.82 }));
  mr.position.set(2.5, 1.5, 4.65); envGroup.add(mr);
  envGroup.add(makeDoor(0, 4.85, 0x272029));

  state.obstacles = [
    makeObstacle(-4.8, -2.6, -4.0, -1.0),
    makeObstacle(-4.8, -2.6, -1.0, 1.6),
    makeObstacle(4.2, 5.0, -2.2, 1.2),
    makeObstacle(0.5, 4.8, 3.8, 5.0)
  ];

  clearInteractions();
  addInteraction("stall1", "B", () => !state.flags.has("mr-s1"), () => s1Door.position, 1.6, () => {
    state.flags.add("mr-s1");
    showDialogue("Empty. Clean enough, for a men\u2019s room.", 2000);
  });
  addInteraction("stall2", "B", () => !state.flags.has("mr-s2"), () => s2Door.position, 1.6, () => {
    state.flags.add("mr-s2");
    guy1.visible = true; guy2.visible = true;
    state.animations.push((dt) => {
      s2Door.position.x -= dt * 2.0;
      if (s2Door.position.x < -4.2) { s2Door.visible = false; return false; }
      return true;
    });
    showDialogueSequence([
      "\u201CApologies, guys.\u201D",
      "No motive here. Just an opportunity."
    ], () => setObjective("Leave the men\u2019s room.", "Press A at the exit."));
  });
  addInteraction("exit-mr", "A", () => state.flags.has("mr-s2"), () => new THREE.Vector3(0, 0, 4.4), 2.0, () => loadClubFinal());
  setObjective("Check the stalls.", "Use B on the stall doors.");
}

// ─── Scene: Club Final (leave club) ────────────────────────────────

function loadClubFinal() {
  loadNightclubScene("aftermath");
  state.phase = "club-final";
  state.playerCanMove = true;
  state.player.seated = false;

  state.player.pos.set(-2, 0, -9);
  state.player.yaw = Math.PI;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;

  dom.hudLocation.textContent = "Nightclub";
  
  scene.fog.color.setHex(0x1f2630); scene.fog.density = 0.052;
  renderer.setClearColor(0x19202b, 1);

  state.dateMesh.position.set(-1, 0, -8);
  for (const tile of state.danceTiles) tile.mesh.material.emissiveIntensity = 0.06;

  clearInteractions();
  addInteraction("date-final", "A", () => !state.flags.has("club-final-talked"), () => state.dateMesh.position, 2.0, () => {
    state.flags.add("club-final-talked");
    showDialogueSequence([
      "Date: Encounter anything?",
      "You: Nothing out of place. Just a little matter between men. We can go now."
    ], () => {
      setObjective("Leave the nightclub.", "Press A at the entrance.");
      addInteraction("exit-club", "A", () => true, () => new THREE.Vector3(0, 0, 10.5), 2.2, () => {
        transitionToScene("11th Hour Motel.\nNight.", loadMotelRoom);
      });
    });
  });
  setObjective("Rejoin your date.", "Press A near her.");
}

// ─── Scene: Motel Room ─────────────────────────────────────────────

function loadMotelRoom() {
  resetWorld();
  state.sceneType = "walk";
  state.phase = "motel-room";
  state.playerCanMove = true;
  state.player.seated = false;
  state.player.pos.set(0, 0, 1.5);
  state.player.yaw = Math.PI;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = true;

  state.cameraBounds = { minX: -4.5, maxX: 4.5, minZ: -4.5, maxZ: 4.5, maxY: 4.5 };
  state.worldBounds = { minX: -3.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 };

  dom.hudLocation.textContent = "Room 3";
  
  
  scene.fog = new THREE.FogExp2(0x151a20, 0.030);
  renderer.setClearColor(0x0e1218, 1);
  ambient.intensity = 1.2;

  const flr = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x342818, roughness: 0.92 }));
  flr.rotation.x = -Math.PI / 2; envGroup.add(flr);
  const wc = 0x2a2820;
  envGroup.add(makeBox(0, 1.6, -4, 8, 3.2, 0.35, wc, 0.78));
  envGroup.add(makeBox(0, 1.6, 4, 8, 3.2, 0.35, wc, 0.78));
  envGroup.add(makeBox(-4, 1.6, 0, 0.35, 3.2, 8, wc, 0.78));
  envGroup.add(makeBox(4, 1.6, 0, 0.35, 3.2, 8, wc, 0.78));

  const door = makeDoor(3.85, 2.5, 0x3d2e1e); envGroup.add(door);
  for (let i = 0; i < 6; i++) envGroup.add(makeBox(3.87, 1.15 + i * 0.22, 0.5, 0.06, 0.04, 1.3, 0x8a7a5a, 0.4));
  const neon = new THREE.PointLight(0xff4466, 0.4, 5, 2); neon.position.set(4.5, 1.8, 0.5);
  fxGroup.add(neon);
  state.animations.push((dt, t) => { neon.intensity = 0.3 + Math.sin(t * 2.5) * 0.15; return true; });

  envGroup.add(makeBox(-2.5, 0.35, -1.0, 2.2, 0.7, 3.0, 0x444038, 0.8));
  envGroup.add(makeBox(-2.5, 0.72, -1.0, 2.0, 0.12, 2.8, 0xc8bca0, 0.85));
  envGroup.add(makeBox(-2.5, 0.82, -2.2, 1.6, 0.14, 0.5, 0xe8dcc0, 0.8));
  envGroup.add(makeBox(-3.5, 1.2, -1.0, 0.15, 1.0, 3.0, 0x3a3020, 0.6));

  envGroup.add(makeBox(-2.8, 0.35, 0.9, 0.7, 0.7, 0.5, 0x3a3020, 0.6));
  const tapePos = new THREE.Vector3(-2.8, 0.74, 0.8);
  envGroup.add(makeBox(tapePos.x, tapePos.y, tapePos.z, 0.3, 0.08, 0.2, 0x1a1a1a, 0.3));
  const phonePos = new THREE.Vector3(-2.6, 0.74, 1.05);
  envGroup.add(makeBox(phonePos.x, phonePos.y, phonePos.z, 0.18, 0.1, 0.12, 0x1a1614, 0.4));
  const holsterPos = new THREE.Vector3(-3.0, 0.74, 0.95);
  const holster = makeBox(holsterPos.x, holsterPos.y, holsterPos.z, 0.22, 0.06, 0.14, 0x2a1e14, 0.5);
  envGroup.add(holster);

  envGroup.add(makeBox(1.8, 0.3, -3.2, 1.4, 0.6, 0.6, 0x2e2818, 0.65));
  const tv = makeBox(1.8, 0.82, -3.2, 1.0, 0.7, 0.5, 0x181818, 0.3);
  envGroup.add(tv);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0x2a3a4a }));
  tvScreen.position.set(1.8, 0.82, -2.94); envGroup.add(tvScreen);
  envGroup.add(makeBox(2.8, 0.45, -3.2, 0.7, 0.9, 0.6, 0xd8d0c0, 0.4));

  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x887044, roughness: 0.4 }));
  lamp.position.set(-2.5, 0.85, 1.1); envGroup.add(lamp);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4b070, roughness: 0.7 }));
  shade.position.set(-2.5, 1.06, 1.1); envGroup.add(shade);
  const lampGlow = new THREE.PointLight(0xffcc88, 0.6, 6, 2);
  lampGlow.position.set(-2.5, 1.2, 1.1); fxGroup.add(lampGlow);
  // Overhead room fill light
  const roomLight = new THREE.PointLight(0xffd8b0, 0.8, 9, 2);
  roomLight.position.set(0, 2.8, 0); fxGroup.add(roomLight);
  state.animations.push((dt, t) => { roomLight.intensity = 0.72 + Math.sin(t * 0.4) * 0.06; return true; });

  const clock = makeBox(-3.85, 1.4, -0.2, 0.04, 0.2, 0.2, 0x2a2018, 0.4);
  envGroup.add(clock);
  const picture = makeBox(-3.85, 1.8, 1.5, 0.04, 0.6, 0.8, 0x3a2818, 0.5);
  envGroup.add(picture);
  const picInner = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x4a6a5a, roughness: 0.8 }));
  picInner.position.set(-3.82, 1.8, 1.5); picInner.rotation.y = Math.PI / 2; envGroup.add(picInner);

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x5a2a18, roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, 0); envGroup.add(rug);

  state.obstacles = [
    makeObstacle(-3.8, -1.4, -2.8, 0.5),
    makeObstacle(-3.4, -2.2, 0.5, 1.3),
    makeObstacle(1.0, 3.4, -3.8, -2.8),
    makeObstacle(3.4, 4.2, 1.8, 3.2)
  ];

  clearInteractions();
  addInteraction("tape", "B", () => !state.flags.has("motel-tape"), () => tapePos, 1.6, () => {
    state.flags.add("motel-tape");
    openEvidence("Tape Recorder",
      "\"Thursday night at the disco \u2014 my date screamed, and I found a body. " +
      "Later that night, I attempted to rearrange the order, but it was no use: " +
      "just not my night\u2026 not hers. Though I suspect a few men had a good time.\"");
  });
  addInteraction("motel-tv", "B", () => true, () => tv.position, 1.6, () => {
    showDialogue("Static. Nothing worth watching at this hour.", 2000);
  });
  addInteraction("motel-fridge", "B", () => true, () => new THREE.Vector3(2.8, 0, -3.2), 1.6, () => {
    showDialogue("Empty. Just a box of baking soda and a forgotten lime.", 2200);
  });
  addInteraction("gun-holster", "B",
    () => state.flags.has("motel-intruder") && !state.flags.has("motel-gun"),
    () => holsterPos, 1.5, () => {
    state.flags.add("motel-gun");
    holster.visible = false;
    showDialogue("You grab your piece.", 1200);
    setObjective("Confront the intruder.", "Press B near him.");
  });
  addInteraction("motel-door", "A", () => state.flags.has("motel-intruder-fled"), () => door.position, 1.8, () => {
    transitionToScene("11th Hour Motel.\nExterior. Night.", loadMotelExterior);
  });

  setObjective("Examine the room.", "Use B on tape recorder, TV, or fridge.");
}

function motelPhoneCall() {
  state.flags.add("motel-phone");
  state.playerCanMove = false;
  showDialogue("*Ring ring*", 1500);
  window.setTimeout(() => {
    showDialogueSequence([
      "You answer the phone.",
      "Date: Hi \u2014",
      "You: Did you notice ANYbody else in there with you? Any one?",
      "Date: Oh I was just so drunk\u2026 there was that man with the hat and striped shirt. I did remember seeing him. Because he looks like a man I get weed from sometimes. But he doesn\u2019t seem dangerous. I think he\u2019s just a music promoter.",
      "You: Did you know her?",
      "Date: Not well. Just from dancing\u2026",
      "You: Ok. Are you ok?",
      "Date: I just never seen anything like that before. I hope I never do again.",
      "You: Get some rest. After that, keep your eyes peeled. I\u2019m gonna do the same.",
      "Date: Ok, good night.",
      "You: Night."
    ], () => { state.playerCanMove = true; motelIntruder(); });
  }, 2000);
}

function motelIntruder() {
  state.flags.add("motel-intruder");
  state.playerCanMove = false;

  // Build intruder — starts at door (right wall, x≈3.85)
  const intruder = makePerson(0xd8c8a0, 0x1a1a1a, false);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  mask.position.y = 0.98; intruder.add(mask);
  // Gun held in right hand — separate mesh so we can drop it
  const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.4 }));
  gunMesh.position.set(0.22, 0.62, 0.1); intruder.add(gunMesh);
  intruder.position.set(3.85, 0, 2.5);
  intruder.rotation.y = Math.PI; // facing into room (toward -x)
  charGroup.add(intruder);
  state.intruderMesh = intruder;

  // ── Phase 1: pounding on door ──
  showDialogue("*BANG BANG BANG* \u2014 Someone\u2019s pounding on the door.", 2500);

  window.setTimeout(() => {
    // ── Phase 2: kick in door and walk to center of room ──
    // Door-kick flash
    const kickFlash = new THREE.PointLight(0xfff0d0, 2.5, 6, 2);
    kickFlash.position.set(3.6, 1.0, 2.5); fxGroup.add(kickFlash);
    let flashT = 0;
    const flashAnim = (dt) => {
      flashT += dt;
      kickFlash.intensity = 2.5 * Math.exp(-flashT * 8);
      if (flashT > 0.5) { fxGroup.remove(kickFlash); return false; }
      return true;
    };
    state.animations.push(flashAnim);

    // Walk intruder into room
    const walkDest = new THREE.Vector3(1.8, 0, 2.5);
    let walkDone = false;
    let walkBob = 0;
    const walkIn = (dt) => {
      if (walkDone) return false;
      const diff = walkDest.clone().sub(intruder.position);
      if (diff.length() < 0.12) { walkDone = true; return false; }
      walkBob += dt;
      intruder.position.addScaledVector(diff.normalize(), dt * 1.4);
      intruder.rotation.x = Math.sin(walkBob * 9) * 0.04; // walk bob
      return true;
    };
    state.animations.push(walkIn);

    showDialogueSequence([
      "A masked man kicks the door in, gun raised.",
      { text: "You: Easy now. Let\u2019s talk about this.", action: () => {
        state.playerCanMove = true;
        // ── Menace loop: intruder slowly drifts and aims ──
        const menaceAnim = (dt, t) => {
          if (!intruder.visible || state.flags.has("motel-intruder-fled")) return false;
          // Gun tracks player (bob + aim sway)
          intruder.rotation.y = Math.PI + Math.sin(t * 0.6) * 0.18;
          gunMesh.rotation.z = Math.sin(t * 1.4) * 0.08; // gun sway
          return true;
        };
        state.animations.push(menaceAnim);
        setObjective("Get to your gun on the nightstand.", "Use B on the gun holster.");
      }}
    ]);
  }, 2800);

  // ── Phase 3: confrontation with gun ──
  addInteraction("confront", "B",
    () => state.flags.has("motel-gun") && !state.flags.has("motel-intruder-fled"),
    () => intruder.position, 2.8, () => {
    state.flags.add("motel-intruder-fled");
    state.playerCanMove = false;

    // Muzzle flash from player's position
    const muzzle = new THREE.PointLight(0xffd060, 4.0, 5, 2);
    muzzle.position.set(state.player.pos.x, state.player.pos.y + 0.8, state.player.pos.z);
    fxGroup.add(muzzle);
    let muzzleT = 0;
    state.animations.push((dt) => {
      muzzleT += dt;
      muzzle.intensity = 4.0 * Math.exp(-muzzleT * 14);
      if (muzzleT > 0.35) { fxGroup.remove(muzzle); return false; }
      return true;
    });

    // Gun drops from intruder's hand
    intruder.remove(gunMesh);
    const droppedGun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.4 }));
    droppedGun.position.set(intruder.position.x + 0.25, 0.62, intruder.position.z);
    envGroup.add(droppedGun);
    let dropT = 0;
    state.animations.push((dt) => {
      dropT += dt;
      droppedGun.position.y = Math.max(0.03, 0.62 - dropT * dropT * 4);
      droppedGun.rotation.z += dt * 9;
      return droppedGun.position.y > 0.04;
    });

    showDialogueSequence([
      "You draw and fire \u2014 the gun spins out of his hand.",
      "The masked man stumbles, clutches his wrist, and bolts for the door.",
      { text: "You holster your piece. Time to find out who sent him.", action: () => {
        state.playerCanMove = true;
        // Intruder panics and sprints for door
        const fleeDest = new THREE.Vector3(4.5, 0, 2.5);
        let fleeBob = 0;
        state.animations.push((dt) => {
          if (!intruder.visible) return false;
          const diff = fleeDest.clone().sub(intruder.position);
          if (diff.length() < 0.2) { intruder.visible = false; return false; }
          fleeBob += dt;
          intruder.position.addScaledVector(diff.normalize(), dt * 4.0); // sprinting
          intruder.rotation.y = Math.atan2(diff.x, diff.z);
          intruder.rotation.x = Math.sin(fleeBob * 12) * 0.08; // run bob
          return true;
        });
        setObjective("Exit the motel room.", "Press A at the door.");
      }}
    ]);
  });
}

// ─── Scene: Motel Exterior (Night) ─────────────────────────────────

function loadMotelExterior() {
  resetWorld();
  state.sceneType = "walk";
  state.phase = "motel-ext";
  state.playerCanMove = true;
  state.player.seated = false;
  state.player.pos.set(-6, 0, 0);
  state.player.yaw = -Math.PI / 2;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = true;

  state.cameraBounds = { minX: -22, maxX: 20, minZ: -4, maxZ: 12, maxY: 7 };
  state.worldBounds = { minX: -18.5, maxX: 15, minZ: -3.5, maxZ: 4 };

  dom.hudLocation.textContent = "Motel";

  scene.fog = new THREE.FogExp2(0x06090f, 0.004); // thin fog — open world feel
  renderer.setClearColor(0x04060e, 1); // deep night sky
  ambient.intensity = 0.9;

  // Sky backdrop — large vertical plane simulating night sky depth
  const skyBg = new THREE.Mesh(new THREE.PlaneGeometry(120, 40),
    new THREE.MeshBasicMaterial({ color: 0x06080f }));
  skyBg.position.set(0, 10, -28); envGroup.add(skyBg);
  // Horizon glow band — city light bleed on the horizon
  const horizonA = new THREE.Mesh(new THREE.PlaneGeometry(120, 3),
    new THREE.MeshBasicMaterial({ color: 0x18102a }));
  horizonA.position.set(0, 1.0, -26); envGroup.add(horizonA);
  const horizonB = new THREE.Mesh(new THREE.PlaneGeometry(120, 1.5),
    new THREE.MeshBasicMaterial({ color: 0x2a1830 }));
  horizonB.position.set(0, 0.6, -24); envGroup.add(horizonB);
  // Distant city silhouette — row of dark boxes
  [-22, -16, -8, 4, 12, 20].forEach((bx, i) => {
    const h = 1.5 + (i * 0.7) % 3.0;
    envGroup.add(makeBox(bx, h * 0.5, -22, 2.0 + (i % 3) * 0.8, h, 0.5, 0x0c0a12, 0.95));
  });
  // Stars — small bright points scattered in sky
  for (let i = 0; i < 40; i++) {
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    star.position.set(-40 + i * 2.1 + (i % 3) * 1.4, 6 + (i % 5) * 1.8, -24 - (i % 4) * 1.2);
    envGroup.add(star);
  }

  // Ground — extended for open feel
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: 0x181a1c, roughness: 0.95 }));
  gnd.rotation.x = -Math.PI / 2; envGroup.add(gnd);
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(36, 2.5), new THREE.MeshStandardMaterial({ color: 0x262828, roughness: 0.85 }));
  sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0.02, -3.5); envGroup.add(sw);
  // Motel facade — taller for presence
  envGroup.add(makeBox(0, 2.2, -5.8, 36, 4.4, 1.4, 0x2a2420, 0.8));
  // Roof edge trim
  envGroup.add(makeBox(0, 4.45, -5.2, 36.4, 0.14, 0.22, 0x3a3028, 0.6));

  // ── Tall MOTEL neon sign — parking-lot pylon in front of building ──
  // Positioned at x=15 (right end), z=-2 (parking lot), clearly visible from camera
  envGroup.add(makeBox(15, 4.0, -2.0, 0.28, 8.0, 0.28, 0x3a3a3a, 0.5));          // pole, y=0 to y=8
  envGroup.add(makeBox(15, 0.2, -2.0, 0.44, 0.4, 0.44, 0x2a2a2a, 0.6));          // pole base
  envGroup.add(makeBox(15, 8.0, -2.0, 5.5, 2.0, 0.55, 0x160808, 0.4));           // sign board
  // Neon border frame around sign
  envGroup.add(makeBox(15, 8.0, -1.75, 5.7, 2.2, 0.08, 0xff2030, 0.25));         // outline glow
  // MOTEL — 5 letter-blocks across sign face
  const motelNeonMat = new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff1020, emissiveIntensity: 2.2, roughness: 0.2 });
  [-1.6, -0.8, 0.0, 0.8, 1.6].forEach((lx) => {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.2, 0.1), motelNeonMat);
    tube.position.set(15 + lx, 8.2, -1.75); envGroup.add(tube);
  });
  const signGlow = new THREE.PointLight(0xff2030, 2.2, 22, 2);
  signGlow.position.set(15, 8.0, -1.4); fxGroup.add(signGlow);
  state.animations.push((dt, t) => {
    signGlow.intensity = 1.8 + Math.sin(t * 4.8) * 0.40;
    return true;
  });
  // "VACANCY" sub-sign in green below MOTEL
  const vacMat = new THREE.MeshStandardMaterial({ color: 0x22ff44, emissive: 0x11cc33, emissiveIntensity: 1.6 });
  const vacSign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.52, 0.2), vacMat);
  vacSign.position.set(15, 6.7, -1.75); envGroup.add(vacSign);
  const vacGlow = new THREE.PointLight(0x22ff44, 0.7, 10, 2);
  vacGlow.position.set(15, 6.7, -1.4); fxGroup.add(vacGlow);

  // Parking-lot sodium fill lights
  [-10, -4, 2, 8].forEach((lx) => {
    const pl = new THREE.PointLight(0xffd090, 0.55, 10, 2); pl.position.set(lx, 3.2, 0); fxGroup.add(pl);
  });
  // Room doors + sconces (rooms 1–12)
  for (let i = 0; i < 12; i++) {
    const x = -14 + i * 2.3;
    envGroup.add(makeDoor(x, -5.0, (i === 2) ? 0x5a4a30 : 0x3a2e1e));
    // Sconce bracket above each door
    envGroup.add(makeBox(x, 3.8, -5.05, 0.18, 0.22, 0.12, 0x5a5040, 0.5));   // bracket
    const bulbGeo = new THREE.SphereGeometry(0.055, 6, 6);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffee99, emissive: 0xffcc66, emissiveIntensity: (i === 5 || i === 9) ? 0 : 1.0 }); // rooms 6 & 10 broken (dark)
    const bulb = new THREE.Mesh(bulbGeo, bulbMat); bulb.position.set(x, 3.62, -4.9); envGroup.add(bulb);
    const nl = new THREE.PointLight(0xffe8c0, (i === 5 || i === 9) ? 0 : 0.22, 3.0, 2);
    nl.position.set(x, 3.5, -4.7); fxGroup.add(nl);
  }
  // Room 13 — dedicated sconce that blinks
  const r13x = 14;
  envGroup.add(makeDoor(r13x, -5.0, 0x5a4a30));
  envGroup.add(makeBox(r13x, 3.8, -5.05, 0.18, 0.22, 0.12, 0x5a5040, 0.5));
  const r13Bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xffee99, emissive: 0xffcc66, emissiveIntensity: 1.0 }));
  r13Bulb.position.set(r13x, 3.62, -4.9); envGroup.add(r13Bulb);
  const r13l = new THREE.PointLight(0xffe8c0, 0.22, 3.0, 2);
  r13l.position.set(r13x, 3.5, -4.7); fxGroup.add(r13l);
  // Room 13 blinks ominously
  state.animations.push((dt, t) => {
    const on = Math.sin(t * 3.4) > 0.1 || (Math.sin(t * 7.1) > 0.6);
    r13l.intensity = on ? 0.22 : 0;
    r13Bulb.material.emissiveIntensity = on ? 1.0 : 0;
    return true;
  });

  // Office building — with interior visible through door
  envGroup.add(makeBox(-17, 1.8, -4, 2.8, 3.6, 4, 0x2e2820, 0.7));
  envGroup.add(makeDoor(-16.5, -2, 0x483828));
  envGroup.add(makeBox(-17, 3.2, -2, 2.0, 0.4, 0.1, 0x444030, 0.5));
  // Office sign: "MANAGER"
  envGroup.add(makeBox(-17, 2.8, -2.05, 1.4, 0.3, 0.05, 0x8a7a3a, 0.5));
  // Office interior hints — desk, TV glow, lamp
  const offDesk = makeBox(-17.2, 0.52, -3.5, 1.4, 1.04, 0.7, 0x3a2e1e, 0.75);
  envGroup.add(offDesk);
  const offTv = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1a1814, roughness: 0.3 }));
  offTv.position.set(-17.2, 1.0, -3.6); envGroup.add(offTv);
  const tvFlicker = new THREE.PointLight(0x4466aa, 0.35, 3, 2);
  tvFlicker.position.set(-17.2, 1.1, -3.2); fxGroup.add(tvFlicker);
  state.animations.push((dt, t) => {
    tvFlicker.intensity = 0.2 + Math.abs(Math.sin(t * 8.5 + Math.sin(t * 3.1) * 4)) * 0.35;
    return true;
  });
  const offLamp = new THREE.PointLight(0xffdd99, 0.6, 4, 2);
  offLamp.position.set(-16.8, 1.5, -3.0); fxGroup.add(offLamp);
  // Manager NPC — old woman, barely moves, eyes on TV
  const manager = makePerson(0xd4b898, 0x2a3828, true);
  manager.position.set(-16.9, 0, -3.0);
  manager.rotation.y = -Math.PI * 0.25; // angled toward door / desk
  charGroup.add(manager);
  state.animations.push((dt, t) => {
    // Very slow head turn toward door occasionally, mostly watches TV
    manager.rotation.y = -Math.PI * 0.25 + Math.sin(t * 0.3) * 0.3;
    manager.rotation.x = Math.sin(t * 0.2) * 0.03;
    return true;
  });

  const sp = makeBox(4, 3.5, 5, 0.15, 5.0, 0.15, 0x4a4a4a, 0.5); envGroup.add(sp);
  const sb = makeBox(4, 6.2, 5, 4.5, 2.0, 0.2, 0x1a1210, 0.5); envGroup.add(sb);
  const sg = new THREE.PointLight(0xff4466, 0.6, 10, 2); sg.position.set(4, 6.8, 5.5); fxGroup.add(sg);
  state.animations.push((dt, t) => { sg.intensity = 0.5 + Math.sin(t * 3) * 0.2; return true; });

  // Cars parked further from the path to office — moved to z=3 so walkway at z=-2 is clear
  makeSimpleCar(-5, 3, 0x3a2222);
  makeSimpleCar(3, 3.5, 0x222a3a);

  state.obstacles = [
    makeObstacle(-20, 15.5, -6.5, -4.2),  // motel building row
    makeObstacle(-7.0, -3.0, 2.0, 4.0),   // car 1 (moved back)
    makeObstacle(1.5, 4.5, 2.5, 5.0),     // car 2 (moved back)
    makeObstacle(-19.5, -15.5, -4.5, 4.0) // office building side walls
  ];

  clearInteractions();
  const offDoorPos = new THREE.Vector3(-16.5, 0, -2);
  addInteraction("office", "A", () => !state.flags.has("motel-mail"), () => offDoorPos, 2.0, () => {
    state.playerCanMove = false;
    showDialogueSequence([
      "A smoky old woman behind the desk watches a cowboy show on a tiny TV. A fly buzzes around. She is unfazed.",
      "You: Got any mail for me?",
      "She backs up without breaking eye contact with the television and finds a few envelopes.",
      "Letter 1: Ex-wife complaining alimony is late.",
      "Letter 2: A solicitation from Weiner of the Month Club. You consider it \u2014 your room only has a microwave.",
      "Letter 3: No return address. Inside: a check for $15,000 from a lawyer you don\u2019t recognize.",
      "You: Not mine, definitely not my ex-wife\u2019s\u2026",
      "15,000, no probable cause. Least I can do is pay this lawyer a visit\u2026",
      "Manager: Oh (coughs). I accidentally gave that one to the man in room 13. Which is the OTHER room 3\u2026 Been missing since before my ol\u2019 man died. Always thought it\u2019d be unlucky to try looking for that missing 1\u2026",
      "Manager: Thought I saw the man from 3 \u2014 I mean 13 \u2014 wearing a ski mask earlier\u2026",
      { text: "You: Thanks for letting me know.", action: () => {
        state.flags.add("motel-mail");
        state.playerCanMove = true;
        setObjective("Head back. Get some rest.", "Walk right toward your car.");
        addInteraction("leave-night", "A", () => true, () => new THREE.Vector3(-5, 0, 2), 2.5, () => {
          transitionToScene("Thunderstorms & Neon Signs.\n\n11th Hour Motel.\nSaturday morning.", loadMotelMorning);
        });
      }}
    ]);
  });

  const r3Pos = new THREE.Vector3(-14 + 2 * 2.3, 0, -4.8);
  addInteraction("room3-locked", "A", () => true, () => r3Pos, 1.5, () => showDialogue("You\u2019ve checked out.", 1500));

  setObjective("Explore the motel. Visit the office.", "Walk left to the office.");
}

function makeSimpleCar(x, z, color) {
  envGroup.add(makeBox(x, 0.4, z, 2.2, 0.55, 1.1, color, 0.5));
  envGroup.add(makeBox(x - 0.15, 0.82, z, 1.3, 0.45, 0.95, darkenColor(color, 0.7), 0.4));
  envGroup.add(makeBox(x - 0.8, 0.16, z - 0.55, 0.35, 0.32, 0.1, 0x111111, 0.3));
  envGroup.add(makeBox(x + 0.8, 0.16, z - 0.55, 0.35, 0.32, 0.1, 0x111111, 0.3));
  envGroup.add(makeBox(x - 0.8, 0.16, z + 0.55, 0.35, 0.32, 0.1, 0x111111, 0.3));
  envGroup.add(makeBox(x + 0.8, 0.16, z + 0.55, 0.35, 0.32, 0.1, 0x111111, 0.3));
}

// ─── Scene: Motel Morning ──────────────────────────────────────────

function loadMotelMorning() {
  resetWorld();
  state.sceneType = "walk";
  state.phase = "motel-morning";
  state.playerCanMove = false;
  state.player.seated = false;
  state.player.pos.set(-5, 0, 2);
  state.player.yaw = Math.PI / 2;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = true;

  state.cameraBounds = { minX: -18, maxX: 18, minZ: -6, maxZ: 8, maxY: 8 };
  state.worldBounds = { minX: -16, maxX: 15, minZ: -3.5, maxZ: 4 };

  dom.hudLocation.textContent = "Motel";
  
  scene.fog = new THREE.FogExp2(0x1a2030, 0.018);
  renderer.setClearColor(0x1a2233, 1);
  ambient.intensity = 0.8;

  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.9 }));
  gnd.rotation.x = -Math.PI / 2; envGroup.add(gnd);
  envGroup.add(makeBox(0, 1.8, -5.8, 36, 3.6, 1.4, 0x3a3428, 0.75));
  for (let i = 0; i < 12; i++) envGroup.add(makeDoor(-14 + i * 2.3, -5.0, 0x4a3e2e));
  const r13x = 14;
  const r13Door = makeDoor(r13x, -5.0, 0x5a4a30);
  envGroup.add(r13Door);

  envGroup.add(makeBox(4, 3.5, 5, 0.15, 5.0, 0.15, 0x4a4a4a, 0.5));
  envGroup.add(makeBox(4, 6.2, 5, 4.5, 2.0, 0.2, 0x2a1a14, 0.5));

  makeSimpleCar(-5, 2.5, 0x3a3030);

  state.obstacles = [makeObstacle(-20, 16, -6.5, -4.2), makeObstacle(-6.5, -3.5, 1.5, 4)];

  const manager = makePerson(0xecd2b0, 0x5a3a4a, true);
  manager.position.set(-10, 0.36, -3);
  charGroup.add(manager);

  clearInteractions();

  showDialogueSequence([
    "You\u2019re outside, checking out. About to drive to meet the attorney who sent the $15,000 check.",
    { text: "Manager comes running out.", action: () => {
      state.animations.push((dt) => {
        if (manager.position.x < -6) { manager.position.x += dt * 2.5; return true; }
        return false;
      });
    }},
    "Manager: The man from room 3 is DEAD!",
    "You: \u2026?",
    "Manager: Not you, 3! The OTHER 3\u2026 13!",
    "Last night this guy tried robbing you at gunpoint in a ski mask. Kinda seems like he got what he deserved.",
    "Manager: Oh I can\u2019t afford to call the police. They\u2019ll shake out my whole bottom line. But, you\u2019re a P.I. aren\u2019t you? Your business card says so. I found it while I was cleaning out your room.",
    "Cleaning, not likely. This manager is a busybody.",
    "Manager: Can you check it out? I\u2019ll give you a free night\u2026 free of charge. Please.",
    "I didn\u2019t need the room, but I hate to see a squeamish lady put out.",
    { text: "You: Tell ya what, ma\u2019am. It\u2019s on me.", action: () => {
      state.playerCanMove = true;
      setObjective("Go to room 13 at the far right.", "Walk right to room 13 and press A.");
    }}
  ]);

  addInteraction("room13-enter", "A", () => state.playerCanMove, () => r13Door.position, 1.8, () => loadRoom13());
}

// ─── Scene: Room 13 ────────────────────────────────────────────────

function loadRoom13() {
  resetWorld();
  state.sceneType = "walk";
  state.phase = "room13";
  state.playerCanMove = false;
  state.player.seated = false;
  state.player.pos.set(2, 0, 2);
  state.player.yaw = Math.PI;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = true;

  state.cameraBounds = { minX: -4.5, maxX: 4.5, minZ: -4.5, maxZ: 4.5, maxY: 4.5 };
  state.worldBounds = { minX: -3.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 };

  dom.hudLocation.textContent = "Room 13";
  
  scene.fog = new THREE.FogExp2(0x151a20, 0.06);
  renderer.setClearColor(0x0e1218, 1);

  const flr = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x342818, roughness: 0.92 }));
  flr.rotation.x = -Math.PI / 2; envGroup.add(flr);
  const wc = 0x2a2820;
  envGroup.add(makeBox(0, 1.6, -4, 8, 3.2, 0.35, wc, 0.78));
  envGroup.add(makeBox(0, 1.6, 4, 8, 3.2, 0.35, wc, 0.78));
  envGroup.add(makeBox(-4, 1.6, 0, 0.35, 3.2, 8, wc, 0.78));
  envGroup.add(makeBox(4, 1.6, 0, 0.35, 3.2, 8, wc, 0.78));

  envGroup.add(makeDoor(3.85, 2.5, 0x3d2e1e));
  envGroup.add(makeBox(-2.5, 0.35, -1.0, 2.2, 0.7, 3.0, 0x444038, 0.8));
  envGroup.add(makeBox(-2.5, 0.72, -1.0, 2.0, 0.12, 2.8, 0xc8bca0, 0.85));

  envGroup.add(makeBox(1.8, 0.3, -3.2, 1.4, 0.6, 0.6, 0x2e2818, 0.65));
  const tv = makeBox(1.8, 0.82, -3.2, 1.0, 0.7, 0.5, 0x181818, 0.3); envGroup.add(tv);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0x8a9aaa }));
  tvScreen.position.set(1.8, 0.82, -2.94); envGroup.add(tvScreen);
  state.animations.push(() => {
    if (!tvScreen.visible) return true;
    tvScreen.material.color.setHex(Math.random() > 0.5 ? 0x8a9aaa : 0x6a7a8a);
    return true;
  });
  envGroup.add(makeBox(1.5, 1.22, -3.1, 0.2, 0.04, 0.2, 0x111111, 0.6));

  charGroup.add(makeCorpse(0, 0.12, 1.0));
  envGroup.add(makeBox(0.4, 0.04, 1.5, 0.2, 0.04, 0.12, 0xf0e8d0, 0.4));
  const pill = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xd4a040, roughness: 0.2, metalness: 0.15 }));
  pill.position.set(-0.3, 0.12, 1.3); pill.rotation.z = 1.6; envGroup.add(pill);
  const wsk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.28, 8), new THREE.MeshStandardMaterial({ color: 0x5a3818, roughness: 0.2, metalness: 0.1 }));
  wsk.position.set(0.6, 0.1, 0.8); wsk.rotation.z = 1.2; envGroup.add(wsk);

  state.obstacles = [makeObstacle(-3.8, -1.4, -2.8, 0.5), makeObstacle(1.0, 3.4, -3.8, -2.8)];

  clearInteractions();
  addInteraction("exam-scene", "B", () => !state.flags.has("r13-examined"), () => new THREE.Vector3(0.2, 0, 1.2), 1.8, () => {
    state.flags.add("r13-examined");
    openEvidence("Crime Scene",
      "The pills were a mix of amphetamines and painkillers, prescription label not relevant. " +
      "The whiskey was the nail on the coffin.");
  });
  addInteraction("r13-tv", "B", () => tvScreen.visible, () => tv.position, 1.6, () => {
    tvScreen.visible = false; tvScreen.material.color.setHex(0x0a0a0a);
    showDialogue("You turn off the TV. Static fades to silence.", 1800);
  });
  addInteraction("exit-r13", "A", () => state.flags.has("r13-examined"), () => new THREE.Vector3(3.5, 0, 2.5), 1.8, () => loadRoom13Exit());

  showDialogueSequence([
    "Looks like he\u2019s also checked out.",
    { text: "Same layout as your room. Dead man on the floor, ski mask on top of a snowy TV.", action: () => {
      state.playerCanMove = true;
      setObjective("Investigate the scene.", "Use B to examine the body and evidence.");
    }}
  ]);
}

function loadRoom13Exit() {
  resetWorld();
  state.sceneType = "walk";
  state.phase = "r13-exit";
  state.playerCanMove = true;
  state.player.pos.set(13, 0, -3);
  state.player.yaw = 0;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = true;

  state.cameraBounds = { minX: 6, maxX: 18, minZ: -6, maxZ: 8, maxY: 8 };
  state.worldBounds = { minX: 8, maxX: 16, minZ: -3, maxZ: 4 };

  dom.hudLocation.textContent = "Motel";
  
  scene.fog = new THREE.FogExp2(0x1a2030, 0.018);
  renderer.setClearColor(0x1a2233, 1);

  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.9 }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.x = 12; envGroup.add(gnd);
  envGroup.add(makeBox(12, 1.8, -5.8, 14, 3.6, 1.4, 0x3a3428, 0.75));
  envGroup.add(makeDoor(14, -5.0, 0x5a4a30));

  const kid = makePerson(0xf0d8b8, 0x3a5a3a, false);
  kid.position.set(12, 0.2, -2); kid.scale.setScalar(0.6); charGroup.add(kid);
  const mgr = makePerson(0xecd2b0, 0x5a3a4a, true);
  mgr.position.set(10, 0.36, -2); mgr.visible = false; charGroup.add(mgr);

  clearInteractions();
  state.obstacles = [makeObstacle(6, 16, -6.5, -4.2)];

  addInteraction("talk-kid", "A", () => !state.flags.has("kid-talked"), () => kid.position, 2.2, () => {
    state.flags.add("kid-talked");
    state.playerCanMove = false;
    showDialogueSequence([
      "You: Find anything good?",
      "Kid: Oh hi Mr. I just\u2026 is that man gonna be okay?",
      "You: Sure, he\u2019s just sleeping.",
      { text: "The manager appears.", action: () => { mgr.visible = true; } },
      "Manager: Oh I see you\u2019ve met my daughter\u2026",
      "You: She has your eyes.",
      "Manager: Thank you for looking into things. Looks like I\u2019ll have to pay the garbage collector this week.",
      { text: "You: I\u2019ll be heading out now.", action: () => {
        state.playerCanMove = true;
        setObjective("Get in the car and leave.", "Press A to leave.");
        addInteraction("leave-motel", "A", () => true, () => new THREE.Vector3(10, 0, 3), 3.0, () => {
          transitionToScene("Upstate. Afternoon.\n\nMusic: I\u2019m Only Sleeping.", loadDrivingScene);
        });
      }}
    ]);
  });
  setObjective("Someone\u2019s near your bag.", "Press A to talk.");
}

// ─── Scene: Driving ────────────────────────────────────────────────

function loadDrivingScene() {
  resetWorld();
  state.sceneType = "driving";
  state.phase = "driving";
  state.playerCanMove = true;
  state.player.mesh.visible = false;

  state.cameraBounds = null;
  state.worldBounds = null;

  dom.hudLocation.textContent = "Highway";
  
  
  scene.fog = new THREE.FogExp2(0x889aaa, 0.006);
  renderer.setClearColor(0x6a8aaa, 1);
  ambient.intensity = 1.0;
  key.intensity = 1.4;

  const d = state.driving;
  d.lane = 1;
  d.progress = 0;
  d.cars = [];
  d.buildings = [];
  d.speed = 14;
  d.target = 120;

  const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 200), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, -0.01, -80); envGroup.add(road);

  const lm = new THREE.MeshBasicMaterial({ color: 0xeeee88 });
  for (let i = 0; i < 30; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.5), lm);
    dash.rotation.x = -Math.PI / 2; dash.position.set(-1.5, 0.01, -i * 6); envGroup.add(dash);
    const d2 = dash.clone(); d2.position.set(1.5, 0.01, -i * 6); envGroup.add(d2);
  }
  const em = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const el = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 200), em);
  el.rotation.x = -Math.PI / 2; el.position.set(-4.3, 0.01, -80); envGroup.add(el);
  const er = el.clone(); er.position.set(4.3, 0.01, -80); envGroup.add(er);

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(30, 200), new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.95 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(-18, -0.02, -80); envGroup.add(grass);
  const g2 = grass.clone(); g2.position.set(18, -0.02, -80); envGroup.add(g2);

  const playerCar = new THREE.Group();
  playerCar.add(makeBox(0, 0.4, 0, 1.8, 0.5, 3.6, 0x4a2828, 0.45));
  playerCar.add(makeBox(-0.05, 0.78, 0.2, 1.4, 0.4, 1.8, darkenColor(0x4a2828, 0.7), 0.35));
  playerCar.add(makeBox(-0.7, 0.16, -1.3, 0.3, 0.3, 0.1, 0x111111, 0.3));
  playerCar.add(makeBox(0.7, 0.16, -1.3, 0.3, 0.3, 0.1, 0x111111, 0.3));
  playerCar.add(makeBox(-0.7, 0.16, 1.3, 0.3, 0.3, 0.1, 0x111111, 0.3));
  playerCar.add(makeBox(0.7, 0.16, 1.3, 0.3, 0.3, 0.1, 0x111111, 0.3));
  playerCar.position.set(0, 0, 5);
  envGroup.add(playerCar);
  d.playerCar = playerCar;

  for (let i = 0; i < 12; i++) {
    const side = (i % 2 === 0) ? -1 : 1;
    const bw = 1.5 + Math.random() * 3;
    const bh = 2 + Math.random() * 6;
    const bz = -8 - i * 14;
    const bx = side * (6 + Math.random() * 4);
    const bc = [0x4a4a5a, 0x5a5a6a, 0x3a4a5a, 0x6a6a7a][i % 4];
    envGroup.add(makeBox(bx, bh / 2, bz, bw, bh, 2, bc, 0.7));
    d.buildings.push({ mesh: null, z: bz });
  }

  for (let i = 0; i < 4; i++) {
    const lane = Math.random() > 0.5 ? 0 : 2;
    const carColors = [0x2a3a5a, 0x5a2a2a, 0x2a5a3a, 0x5a5a2a];
    const c = new THREE.Group();
    c.add(makeBox(0, 0.35, 0, 1.6, 0.45, 3.2, carColors[i], 0.5));
    c.add(makeBox(0, 0.72, 0.1, 1.2, 0.38, 1.6, darkenColor(carColors[i], 0.7), 0.4));
    const z = -20 - i * 30;
    const x = (lane - 1) * 3;
    c.position.set(x, 0, z);
    envGroup.add(c);
    d.cars.push({ mesh: c, lane, baseZ: z });
  }

  camera.position.set(0, 6, 12);
  camera.lookAt(0, 0, 0);

  clearInteractions();
  setObjective("Drive to the city. Avoid traffic.", "Move left/right to change lanes.");
}

function updateDriving(delta) {
  const d = state.driving;
  if (!d.playerCar) return;

  d.progress += d.speed * delta;

  const inputX = (state.controls.right ? 1 : 0) - (state.controls.left ? 1 : 0) + state.controls.joyX;
  if (Math.abs(inputX) > 0.3) {
    const targetLane = clamp(d.lane + Math.sign(inputX), 0, 2);
    if (targetLane !== d.lane && !state.flags.has("lane-cooldown")) {
      d.lane = targetLane;
      state.flags.add("lane-cooldown");
      window.setTimeout(() => state.flags.delete("lane-cooldown"), 300);
    }
  }

  const targetX = (d.lane - 1) * 3;
  d.playerCar.position.x += (targetX - d.playerCar.position.x) * delta * 8;
  d.playerCar.position.y = 0.02 + Math.sin(d.progress * 0.8) * 0.02;

  for (const car of d.cars) {
    car.mesh.position.z += d.speed * delta * 0.6;
    if (car.mesh.position.z > 20) {
      car.mesh.position.z = -100 - Math.random() * 40;
      car.lane = Math.random() > 0.5 ? 0 : 2;
      car.mesh.position.x = (car.lane - 1) * 3;
    }
  }

  camera.position.set(d.playerCar.position.x * 0.3, 6, 12);
  camera.lookAt(d.playerCar.position.x * 0.3, 0, -5);

  if (d.progress >= d.target) {
    d.progress = d.target;
    state.sceneType = "walk";
    state.playerCanMove = false;
    showDialogueSequence([
      "You arrive at the law office. Buffalo.",
      { text: "End of current chapter. To be continued\u2026", action: () => {
        setObjective("Chapter complete.", "Next: the law office, and deeper into the case.");
      }}
    ]);
  }
}

// ─── Evidence / Interaction System ─────────────────────────────────

function addInteraction(id, keyName, enabledFn, getPosFn, radius, onTrigger) {
  const marker = createMarker();
  markerGroup.add(marker);
  state.interactions.push({ id, keyName, enabledFn, getPosFn, radius, onTrigger, marker });
}

function clearInteractions() {
  for (const it of state.interactions) { markerGroup.remove(it.marker); disposeObject(it.marker); }
  state.interactions = [];
  state.nearestInteraction = null;
}

function createMarker() {
  const marker = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffcc44, emissive: 0xff8800, emissiveIntensity: 0.9,
    roughness: 0.18, metalness: 0.55
  });
  // Pin head — fat sphere
  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 12), goldMat);
  pinHead.position.y = 0.0;
  // Pin stem — tapers from head to tip
  const pinStem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.008, 0.26, 7), goldMat);
  pinStem.position.y = -0.18;
  // Pin tip — downward cone
  const pinTip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.10, 7),
    new THREE.MeshStandardMaterial({ color: 0xe8b020, emissive: 0xcc6600, emissiveIntensity: 0.7, roughness: 0.2 }));
  pinTip.rotation.z = Math.PI; pinTip.position.y = -0.36;
  // Ground shadow ring
  const shadowRing = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.22, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  shadowRing.rotation.x = -Math.PI / 2; shadowRing.position.y = -0.6;
  // Glow point light
  const glow = new THREE.PointLight(0xff9900, 0.55, 2.2, 2);
  glow.position.y = 0.05;
  marker.add(pinHead, pinStem, pinTip, shadowRing, glow);
  return marker;
}

function updateInteractions(elapsed) {
  if (state.sceneType === "driving") return;
  let nearest = null;
  let nearestDist = Infinity;
  for (const it of state.interactions) {
    const enabled = it.enabledFn();
    const pos = it.getPosFn();
    if (!enabled) { it.marker.visible = false; continue; }
    it.marker.visible = true;
    // Pin bobs up and down slightly; no horizontal spin (pins are anchored)
    it.marker.position.set(pos.x, pos.y + 1.62 + Math.sin(elapsed * 2.8) * 0.05, pos.z);
    it.marker.rotation.y = 0;
    const dist = tempA.set(pos.x, state.player.pos.y, pos.z).distanceTo(state.player.pos);
    if (dist <= it.radius && dist < nearestDist) { nearest = it; nearestDist = dist; }
  }
  state.nearestInteraction = nearest;
  if (state.evidenceOpen) { dom.interactionText.textContent = "Press B or BACK to close evidence."; return; }
  const nearA = findNearestByKey("A");
  const nearB = findNearestByKey("B");
  if (!nearA && !nearB) { dom.interactionText.textContent = state.activeBaseHint; return; }
  const parts = [];
  if (nearA) parts.push(`[A] ${formatInteractionLabel(nearA.id)}`);
  if (nearB) parts.push(`[B] ${formatInteractionLabel(nearB.id)}`);
  dom.interactionText.textContent = parts.join("  |  ");
}

function formatInteractionLabel(id) {
  const labels = {
    "talk-date": "Talk to your date", "stand-up": "Stand up",
    bartender: "Talk to bartender", "dance-date": "Dance",
    "amber-man": "Action at amber shades man", "womens-door": "Enter women\u2019s room",
    compact: "Inspect compact mirror", sink: "Inspect sink clue",
    "exit-bathroom": "Exit powder room", "date-aftermath": "Talk to your date",
    "mens-door-aftermath": "Enter men\u2019s room",
    stall1: "Open stall 1", stall2: "Open stall 2", "exit-mr": "Exit",
    "date-final": "Talk to your date", "exit-club": "Leave nightclub",
    tape: "Play tape recorder", "motel-tv": "Watch TV", "motel-fridge": "Open fridge",
    "gun-holster": "Grab gun", confront: "Confront intruder",
    "motel-door": "Exit room", office: "Enter office",
    "room3-locked": "Try door", "room13-enter": "Enter room 13",
    "exam-scene": "Examine scene", "r13-tv": "Turn off TV", "exit-r13": "Exit room",
    "talk-kid": "Talk", "leave-motel": "Leave", "leave-night": "Head back"
  };
  return labels[id] || "Interact";
}

function triggerInteraction(interaction) {
  if (!interaction || !interaction.enabledFn()) return;
  interaction.onTrigger();
}

function openEvidence(title, text) {
  state.evidenceReturnCanMove = state.playerCanMove;
  state.playerCanMove = false;
  state.evidenceOpen = true;
  dom.evidenceTitle.textContent = title;
  dom.evidenceText.textContent = text;
  dom.evidenceOverlay.classList.remove("hidden");
}

function closeEvidence() {
  if (!state.evidenceOpen) return;
  state.evidenceOpen = false;
  state.playerCanMove = state.evidenceReturnCanMove;
  dom.evidenceOverlay.classList.add("hidden");
  if (state.flags.has("motel-tape") && !state.flags.has("motel-phone")) {
    window.setTimeout(() => motelPhoneCall(), 600);
  }
}

function setObjective(text, hint) {
  dom.objectiveText.textContent = text;
  dom.interactionText.textContent = hint;
  state.activeBaseHint = hint;
}

// ─── Input Triggers ────────────────────────────────────────────────

function findNearestByKey(keyName) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const it of state.interactions) {
    if (!it.enabledFn() || it.keyName !== keyName) continue;
    const pos = it.getPosFn();
    const dist = tempA.set(pos.x, state.player.pos.y, pos.z).distanceTo(state.player.pos);
    if (dist <= it.radius && dist < nearestDist) { nearest = it; nearestDist = dist; }
  }
  return nearest;
}

function updateInputTriggers() {
  if (state.inDialogue) {
    if (state.controls.aQueued || state.controls.bQueued) displayNextDialogueLine();
    state.controls.aQueued = false;
    state.controls.bQueued = false;
    return;
  }
  if (state.controls.aQueued) {
    const target = findNearestByKey("A");
    if (target) triggerInteraction(target);
  }
  if (state.controls.bQueued) {
    if (state.evidenceOpen) closeEvidence();
    else { const target = findNearestByKey("B"); if (target) triggerInteraction(target); }
  }
  state.controls.aQueued = false;
  state.controls.bQueued = false;
}

// ─── Player Movement ───────────────────────────────────────────────

function updatePlayer(delta, elapsed) {
  if (state.sceneType === "driving") return;
  // Detect which floor level the player is on (nightclub only)
  if (state.sceneType === "walk" && state.phase !== "bathroom" && state.phase !== "mensroom") {
    const px = state.player.pos.x, pz = state.player.pos.z;
    const onDiningPlatform = px > 0.6 && px < 9.9 && pz > -7.4 && pz < 7.8;
    state.player.pos.y = onDiningPlatform ? 0.5 : 0;
  }
  if (!state.playerCanMove || state.evidenceOpen) return;
  const inputX = (state.controls.right ? 1 : 0) - (state.controls.left ? 1 : 0) + state.controls.joyX;
  const inputZ = (state.controls.down ? 1 : 0) - (state.controls.up ? 1 : 0) + state.controls.joyY;
  tempA.set(inputX, 0, inputZ);
  if (tempA.lengthSq() < 0.001) {
    // Smoothly return limbs to idle when stopping
    if (state.player.leftLeg) state.player.leftLeg.rotation.x *= 0.85;
    if (state.player.rightLeg) state.player.rightLeg.rotation.x *= 0.85;
    if (state.player.leftShin) state.player.leftShin.rotation.x *= 0.85;
    if (state.player.rightShin) state.player.rightShin.rotation.x *= 0.85;
    if (state.player.leftArm) state.player.leftArm.rotation.x *= 0.85;
    if (state.player.rightArm) state.player.rightArm.rotation.x *= 0.85;
    // Gentle idle breathing bob
    state.player.mesh.position.y = state.player.pos.y + Math.sin(elapsed * 1.8) * 0.004;
    return;
  }
  tempA.normalize();
  const speed = state.player.seated ? 0 : 4.2;
  const trialX = state.player.pos.x + tempA.x * speed * delta;
  const trialZ = state.player.pos.z + tempA.z * speed * delta;
  if (canMoveTo(trialX, state.player.pos.z)) state.player.pos.x = trialX;
  if (canMoveTo(state.player.pos.x, trialZ)) state.player.pos.z = trialZ;

  const wb = state.worldBounds || { minX: -11.2, maxX: 11.2, minZ: -10.8, maxZ: 10.8 };
  state.player.pos.x = clamp(state.player.pos.x, wb.minX, wb.maxX);
  state.player.pos.z = clamp(state.player.pos.z, wb.minZ, wb.maxZ);

  // Smooth yaw rotation toward movement direction instead of instant snap
  const targetYaw = Math.atan2(tempA.x, tempA.z);
  let yawDiff = targetYaw - state.player.yaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  state.player.yaw += yawDiff * (1 - Math.exp(-delta * 14));

  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  // Walk bob - subtle vertical movement above current floor level
  state.player.mesh.position.y = state.player.pos.y + Math.abs(Math.sin(elapsed * 8.0)) * 0.018;

  // Natural walk cycle — thigh swings, shin bends at knee (opposite direction = knee lift)
  const wp = Math.sin(elapsed * 9.0) * 0.38;
  if (state.player.leftLeg) state.player.leftLeg.rotation.x = wp;
  if (state.player.rightLeg) state.player.rightLeg.rotation.x = -wp;
  if (state.player.leftShin) state.player.leftShin.rotation.x = -Math.max(0, wp) * 0.65;
  if (state.player.rightShin) state.player.rightShin.rotation.x = -Math.max(0, -wp) * 0.65;
  if (state.player.leftArm) state.player.leftArm.rotation.x = -wp * 0.45;
  if (state.player.rightArm) state.player.rightArm.rotation.x = wp * 0.45;
  // Subtle body tilt while walking
  if (state.player.body) state.player.body.rotation.z = Math.sin(elapsed * 9.0) * 0.018;
}

function canMoveTo(x, z) {
  for (const o of state.obstacles) {
    if (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ) return false;
  }
  return true;
}

// ─── Animations & Camera ───────────────────────────────────────────

function updateAnimations(delta, elapsed) {
  state.animations = state.animations.filter((fn) => fn(delta, elapsed));
  for (const tile of state.danceTiles) {
    const glow = (state.phase === "aftermath" || state.phase === "club-final" || state.phase === "scream") ? 0 : 0.2 + Math.max(0, Math.sin(elapsed * 2.4 + tile.phase)) * 0.56;
    tile.mesh.material.emissiveIntensity = glow;
  }
  for (const smoke of state.smoke) {
    smoke.position.addScaledVector(smoke.userData.velocity, delta * 0.8);
    smoke.position.y += delta * 0.2;
    // Fade opacity as smoke rises
    const maxY = 3.6;
    if (smoke.position.y > maxY) {
      smoke.position.y = 0.6 + Math.random() * 0.4;
      if (smoke.userData.area === 0) {
        smoke.position.x = -9.5 + Math.random() * 5.4;
        smoke.position.z = -8.9 + Math.random() * 4.9;
      } else {
        smoke.position.x = -4 + Math.random() * 14;
        smoke.position.z = -2 + Math.random() * 10;
      }
    }
  }
  state.cabaretLights.forEach((entry, idx) => {
    entry.angle += delta * (0.55 + idx * 0.1);
    entry.light.position.x = entry.originX + Math.sin(entry.angle) * 1.2;
    entry.light.position.z = entry.originZ + Math.cos(entry.angle) * 1.0;
  });
}

function updateCamera(delta) {
  if (state.sceneType === "driving") return;

  // Motel exterior — lower, cinematic angle showing building + sign against sky
  if (state.phase === "motel-ext" || state.phase === "motel-morning") {
    const desiredPos = tempA.set(
      state.player.pos.x + 2.0,
      state.player.pos.y + 4.5,
      state.player.pos.z + 10.0
    );
    if (state.cameraBounds) {
      const b = state.cameraBounds;
      desiredPos.x = clamp(desiredPos.x, b.minX, b.maxX);
      desiredPos.y = clamp(desiredPos.y, 0.5, b.maxY);
      desiredPos.z = clamp(desiredPos.z, b.minZ, b.maxZ);
    }
    camera.position.lerp(desiredPos, 1 - Math.exp(-delta * 3.8));
    // Look at a point mid-building so the facade + sign appear in upper half of frame
    tempB.set(state.player.pos.x - 1.5, state.player.pos.y + 2.5, state.player.pos.z - 3.5);
    camera.lookAt(tempB);
    return;
  }

  // First-person view in bathroom/mensroom scenes
  if (state.phase === "bathroom" || state.phase === "mensroom") {
    const eyeX = state.player.pos.x;
    const eyeY = state.player.pos.y + 1.02;
    const eyeZ = state.player.pos.z;
    const fwdX = Math.sin(state.player.yaw);
    const fwdZ = Math.cos(state.player.yaw);
    tempA.set(eyeX, eyeY, eyeZ);
    camera.position.lerp(tempA, 1 - Math.exp(-delta * 14));
    tempB.set(eyeX + fwdX * 5, eyeY - 0.04, eyeZ + fwdZ * 5);
    camera.lookAt(tempB);
    return;
  }

  let desired, lerpSpeed;
  // Fixed isometric-style offset — camera never spins, just follows position.
  // Offset: slightly right and well behind/above. Good for the nightclub layout.
  const CAM_X = 3.0, CAM_Y = 7.8, CAM_Z = 6.5;
  if (state.player.seated) {
    desired = tempA.set(
      state.player.pos.x + CAM_X * 0.6,
      state.player.pos.y + CAM_Y * 0.7,
      state.player.pos.z + CAM_Z * 0.8
    );
    lerpSpeed = 2.8;
  } else {
    desired = tempA.set(
      state.player.pos.x + CAM_X,
      state.player.pos.y + CAM_Y,
      state.player.pos.z + CAM_Z
    );
    lerpSpeed = 4.8;
  }
  if (state.cameraBounds) {
    const b = state.cameraBounds;
    desired.x = clamp(desired.x, b.minX, b.maxX);
    desired.y = clamp(desired.y, 0.5, b.maxY);
    desired.z = clamp(desired.z, b.minZ, b.maxZ);
  }
  camera.position.lerp(desired, 1 - Math.exp(-delta * lerpSpeed));
  // Look at a point slightly above the player's chest
  tempB.set(state.player.pos.x, state.player.pos.y + 0.9, state.player.pos.z);
  camera.lookAt(tempB);
}

// ─── Main Loop ─────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;
  if (!state.running) return;

  if (state.sceneType === "driving") {
    updateDriving(delta);
    updateAnimations(delta, elapsed);
    updateInputTriggers();
  } else {
    updatePlayer(delta, elapsed);
    updateAnimations(delta, elapsed);
    updateInteractions(elapsed);
    updateInputTriggers();
    updateCamera(delta);
  }
  renderer.render(scene, camera);
}

function syncViewport() {
  const width = dom.canvas.clientWidth || window.innerWidth;
  const height = dom.canvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// ─── Utilities ─────────────────────────────────────────────────────

function resetWorld() {
  clearGroup(envGroup);
  clearGroup(charGroup, state.player.mesh);
  clearGroup(fxGroup);
  clearGroup(markerGroup);
  clearInteractions();
  state.obstacles = [];
  state.smoke = [];
  state.danceTiles = [];
  state.cabaretLights = [];
  state.animations = [];
  state.intruderMesh = null;
  state.cameraYawInitialized = false;
  ambient.intensity = 0.6;
  key.intensity = 1.15;
  if (!charGroup.children.includes(state.player.mesh)) charGroup.add(state.player.mesh);
}

function clearGroup(group, preserve) {
  for (let i = group.children.length - 1; i >= 0; i -= 1) {
    const child = group.children[i];
    if (preserve && child === preserve) continue;
    group.remove(child);
    disposeObject(child);
  }
}

function disposeObject(object) {
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
      else node.material.dispose();
    }
  });
}

function addCabaretLights() {
  state.cabaretLights = [];
  const colors = [0xff3f5f, 0x45d7ff, 0xffcc4d, 0xaa44ff, 0xff8844];
  for (let i = 0; i < colors.length; i += 1) {
    const light = new THREE.PointLight(colors[i], 0.75, 10, 2);
    const originX = -9.2 + i * 1.1;
    const originZ = -8.8 + (i % 2 ? 0.6 : -0.4);
    light.position.set(originX, 3.8, originZ);
    fxGroup.add(light);
    state.cabaretLights.push({ light, originX, originZ, angle: Math.random() * Math.PI * 2 });
    // Visible light housing on ceiling
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.3 })
    );
    housing.position.set(originX, 3.55, originZ);
    envGroup.add(housing);
  }
}

function addSmoke() {
  state.smoke = [];
  // Stage smoke - dense near the stage, drifting upward
  for (let i = 0; i < 40; i += 1) {
    const size = 0.08 + Math.random() * 0.14;
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 6),
      new THREE.MeshBasicMaterial({
        color: i < 20 ? 0xb8c1d6 : 0xc8b8a8,
        transparent: true,
        opacity: 0.03 + Math.random() * 0.04,
        depthWrite: false
      })
    );
    // Spread smoke across stage and bar area
    const area = i < 25 ? 0 : 1; // 0 = stage, 1 = bar/lounge
    if (area === 0) {
      puff.position.set(-9.4 + Math.random() * 5.4, 0.8 + Math.random() * 2.5, -8.8 + Math.random() * 4.8);
    } else {
      puff.position.set(-4 + Math.random() * 14, 1.0 + Math.random() * 1.5, -2 + Math.random() * 10);
    }
    puff.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.04,
      0.005 + Math.random() * 0.015,
      (Math.random() - 0.5) * 0.04
    );
    puff.userData.area = area;
    fxGroup.add(puff);
    state.smoke.push(puff);
  }
}

function makePerson(skinColor, outfitColor, female) {
  const root = new THREE.Group();
  const skin   = new THREE.MeshToonMaterial({ color: skinColor });
  const outfit = new THREE.MeshToonMaterial({ color: outfitColor });
  const dark   = new THREE.MeshToonMaterial({ color: darkenColor(outfitColor, 0.55) });
  const hairMat = new THREE.MeshToonMaterial({ color: 0x0c0906 });
  const eyeMat  = new THREE.MeshToonMaterial({ color: 0x111111 });

  if (female) {
    // Flared dress — narrow waist, wide skirt hem
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.32, 0.58, 12), outfit);
    skirt.position.y = 0.31;
    const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.28, 10), outfit);
    bodice.position.y = 0.74;
    const shoulderBar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.22), outfit);
    shoulderBar.position.y = 0.90;
    // Arms (bare skin — hang at sides)
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.034, 0.46, 7), skin);
    lArm.position.set(-0.24, 0.69, 0); lArm.rotation.z = 0.20;
    const rArm = lArm.clone(); rArm.position.set(0.24, 0.69, 0); rArm.rotation.z = -0.20;
    // Legs peek below hem
    const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.034, 0.10, 7), skin);
    lLeg.position.set(-0.07, 0.02, 0);
    const rLeg = lLeg.clone(); rLeg.position.set(0.07, 0.02, 0);
    // Head — large, dominant cartoon proportion
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.205, 12, 10), skin);
    head.position.y = 1.13;
    // Hair — covers top and sides of head
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.222, 12, 9), hairMat);
    hair.position.set(0, 1.21, -0.02); hair.scale.set(1.0, 0.80, 0.90);
    // Eyes — large
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 7), eyeMat);
    lEye.position.set(-0.082, 1.14, 0.185);
    const rEye = lEye.clone(); rEye.position.set(0.082, 1.14, 0.185);
    // Lips
    const lipMat = new THREE.MeshToonMaterial({ color: 0xcc1c3c });
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.02), lipMat);
    lips.position.set(0, 1.04, 0.20);

    root.add(skirt, bodice, shoulderBar, lArm, rArm, lLeg, rLeg, head, hair, lEye, rEye, lips);
    root.userData.head = head;
    root.userData.leftArm  = lArm;
    root.userData.rightArm = rArm;

  } else {
    // Blocky suit — wide shoulders give clear male silhouette
    const hatMat = new THREE.MeshToonMaterial({ color: darkenColor(outfitColor, 0.40) });
    const shoeMat = new THREE.MeshToonMaterial({ color: 0x100d08 });
    const handMat = new THREE.MeshToonMaterial({ color: skinColor });
    // Legs / trousers
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.16), dark);
    lLeg.position.set(-0.11, 0.25, 0);
    const rLeg = lLeg.clone(); rLeg.position.set(0.11, 0.25, 0);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.065, 0.20), shoeMat);
    lShoe.position.set(-0.11, 0.02, 0.03);
    const rShoe = lShoe.clone(); rShoe.position.set(0.11, 0.02, 0.03);
    // Jacket — blocky torso
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.25), outfit);
    jacket.position.y = 0.74;
    // Wide shoulders — dominant feature
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.12, 0.27), outfit);
    shoulders.position.y = 1.02;
    // Arms (jacket sleeves)
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.40, 0.15), outfit);
    lArm.position.set(-0.34, 0.73, 0);
    const rArm = lArm.clone(); rArm.position.set(0.34, 0.73, 0);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.09), handMat);
    lHand.position.set(-0.34, 0.50, 0);
    const rHand = lHand.clone(); rHand.position.set(0.34, 0.50, 0);
    // Head — large
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.200, 12, 10), skin);
    head.position.y = 1.20;
    // Hat brim + crown
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.270, 0.280, 0.046, 12), hatMat);
    brim.position.y = 1.39;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.190, 0.220, 12), hatMat);
    crown.position.y = 1.52;
    // Eyes
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.030, 7, 7), eyeMat);
    lEye.position.set(-0.075, 1.21, 0.185);
    const rEye = lEye.clone(); rEye.position.set(0.075, 1.21, 0.185);

    root.add(lLeg, rLeg, lShoe, rShoe, jacket, shoulders, lArm, rArm, lHand, rHand,
             head, brim, crown, lEye, rEye);
    root.userData.head = head;
    root.userData.leftArm  = lArm;
    root.userData.rightArm = rArm;
  }
  return root;
}

function darkenColor(hex, factor) {
  const r = ((hex >> 16) & 0xff) * factor;
  const g = ((hex >> 8) & 0xff) * factor;
  const b = (hex & 0xff) * factor;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function makeDoor(x, z, color) {
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.2, 0.16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.07 })
  );
  door.position.set(x, 1.1, z);
  return door;
}

function makeBox(x, y, z, w, h, d, color, roughness = 0.7) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.12 })
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function makeCorpse(x, y, z) {
  const body = new THREE.Group();
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xb8a0c0, roughness: 0.62 }); // purple dress
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4bca0, roughness: 0.5 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.72 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xd4207a, roughness: 0.35 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.3 });
  const eyeDark = new THREE.MeshStandardMaterial({ color: 0x111008, roughness: 0.2 });

  // Torso (dress — larger, slightly twisted)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 0.40), clothMat);
  torso.rotation.z = 0.28;
  body.add(torso);

  // Skirt flare where dress hits floor
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, 0.12, 14), clothMat);
  skirt.position.set(-0.25, 0.02, 0.02); skirt.rotation.z = 1.45;
  body.add(skirt);

  // Head (turned, cheek on floor — eerie stillness)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), skinMat);
  head.position.set(0.57, 0.055, 0.06); head.scale.set(1.0, 1.06, 0.92);
  body.add(head);

  // Hair spread on floor
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
  hair.position.set(0.58, 0.06, -0.02);
  body.add(hair);
  const hairSpread = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.8, side: THREE.DoubleSide }));
  hairSpread.rotation.x = -Math.PI / 2; hairSpread.position.set(0.68, 0.01, -0.18);
  body.add(hairSpread);

  // Face: eyes half-open (unsettling)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 7), eyeWhite);
  eyeL.position.set(0.62, 0.09, -0.065); body.add(eyeL);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.013, 5, 5), eyeDark);
  pupilL.position.set(0.64, 0.09, -0.065); body.add(pupilL);
  const eyeR = eyeL.clone(); eyeR.position.set(0.62, 0.09, 0.04); body.add(eyeR);
  const pupilR = pupilL.clone(); pupilR.position.set(0.64, 0.09, 0.04); body.add(pupilR);

  // Arms: one reaching, one underneath
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.44, 7), skinMat);
  armL.position.set(0.22, 0.03, -0.32); armL.rotation.x = -0.35; armL.rotation.z = 1.18;
  body.add(armL);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), skinMat);
  handL.position.set(0.1, 0.04, -0.52); body.add(handL);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.38, 7), skinMat);
  armR.position.set(0.18, 0.03, 0.28); armR.rotation.x = 0.28; armR.rotation.z = 0.9;
  body.add(armR);

  // Legs in dress
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.52, 7), clothMat);
  legL.position.set(-0.48, 0.02, -0.07); legL.rotation.z = 1.38;
  body.add(legL);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.46, 7), clothMat);
  legR.position.set(-0.44, 0.02, 0.15); legR.rotation.z = 1.52; legR.rotation.x = 0.22;
  body.add(legR);

  // Heels (platform disco shoes)
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.14), shoeMat);
  shoeL.position.set(-0.72, 0.02, -0.07); body.add(shoeL);
  const shoeR = shoeL.clone(); shoeR.position.set(-0.68, 0.02, 0.18); body.add(shoeR);

  // Jewelry: bracelet
  const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.007, 5, 12),
    new THREE.MeshStandardMaterial({ color: 0xd4a020, metalness: 0.85, roughness: 0.15 }));
  bracelet.position.set(0.1, 0.05, -0.52); bracelet.rotation.x = 1.1;
  body.add(bracelet);

  // Spilled purse near hand
  const purse = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xd4207a, roughness: 0.45 }));
  purse.position.set(-0.04, 0.01, -0.65); purse.rotation.y = 0.4;
  body.add(purse);
  // Spilled contents: compact, lipstick
  const compact2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.07),
    new THREE.MeshStandardMaterial({ color: 0xc8b8c8, roughness: 0.25, metalness: 0.3 }));
  compact2.position.set(-0.16, 0.01, -0.7); body.add(compact2);
  const lipstick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.07, 6),
    new THREE.MeshStandardMaterial({ color: 0xcc2040, roughness: 0.35 }));
  lipstick.position.set(-0.3, 0.01, -0.62); lipstick.rotation.z = 1.4;
  body.add(lipstick);

  body.position.set(x, y, z);
  return body;
}

function makeObstacle(minX, maxX, minZ, maxZ) {
  return { minX, maxX, minZ, maxZ };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
