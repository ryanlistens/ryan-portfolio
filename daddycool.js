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
  driving: { lane: 1, progress: 0, cars: [], buildings: [], speed: 12, target: 100 }
};

const tempA = new THREE.Vector3();
const tempB = new THREE.Vector3();

initRendererProfile();
buildPlayerMesh();
attachInput();
syncViewport();
window.addEventListener("resize", syncViewport);

function initRendererProfile() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = false;
  renderer.setClearColor(0x09080d, 1);
  scene.fog = new THREE.FogExp2(0x0a0a10, 0.038);
}

function buildPlayerMesh() {
  const root = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0x1a1b20, roughness: 0.45, metalness: 0.07 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xeed5b3, roughness: 0.4, metalness: 0.03 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.5 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.3, metalness: 0.15 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.5 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7 });

  const lowerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.34, 10), pants);
  lowerBody.position.y = 0.54;
  const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.38, 10), suit);
  upperBody.position.y = 0.88;
  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), suit);
  shoulderL.position.set(-0.26, 1.04, 0);
  const shoulderR = shoulderL.clone(); shoulderR.position.set(0.26, 1.04, 0);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 8), shirt);
  collar.position.set(0, 1.09, 0.04);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8), skin);
  neck.position.y = 1.14;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), skin);
  head.position.y = 1.3; head.scale.set(1, 1.12, 0.95);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.05, 6), skin);
  nose.position.set(0, 1.28, 0.14); nose.rotation.x = Math.PI / 2;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
  hair.position.y = 1.33;

  const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.28, 8), suit);
  lUpperArm.position.set(-0.3, 0.88, 0); lUpperArm.rotation.z = 0.1;
  const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.24, 8), suit);
  lForearm.position.set(-0.34, 0.63, 0);
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), skin);
  lHand.position.set(-0.34, 0.5, 0);
  const rUpperArm = lUpperArm.clone(); rUpperArm.position.set(0.3, 0.88, 0); rUpperArm.rotation.z = -0.1;
  const rForearm = lForearm.clone(); rForearm.position.set(0.34, 0.63, 0);
  const rHand = lHand.clone(); rHand.position.set(0.34, 0.5, 0);

  const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 8), pants);
  lThigh.position.set(-0.09, 0.32, 0);
  const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 8), pants);
  lShin.position.set(-0.09, 0.08, 0);
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.14), shoe);
  lShoe.position.set(-0.09, -0.02, 0.02);
  const rThigh = lThigh.clone(); rThigh.position.set(0.09, 0.32, 0);
  const rShin = lShin.clone(); rShin.position.set(0.09, 0.08, 0);
  const rShoe = lShoe.clone(); rShoe.position.set(0.09, -0.02, 0.02);

  root.add(lowerBody, upperBody, shoulderL, shoulderR, collar, neck, head, nose, hair);
  root.add(lUpperArm, lForearm, lHand, rUpperArm, rForearm, rHand);
  root.add(lThigh, lShin, lShoe, rThigh, rShin, rShoe);

  state.player.mesh = root;
  state.player.body = upperBody;
  state.player.leftLeg = lThigh;
  state.player.rightLeg = rThigh;
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
  await runTypewriter(INTRO_TEXT);
  dom.gameRoot.classList.remove("hidden");
  startMusic();
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
  const audio = state.music || new Audio();
  state.music = audio;
  audio.loop = true;
  audio.volume = 0.68;
  const candidates = ["songs/nightclub.mp3", "music/nightclub.mp3"];
  for (const src of candidates) {
    const ok = await tryAudioSource(audio, src);
    if (!ok) continue;
    try { await audio.play(); return; } catch (_) {}
  }
}

function tryAudioSource(audio, src) {
  return new Promise((resolve) => {
    let done = false;
    const pass = () => { if (done) return; done = true; cl(); resolve(true); };
    const fail = () => { if (done) return; done = true; cl(); resolve(false); };
    const cl = () => { audio.removeEventListener("canplaythrough", pass); audio.removeEventListener("error", fail); };
    audio.addEventListener("canplaythrough", pass, { once: true });
    audio.addEventListener("error", fail, { once: true });
    audio.src = src;
    audio.load();
    window.setTimeout(fail, 2400);
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
  state.player.pos.set(7.4, 0, 6.8);
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
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshStandardMaterial({ color: 0x140f14, roughness: 0.92, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  envGroup.add(floor);

  const walls = [
    makeBox(0, 1.8, -11.3, 25, 3.6, 0.4, 0x17111a),
    makeBox(0, 1.8, 11.3, 25, 3.6, 0.4, 0x17111a),
    makeBox(-12.2, 1.8, 0, 0.4, 3.6, 23, 0x161219),
    makeBox(12.2, 1.8, 0, 0.4, 3.6, 23, 0x161219)
  ];
  walls.forEach((m) => envGroup.add(m));

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

  buildTableSet(4.2, -4.6);
  buildTableSet(6.7, -1.3);
  buildTableSet(4.1, 2.0);
  buildTableSet(7.6, 5.3, true);

  envGroup.add(makeBox(-8.6, 0.72, 8.1, 4.7, 1.44, 1.6, 0x4f311f, 0.22));
  envGroup.add(makeBox(-8.6, 1.7, 9.4, 3.6, 1.1, 0.6, 0x2e231e, 0.3));

  const womensDoor = makeDoor(0.9, -10.9, 0xb22543);
  const mensDoor = makeDoor(-3.1, -10.9, 0x9d7a23);
  envGroup.add(womensDoor, mensDoor);
  state.womensDoorPos.copy(womensDoor.position).setY(0);
  state.mensDoorPos.copy(mensDoor.position).setY(0);

  envGroup.add(makeDoor(0.0, 10.9, 0x272029));

  const discoBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.08, metalness: 0.92 })
  );
  discoBall.position.set(-6.6, 3.4, -6.2);
  envGroup.add(discoBall);
  const discoLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5 })
  );
  discoLine.position.set(-6.6, 4.2, -6.2);
  envGroup.add(discoLine);
  state.animations.push((dt, t) => { discoBall.rotation.y += dt * 0.5; return true; });

  for (let i = 0; i < 5; i++) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0x6a1a1a, roughness: 0.5 }));
    stool.position.set(-7.2 + i * 0.9, 0.62, 7.0);
    envGroup.add(stool);
    const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4 }));
    stoolLeg.position.set(-7.2 + i * 0.9, 0.32, 7.0);
    envGroup.add(stoolLeg);
  }

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
  const colors = [0xff2f2f, 0x2f6eff, 0xffe14b, 0xffffff];
  state.danceTiles = [];
  for (let x = 0; x < 4; x += 1) {
    for (let z = 0; z < 4; z += 1) {
      const color = colors[(x + z) % colors.length];
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.08, 1.8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.34, roughness: 0.22, metalness: 0.2 })
      );
      tile.position.set(startX + x * 1.8, 0.08, startZ + z * 1.8);
      envGroup.add(tile);
      state.danceTiles.push({ mesh: tile, phase: Math.random() * Math.PI * 2 });
    }
  }
}

function buildTableSet(x, z, playerTable = false) {
  const cloth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.8, 0.66, 14),
    new THREE.MeshStandardMaterial({ color: 0x9f1f2d, roughness: 0.86 })
  );
  cloth.position.set(x, 0.35, z);
  envGroup.add(cloth);
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 0.05, 14),
    new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.5, metalness: 0.25 })
  );
  top.position.set(x, 0.71, z);
  envGroup.add(top);
  const candle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0xf3ead7, roughness: 0.44 })
  );
  candle.position.set(x + 0.1, 0.84, z + 0.06);
  envGroup.add(candle);
  fxGroup.add((() => { const l = new THREE.PointLight(0xffb86f, 0.3, 2.8, 2); l.position.set(x + 0.1, 1.0, z + 0.06); return l; })());
  const ashtray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10),
    new THREE.MeshStandardMaterial({ color: 0x7c8795, roughness: 0.3, metalness: 0.5 })
  );
  ashtray.position.set(x - 0.18, 0.77, z - 0.09);
  envGroup.add(ashtray);
  const matchbook = makeBox(x - 0.06, 0.76, z - 0.22, 0.08, 0.03, 0.05, 0xc83828, 0.5);
  envGroup.add(matchbook);
  if (!playerTable) {
    const drink = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 0.24, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a3812, roughness: 0.2, metalness: 0.1 })
    );
    drink.position.set(x + 0.28, 0.83, z - 0.12);
    envGroup.add(drink);
  }
}

function buildNightclubCharacters() {
  const frontman = makePerson(0x5a3a20, 0x5a3a20, false);
  frontman.position.set(-8.8, 0.36, -10.0);
  frontman.scale.set(1.04, 1.08, 1.04);
  charGroup.add(frontman);
  state.animations.push((dt, t) => {
    frontman.position.y = 0.36 + Math.sin(t * 5.6) * 0.08;
    frontman.rotation.y = Math.sin(t * 2.4) * 0.4;
    return true;
  });

  const drummer = makePerson(0x6a4a28, 0x1c1c22, false);
  drummer.position.set(-9.8, 0.36, -10.9);
  charGroup.add(drummer);
  envGroup.add(makeBox(-9.8, 0.26, -10.4, 1.1, 0.5, 1.0, 0x7a1f2b, 0.28));

  const coupleConfigs = [
    { x: 3.7, z: -4.6, wDress: 0xeb4d9c, mSuit: 0x0f1013 },
    { x: 6.2, z: -1.3, wDress: 0x45a8d3, mSuit: 0x2c50a6 },
    { x: 3.6, z: 2.0, wDress: 0xbc4fd1, mSuit: 0x682646 }
  ];
  coupleConfigs.forEach((cfg, idx) => {
    const woman = makePerson(0xf1d7b8, cfg.wDress, true);
    woman.position.set(cfg.x, 0.36, cfg.z + 0.12);
    const man = makePerson(0xecd2b0, cfg.mSuit, false);
    man.position.set(cfg.x + 0.7, 0.36, cfg.z - 0.08);
    addCigarette(man, 0.28, 0.65, 0.12);
    charGroup.add(woman, man);
    state.animations.push((dt, t) => {
      woman.position.y = 0.36 + Math.sin(t * 1.8 + idx) * 0.03;
      man.position.y = 0.36 + Math.sin(t * 1.6 + idx + 1.4) * 0.02;
      return true;
    });
  });

  const date = makePerson(0xf2d8bc, 0xec4b94, true);
  date.position.set(6.9, 0.36, 7.2);
  charGroup.add(date);
  state.dateMesh = date;

  const bartender = makePerson(0xf0d8b8, 0x191c24, false);
  bartender.position.set(-8.5, 0.36, 7.1);
  charGroup.add(bartender);
  state.bartenderMesh = bartender;

  const amber = makePerson(0xefd0ad, 0x12151c, false);
  amber.position.set(-3.5, 0.36, -8.7);
  const glasses = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xca8a2b, emissive: 0x5f3610, emissiveIntensity: 0.46 })
  );
  glasses.position.set(0, 1.0, 0.17);
  amber.add(glasses);
  const bikerCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.17, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })
  );
  bikerCap.position.set(0, 1.12, 0);
  amber.add(bikerCap);
  addCigarette(amber, 0.08, 1.02, 0.18);
  addSmokeCloud(amber, 0, 1.5, 0);
  charGroup.add(amber);
  state.amberManMesh = amber;
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
    moveDateTo(-6.5, -6.0);
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
    scene.fog.color.setHex(0x151a23);
    scene.fog.density = 0.045;
  }, 6000);
}

function moveDateTo(x, z) {
  const target = new THREE.Vector3(x, state.dateMesh.position.y, z);
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
  state.player.pos.set(-2.6, 0, 2.8);
  state.player.yaw = Math.PI;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.visible = true;

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

  envGroup.add(makeBox(-1.1, 0.45, 4.8, 5.8, 0.9, 1.2, 0x2e333d, 0.6));
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a97b3, roughness: 0.2, metalness: 0.82 }));
  mirror.position.set(-1.1, 1.64, 4.21); envGroup.add(mirror);
  envGroup.add(makeBox(2.8, 1.3, -2.7, 4.4, 2.6, 0.3, 0x27303f, 0.75));
  const blood = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshStandardMaterial({ color: 0x5a0812, roughness: 0.95 }));
  blood.rotation.x = -Math.PI / 2; blood.position.set(3.3, 0.01, -2.2); envGroup.add(blood);
  charGroup.add(makeCorpse(3.2, 0.12, -2.5));
  const compact = makeBox(3.5, 0.58, -2.45, 0.34, 0.05, 0.34, 0xaeb9d3, 0.24);
  envGroup.add(compact);
  const sinkClue = makeBox(-0.7, 0.93, 4.83, 0.58, 0.04, 0.3, 0xf7f7f7, 0.5);
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
  state.dateMesh.position.set(6.2, 0.36, 5.4);
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
  state.player.mesh.visible = true;

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

  state.dateMesh.position.set(-1, 0.36, -8);
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
  
  
  scene.fog = new THREE.FogExp2(0x151a20, 0.055);
  renderer.setClearColor(0x0e1218, 1);

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
  const lampGlow = new THREE.PointLight(0xffcc88, 0.3, 3, 2);
  lampGlow.position.set(-2.5, 1.2, 1.1); fxGroup.add(lampGlow);

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
  const intruder = makePerson(0xd8c8a0, 0x1a1a1a, false);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  mask.position.y = 0.98; intruder.add(mask);
  intruder.add(makeBox(0.3, 0.65, 0.12, 0.08, 0.05, 0.2, 0x2a2a2a, 0.3));
  intruder.position.set(3.4, 0.36, 2.5);
  intruder.rotation.y = -Math.PI / 2;
  charGroup.add(intruder);
  state.intruderMesh = intruder;

  showDialogue("*BANG BANG BANG* \u2014 Someone\u2019s pounding on the door.", 2500);
  window.setTimeout(() => {
    showDialogueSequence([
      "A masked man kicks the door in, gun drawn.",
      { text: "You: Easy now. Let\u2019s talk about this.", action: () => {
        state.playerCanMove = true;
        setObjective("Get to your gun on the nightstand.", "Use B on the gun holster.");
      }}
    ]);
  }, 3000);

  addInteraction("confront", "B",
    () => state.flags.has("motel-gun") && !state.flags.has("motel-intruder-fled"),
    () => intruder.position, 2.5, () => {
    state.flags.add("motel-intruder-fled");
    state.playerCanMove = false;
    showDialogueSequence([
      "You draw and fire \u2014 the gun flies from his hand.",
      "The masked man stumbles back and bolts out the open door.",
      { text: "You holster your piece. Time to see what\u2019s going on outside.", action: () => {
        state.playerCanMove = true;
        intruder.visible = false;
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

  state.cameraBounds = { minX: -18, maxX: 18, minZ: -6, maxZ: 8, maxY: 8 };
  state.worldBounds = { minX: -16, maxX: 15, minZ: -3.5, maxZ: 4 };

  dom.hudLocation.textContent = "Motel";
  
  scene.fog = new THREE.FogExp2(0x0a0e14, 0.022);
  renderer.setClearColor(0x060a10, 1);

  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.95 }));
  gnd.rotation.x = -Math.PI / 2; envGroup.add(gnd);
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(36, 2.5), new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.85 }));
  sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0.02, -3.5); envGroup.add(sw);
  envGroup.add(makeBox(0, 1.8, -5.8, 36, 3.6, 1.4, 0x2a2420, 0.8));

  for (let i = 0; i < 12; i++) {
    const x = -14 + i * 2.3;
    envGroup.add(makeDoor(x, -5.0, (i === 2) ? 0x5a4a30 : 0x3a2e1e));
    const nl = new THREE.PointLight(0xffe8c0, 0.08, 1.5, 2); nl.position.set(x, 2.6, -4.8); fxGroup.add(nl);
  }
  const r13x = 14;
  envGroup.add(makeDoor(r13x, -5.0, 0x5a4a30));
  const r13l = new THREE.PointLight(0xffe8c0, 0.12, 1.5, 2); r13l.position.set(r13x, 2.6, -4.8); fxGroup.add(r13l);

  envGroup.add(makeBox(-17, 1.8, -4, 2.8, 3.6, 4, 0x2e2820, 0.7));
  envGroup.add(makeDoor(-16.5, -2, 0x483828));
  envGroup.add(makeBox(-17, 3.2, -2, 2.0, 0.4, 0.1, 0x444030, 0.5));

  const sp = makeBox(4, 3.5, 5, 0.15, 5.0, 0.15, 0x4a4a4a, 0.5); envGroup.add(sp);
  const sb = makeBox(4, 6.2, 5, 4.5, 2.0, 0.2, 0x1a1210, 0.5); envGroup.add(sb);
  const sg = new THREE.PointLight(0xff4466, 0.6, 10, 2); sg.position.set(4, 6.8, 5.5); fxGroup.add(sg);
  state.animations.push((dt, t) => { sg.intensity = 0.5 + Math.sin(t * 3) * 0.2; return true; });

  makeSimpleCar(-5, 2, 0x3a2222);
  makeSimpleCar(3, 3, 0x222a3a);

  state.obstacles = [
    makeObstacle(-20, 16, -6.5, -4.2),
    makeObstacle(-6.5, -3.5, 1, 3.5),
    makeObstacle(1.5, 4.5, 2, 4.5)
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
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.03, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xffd892, emissive: 0xffa34d, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.4 })
  );
  ring.rotation.x = Math.PI / 2;
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe0ad, emissive: 0xffb35f, emissiveIntensity: 0.52 })
  );
  dot.position.y = 0.24;
  marker.add(ring, dot);
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
    it.marker.position.set(pos.x, pos.y + 1.4 + Math.sin(elapsed * 2.2) * 0.03, pos.z);
    it.marker.rotation.y += 0.02;
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
  if (!state.playerCanMove || state.evidenceOpen) return;
  const inputX = (state.controls.right ? 1 : 0) - (state.controls.left ? 1 : 0) + state.controls.joyX;
  const inputZ = (state.controls.down ? 1 : 0) - (state.controls.up ? 1 : 0) + state.controls.joyY;
  tempA.set(inputX, 0, inputZ);
  if (tempA.lengthSq() < 0.001) {
    state.player.mesh.position.y = 0;
    if (state.player.leftLeg) state.player.leftLeg.rotation.x = 0;
    if (state.player.rightLeg) state.player.rightLeg.rotation.x = 0;
    if (state.player.leftArm) state.player.leftArm.rotation.x = 0;
    if (state.player.rightArm) state.player.rightArm.rotation.x = 0;
    return;
  }
  tempA.normalize();
  const speed = state.player.seated ? 0 : 3.2;
  const trialX = state.player.pos.x + tempA.x * speed * delta;
  const trialZ = state.player.pos.z + tempA.z * speed * delta;
  if (canMoveTo(trialX, state.player.pos.z)) state.player.pos.x = trialX;
  if (canMoveTo(state.player.pos.x, trialZ)) state.player.pos.z = trialZ;

  const wb = state.worldBounds || { minX: -11.2, maxX: 11.2, minZ: -10.8, maxZ: 10.8 };
  state.player.pos.x = clamp(state.player.pos.x, wb.minX, wb.maxX);
  state.player.pos.z = clamp(state.player.pos.z, wb.minZ, wb.maxZ);
  state.player.yaw = Math.atan2(tempA.x, tempA.z);

  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.position.y = Math.sin(elapsed * 9.2) * 0.02;

  const wp = Math.sin(elapsed * 10) * 0.35;
  if (state.player.leftLeg) state.player.leftLeg.rotation.x = wp;
  if (state.player.rightLeg) state.player.rightLeg.rotation.x = -wp;
  if (state.player.leftArm) state.player.leftArm.rotation.x = -wp * 0.5;
  if (state.player.rightArm) state.player.rightArm.rotation.x = wp * 0.5;
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
    const glow = state.phase === "aftermath" || state.phase === "club-final" ? 0.06 : 0.2 + Math.max(0, Math.sin(elapsed * 2.4 + tile.phase)) * 0.56;
    tile.mesh.material.emissiveIntensity = glow;
  }
  for (const smoke of state.smoke) {
    smoke.position.addScaledVector(smoke.userData.velocity, delta * 0.8);
    smoke.position.y += delta * 0.25;
    if (smoke.position.y > 3.8) {
      smoke.position.y = 0.3;
      smoke.position.x = -9.5 + Math.random() * 5.4;
      smoke.position.z = -8.9 + Math.random() * 4.9;
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
  let desired, lerpSpeed;
  if (state.player.seated) {
    desired = tempA.set(state.player.pos.x - 3.0, state.player.pos.y + 4.5, state.player.pos.z - 4.0);
    lerpSpeed = 3.0;
  } else {
    const bd = 6.5, h = 4.0;
    const ox = Math.sin(state.player.yaw) * bd;
    const oz = Math.cos(state.player.yaw) * bd;
    desired = tempA.set(state.player.pos.x - ox, state.player.pos.y + h, state.player.pos.z - oz);
    lerpSpeed = 6.0;
  }
  if (state.cameraBounds) {
    const b = state.cameraBounds;
    desired.x = clamp(desired.x, b.minX, b.maxX);
    desired.y = clamp(desired.y, 0.5, b.maxY);
    desired.z = clamp(desired.z, b.minZ, b.maxZ);
  }
  camera.position.lerp(desired, 1 - Math.exp(-delta * lerpSpeed));
  tempB.set(state.player.pos.x, state.player.pos.y + 1.15, state.player.pos.z);
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
  const colors = [0xff3f5f, 0x45d7ff, 0xffcc4d];
  for (let i = 0; i < colors.length; i += 1) {
    const light = new THREE.PointLight(colors[i], 0.9, 8.5, 2);
    const originX = -8.6 + i * 1.2;
    const originZ = -8.8 + (i % 2 ? 0.6 : -0.4);
    light.position.set(originX, 4.3, originZ);
    scene.add(light);
    fxGroup.add(light);
    state.cabaretLights.push({ light, originX, originZ, angle: Math.random() * Math.PI * 2 });
  }
}

function addSmoke() {
  state.smoke = [];
  for (let i = 0; i < 30; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xb8c1d6, transparent: true, opacity: 0.04 + Math.random() * 0.04 })
    );
    puff.position.set(-9.4 + Math.random() * 5.4, 1.2 + Math.random() * 2.0, -8.8 + Math.random() * 4.8);
    puff.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.03, Math.random() * 0.01, (Math.random() - 0.5) * 0.03);
    fxGroup.add(puff);
    state.smoke.push(puff);
  }
}

function makePerson(skin, outfit, female) {
  const root = new THREE.Group();
  const om = new THREE.MeshStandardMaterial({ color: outfit, roughness: 0.44, metalness: 0.08 });
  const sm = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.42 });
  const hm = new THREE.MeshStandardMaterial({ color: darkenColor(skin, 0.32), roughness: 0.65 });
  const pm = new THREE.MeshStandardMaterial({ color: darkenColor(outfit, 0.8), roughness: 0.5 });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), sm);
  neck.position.y = 0.92;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), sm);
  head.position.y = 1.06; head.scale.set(0.95, 1.08, 0.9);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.04), sm);
  nose.position.set(0, 1.05, 0.12);

  if (female) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 0.48, 10), om);
    skirt.position.y = 0.26;
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.14, 8), om);
    waist.position.y = 0.56;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.18), om);
    chest.position.y = 0.74;
    const hairBack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.4, 10), hm);
    hairBack.position.set(0, 0.92, -0.04);
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hm);
    hairTop.position.y = 1.1;
    const la = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.24, 6), sm);
    la.position.set(-0.18, 0.72, 0); la.rotation.z = 0.15;
    const lfa = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.2, 6), sm);
    lfa.position.set(-0.2, 0.52, 0); lfa.rotation.z = 0.08;
    const ra = la.clone(); ra.position.set(0.18, 0.72, 0); ra.rotation.z = -0.15;
    const rfa = lfa.clone(); rfa.position.set(0.2, 0.52, 0); rfa.rotation.z = -0.08;
    root.add(skirt, waist, chest, neck, head, nose, hairBack, hairTop, la, lfa, ra, rfa);
  } else {
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.2), om);
    chest.position.y = 0.76;
    const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.16, 8), om);
    abdomen.position.y = 0.56;
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.18), pm);
    pelvis.position.y = 0.44;
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.48), hm);
    hairCap.position.y = 1.1;
    const la = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.22, 6), om);
    la.position.set(-0.23, 0.76, 0); la.rotation.z = 0.12;
    const lfa = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, 6), om);
    lfa.position.set(-0.26, 0.55, 0); lfa.rotation.z = 0.06;
    const lh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), sm);
    lh.position.set(-0.27, 0.43, 0);
    const ra = la.clone(); ra.position.set(0.23, 0.76, 0); ra.rotation.z = -0.12;
    const rfa = lfa.clone(); rfa.position.set(0.26, 0.55, 0); rfa.rotation.z = -0.06;
    const rh = lh.clone(); rh.position.set(0.27, 0.43, 0);
    const lt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.22, 8), pm);
    lt.position.set(-0.08, 0.3, 0);
    const ls = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.22, 8), pm);
    ls.position.set(-0.08, 0.1, 0);
    const lsh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.12), new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.3 }));
    lsh.position.set(-0.08, 0.0, 0.01);
    const rt = lt.clone(); rt.position.set(0.08, 0.3, 0);
    const rs = ls.clone(); rs.position.set(0.08, 0.1, 0);
    const rsh = lsh.clone(); rsh.position.set(0.08, 0.0, 0.01);
    root.add(chest, abdomen, pelvis, neck, head, nose, hairCap, la, lfa, lh, ra, rfa, rh, lt, ls, lsh, rt, rs, rsh);
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
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.4), new THREE.MeshStandardMaterial({ color: 0xc4ccd8, roughness: 0.55 }));
  torso.rotation.z = 0.3;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe7ccb0, roughness: 0.45 }));
  head.position.set(0.63, 0.04, 0);
  body.add(torso, head);
  body.position.set(x, y, z);
  return body;
}

function makeObstacle(minX, maxX, minZ, maxZ) {
  return { minX, maxX, minZ, maxZ };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
