import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";

const dom = {
  titleScreen: document.getElementById("title-screen"),
  tapPrompt: document.getElementById("tap-prompt"),
  skipIntroBtn: document.getElementById("skip-intro-btn"),
  typewriterScreen: document.getElementById("typewriter-screen"),
  typewriterText: document.getElementById("typewriter-text"),
  gameScreen: document.getElementById("game-screen"),
  canvas: document.getElementById("game-canvas"),
  locationLabel: document.getElementById("location-label"),
  timeLabel: document.getElementById("time-label"),
  musicLabel: document.getElementById("music-label"),
  promptBox: document.getElementById("prompt-box"),
  objectiveLabel: document.getElementById("objective-label"),
  hintLabel: document.getElementById("hint-label"),
  dialogueBox: document.getElementById("dialogue-box"),
  choiceBox: document.getElementById("choice-box"),
  choice1: document.getElementById("choice-1"),
  choice2: document.getElementById("choice-2"),
  evidenceOverlay: document.getElementById("evidence-overlay"),
  evidenceTitle: document.getElementById("evidence-title"),
  evidenceText: document.getElementById("evidence-text"),
  closeEvidenceBtn: document.getElementById("close-evidence-btn"),
  joystick: document.getElementById("joystick"),
  joystickKnob: document.getElementById("joystick-knob"),
  buttonA: document.getElementById("btn-a"),
  buttonB: document.getElementById("btn-b"),
  replayIntroBtn: document.getElementById("replay-intro-btn")
};

const clock = new THREE.Clock();
const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  alpha: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a090b, 16, 46);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
camera.position.set(0, 17.5, 19);
camera.lookAt(0, 0, 0);

const ambient = new THREE.AmbientLight(0x564f58, 0.62);
const keyLight = new THREE.DirectionalLight(0xffd6a5, 1.05);
const fillLight = new THREE.DirectionalLight(0x87b4ff, 0.52);
keyLight.position.set(7, 15, 9);
fillLight.position.set(-9, 13, -7);
scene.add(ambient, keyLight, fillLight);

const world = new THREE.Group();
const envGroup = new THREE.Group();
const npcGroup = new THREE.Group();
const propGroup = new THREE.Group();
const fxGroup = new THREE.Group();
const playerGroup = new THREE.Group();
world.add(envGroup, npcGroup, propGroup, fxGroup, playerGroup);
scene.add(world);

const tempVecA = new THREE.Vector3();
const tempVecB = new THREE.Vector3();
const tempVecC = new THREE.Vector3();

const state = {
  booted: false,
  introStarted: false,
  cameraOffset: new THREE.Vector3(0, 17.5, 19),
  cameraLookY: 0.9,
  chapter: "none",
  phase: "",
  playerCanMove: false,
  playerSeated: true,
  playerBounds: { minX: -12, maxX: 12, minZ: -12, maxZ: 12 },
  interactions: [],
  nearestInteraction: null,
  baseHint: "Move with joystick / WASD. E/Enter = Interact, B/Space = Action.",
  joysticVec: { x: 0, y: 0 },
  joystickActive: false,
  keyState: {
    up: false,
    down: false,
    left: false,
    right: false,
    aHeld: false,
    bHeld: false,
    aQueued: false,
    bQueued: false
  },
  dialogueTimer: null,
  choiceVisible: false,
  evidenceOpen: false,
  evidenceReturnMoveState: false,
  animations: [],
  smokeParticles: [],
  danceTiles: [],
  chapterMeshes: {},
  flags: new Set(),
  intruder: null,
  intruderActive: false,
  drive: {
    active: false,
    lanes: [-3.2, 0, 3.2],
    laneIndex: 1,
    laneCooldown: 0,
    timer: 0,
    spawnTimer: 0,
    traffic: [],
    carMesh: null,
    finished: false
  },
  music: null
};

const INTRO_TEXT = [
  "Nightclub interior.",
  "Little Italy.",
  "Summer 1979. 11:54 PM."
].join("\n");

initPlayerMesh();
attachCoreHandlers();
syncSize();
window.addEventListener("resize", syncSize);

function attachCoreHandlers() {
  const beginIntro = () => {
    if (state.introStarted) {
      return;
    }
    state.introStarted = true;
    runIntro();
  };

  addPressHandlers(dom.titleScreen, beginIntro);
  dom.skipIntroBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    beginIntro();
  });
  dom.replayIntroBtn.addEventListener("click", () => {
    state.introStarted = false;
    dom.gameScreen.classList.add("hidden");
    dom.typewriterScreen.classList.add("hidden");
    dom.titleScreen.classList.remove("hidden");
  });
  dom.closeEvidenceBtn.addEventListener("click", closeEvidence);

  const keyMap = {
    w: "up",
    W: "up",
    ArrowUp: "up",
    s: "down",
    S: "down",
    ArrowDown: "down",
    a: "left",
    A: "left",
    ArrowLeft: "left",
    d: "right",
    D: "right",
    ArrowRight: "right",
    e: "a",
    E: "a",
    b: "b",
    B: "b",
    Enter: "a",
    " ": "b",
    j: "a",
    J: "a",
    k: "b",
    K: "b"
  };

  window.addEventListener("keydown", (event) => {
    const mapped = keyMap[event.key];
    if (!mapped) {
      return;
    }
    if (mapped === "a" || mapped === "b") {
      queueActionKey(mapped, { hold: true });
    } else {
      state.keyState[mapped] = true;
    }
    if (mapped === "a" || mapped === "b" || event.key.startsWith("Arrow")) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    const mapped = keyMap[event.key];
    if (!mapped) {
      return;
    }
    if (mapped === "a") {
      state.keyState.aHeld = false;
    } else if (mapped === "b") {
      state.keyState.bHeld = false;
    } else {
      state.keyState[mapped] = false;
    }
    if (mapped === "a" || mapped === "b" || event.key.startsWith("Arrow")) {
      event.preventDefault();
    }
  });

  addPressHandlers(dom.buttonA, () => {
    queueActionKey("a", { hold: false });
  });
  addPressHandlers(dom.buttonB, () => {
    queueActionKey("b", { hold: false });
  });

  const quickActivateNearest = () => {
    if (state.choiceVisible) {
      return;
    }
    if (state.evidenceOpen) {
      closeEvidence();
      return;
    }
    if (!state.nearestInteraction) {
      return;
    }
    tryActivate(state.nearestInteraction.key);
  };
  addPressHandlers(dom.canvas, quickActivateNearest, { maxFreqMs: 220 });
  addPressHandlers(dom.promptBox, quickActivateNearest, { maxFreqMs: 220 });

  setupJoystick();
}

function queueActionKey(key, options = {}) {
  const opts = { hold: true, ...options };
  if (key === "a") {
    if (!state.keyState.aHeld || !opts.hold) {
      state.keyState.aQueued = true;
    }
    if (opts.hold) {
      state.keyState.aHeld = true;
    }
    return;
  }
  if (!state.keyState.bHeld || !opts.hold) {
    state.keyState.bQueued = true;
  }
  if (opts.hold) {
    state.keyState.bHeld = true;
  }
}

function addPressHandlers(element, handler, options = {}) {
  if (!element || !handler) {
    return;
  }
  const opts = { maxFreqMs: 140, ...options };
  let lastPressedAt = 0;
  const trigger = (event) => {
    if (event && event.cancelable) {
      event.preventDefault();
    }
    const now = performance.now();
    if (now - lastPressedAt < opts.maxFreqMs) {
      return;
    }
    lastPressedAt = now;
    handler(event);
  };
  element.addEventListener("pointerdown", trigger);
  element.addEventListener("touchstart", trigger, { passive: false });
  element.addEventListener("mousedown", trigger);
  element.addEventListener("click", trigger);
}

function setupJoystick() {
  const joy = dom.joystick;
  const knob = dom.joystickKnob;
  if (!joy || !knob) {
    return;
  }

  const setKnob = (x, y) => {
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  };

  const updateFromPoint = (clientX, clientY) => {
    const rect = joy.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const max = rect.width * 0.31;
    const dist = Math.hypot(dx, dy);
    const clamped = dist > max ? max / dist : 1;
    const nx = dx * clamped;
    const ny = dy * clamped;
    state.joysticVec.x = nx / max;
    state.joysticVec.y = ny / max;
    setKnob(nx, ny);
  };

  let activePointerId = null;
  const startJoystick = (clientX, clientY) => {
    state.joystickActive = true;
    updateFromPoint(clientX, clientY);
  };

  joy.addEventListener("pointerdown", (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    activePointerId = event.pointerId;
    if (typeof joy.setPointerCapture === "function") {
      try {
        joy.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore capture failures on inconsistent mobile implementations.
      }
    }
    startJoystick(event.clientX, event.clientY);
  });

  joy.addEventListener("pointermove", (event) => {
    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }
    if (!state.joystickActive) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    updateFromPoint(event.clientX, event.clientY);
  });

  const clear = () => {
    activePointerId = null;
    state.joystickActive = false;
    state.joysticVec.x = 0;
    state.joysticVec.y = 0;
    setKnob(0, 0);
  };

  joy.addEventListener("pointerup", clear);
  joy.addEventListener("pointercancel", clear);
  joy.addEventListener("pointerleave", clear);

  joy.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }
      startJoystick(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  joy.addEventListener(
    "touchmove",
    (event) => {
      if (!state.joystickActive) {
        return;
      }
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }
      updateFromPoint(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  joy.addEventListener(
    "touchend",
    (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      clear();
    },
    { passive: false }
  );
  joy.addEventListener(
    "touchcancel",
    (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      clear();
    },
    { passive: false }
  );

  let mouseActive = false;
  joy.addEventListener("mousedown", (event) => {
    if ("PointerEvent" in window) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    mouseActive = true;
    startJoystick(event.clientX, event.clientY);
  });
  window.addEventListener("mousemove", (event) => {
    if (!mouseActive) {
      return;
    }
    updateFromPoint(event.clientX, event.clientY);
  });
  window.addEventListener("mouseup", () => {
    if (!mouseActive) {
      return;
    }
    mouseActive = false;
    clear();
  });
}

async function runIntro() {
  dom.tapPrompt.textContent = "LOADING CASE FILE...";
  await fadeOutTitle();
  await runTypewriterCard(INTRO_TEXT);
  startGame();
}

function fadeOutTitle() {
  return new Promise((resolve) => {
    dom.titleScreen.style.transition = "opacity 700ms ease";
    dom.titleScreen.style.opacity = "0";
    window.setTimeout(() => {
      dom.titleScreen.classList.add("hidden");
      dom.titleScreen.style.opacity = "1";
      dom.titleScreen.style.transition = "";
      resolve();
    }, 730);
  });
}

function runTypewriterCard(text) {
  return new Promise((resolve) => {
    dom.typewriterScreen.classList.remove("hidden");
    dom.typewriterText.textContent = "";
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      dom.typewriterText.textContent = text.slice(0, index);
      if (index >= text.length) {
        window.clearInterval(timer);
        window.setTimeout(() => {
          dom.typewriterScreen.classList.add("hidden");
          resolve();
        }, 1050);
      }
    }, 37);
  });
}

function startGame() {
  if (!state.booted) {
    state.booted = true;
    animate();
  }
  dom.gameScreen.classList.remove("hidden");
  startMusic();
  loadNightclubChapter();
}

async function startMusic() {
  if (state.music && !state.music.paused) {
    return;
  }

  const candidates = ["songs/nightclub.mp3", "music/nightclub.mp3"];
  const audio = state.music || new Audio();
  state.music = audio;
  audio.loop = true;
  audio.volume = 0.66;

  for (const source of candidates) {
    const loaded = await loadAudioSource(audio, source);
    if (!loaded) {
      continue;
    }
    try {
      await audio.play();
      dom.musicLabel.textContent = `Music: Daddy Cool (${source})`;
      return;
    } catch (error) {
      // Try next source.
    }
  }

  dom.musicLabel.textContent = "Music: add songs/nightclub.mp3 to enable soundtrack";
}

function loadAudioSource(audio, source) {
  return new Promise((resolve) => {
    let done = false;
    const clear = () => {
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onError);
    };
    const onReady = () => {
      if (done) {
        return;
      }
      done = true;
      clear();
      resolve(true);
    };
    const onError = () => {
      if (done) {
        return;
      }
      done = true;
      clear();
      resolve(false);
    };
    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.src = source;
    audio.load();
    window.setTimeout(() => {
      if (!done) {
        done = true;
        clear();
        resolve(false);
      }
    }, 2600);
  });
}

function initPlayerMesh() {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.27, 0.96, 10),
    new THREE.MeshStandardMaterial({ color: 0x23242b, roughness: 0.46, metalness: 0.08 })
  );
  body.position.y = 0.58;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2d8b9, roughness: 0.42, metalness: 0.02 })
  );
  head.position.y = 1.2;
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.035, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0xbca482, roughness: 0.35, metalness: 0.15 })
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.85;
  playerGroup.add(body, head, collar);
}

function loadNightclubChapter() {
  resetChapterWorld();
  state.chapter = "nightclub";
  state.phase = "seated";
  state.playerCanMove = false;
  state.playerSeated = true;
  state.intruderActive = false;
  state.flags.delete("date-danced");
  state.flags.delete("club-aftermath");
  state.playerBounds = { minX: -10.8, maxX: 10.8, minZ: -10.2, maxZ: 10.2 };
  state.cameraOffset.set(0, 15.5, 16.8);
  state.cameraLookY = 0.72;

  dom.locationLabel.textContent = "Nightclub interior - Little Italy";
  dom.timeLabel.textContent = "Summer 1979 - 11:54 PM";
  setObjective("Seated at your table. Press A to talk or B to stand up.", "Move with joystick / WASD after standing.");

  renderer.setClearColor(0x08070b, 1);
  scene.fog = new THREE.Fog(0x09070a, 15, 40);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshStandardMaterial({ color: 0x12090b, roughness: 0.9, metalness: 0.03 })
  );
  floor.rotation.x = -Math.PI / 2;
  envGroup.add(floor);

  const danceArea = new THREE.Mesh(
    new THREE.PlaneGeometry(8.4, 8.4),
    new THREE.MeshStandardMaterial({ color: 0x1b0f14, roughness: 0.8, metalness: 0.08 })
  );
  danceArea.rotation.x = -Math.PI / 2;
  danceArea.position.set(-6.2, 0.01, -6.4);
  envGroup.add(danceArea);

  const danceColors = [0xff2e2e, 0x2f68ff, 0xffe43d, 0xf6f8ff];
  state.danceTiles = [];
  for (let gx = 0; gx < 4; gx += 1) {
    for (let gz = 0; gz < 4; gz += 1) {
      const color = danceColors[(gx + gz) % danceColors.length];
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.08, 1.8),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.33,
          roughness: 0.28,
          metalness: 0.2
        })
      );
      tile.position.set(-8.9 + gx * 1.8, 0.05, -8.9 + gz * 1.8);
      envGroup.add(tile);
      state.danceTiles.push({ mesh: tile, phase: Math.random() * Math.PI * 2 });
    }
  }

  const stage = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.6, 4.6),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.52, metalness: 0.2 })
  );
  stage.position.set(-8.8, 0.3, -10);
  envGroup.add(stage);
  envGroup.add(makeSpeaker(-10.9, 0, -9.1));
  envGroup.add(makeSpeaker(-6.7, 0, -9.1));
  envGroup.add(makeFrontman(-8.7, 0.3, -10.1));
  envGroup.add(makeDrummer(-9.6, 0.3, -11.0));

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.4, 15.5),
    new THREE.MeshStandardMaterial({ color: 0x171116, roughness: 0.78, metalness: 0.05 })
  );
  platform.position.set(4.9, 0.2, 0.4);
  envGroup.add(platform);

  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 14.8),
    new THREE.MeshStandardMaterial({ color: 0x6f0710, roughness: 0.88, metalness: 0.02 })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(4.9, 0.41, 0.4);
  envGroup.add(carpet);

  const tablePositions = [
    [4.4, 0.4, -4.7],
    [6.6, 0.4, -1.5],
    [4.2, 0.4, 1.8],
    [7.5, 0.4, 5.2]
  ];
  tablePositions.forEach((position, index) => {
    const tableSet = makeTableSet(position[0], position[1], position[2]);
    envGroup.add(tableSet.group);
    if (index < 3) {
      npcGroup.add(makeCouple(position[0], position[1] + 0.45, position[2], index));
    }
  });

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(4.3, 1.2, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x4a2814, roughness: 0.62, metalness: 0.18 })
  );
  bar.position.set(-8.2, 0.6, 8.2);
  envGroup.add(bar);

  const entrance = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 3.1, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x170f14, roughness: 0.71 })
  );
  entrance.position.set(0, 1.55, 10.5);
  envGroup.add(entrance);

  const restroomWall = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 3.4, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x190f15, roughness: 0.68 })
  );
  restroomWall.position.set(-0.5, 1.7, -10.4);
  envGroup.add(restroomWall);
  const womensDoor = makeDoor(1.2, 1.35, -10.2, 0xa71e3f);
  const mensDoor = makeDoor(-3.2, 1.35, -10.2, 0xa67a17);
  envGroup.add(womensDoor, mensDoor);

  const bartender = makeHuman(0xefe8e0, 0x1f1f24, "male");
  bartender.position.set(-8.2, 0.45, 7.2);
  npcGroup.add(bartender);
  state.chapterMeshes.bartender = bartender;

  const amberMan = makeAmberMan();
  amberMan.position.set(-3.3, 0.48, -8.6);
  npcGroup.add(amberMan);
  state.chapterMeshes.amberMan = amberMan;

  const date = makeHuman(0xffd5ca, 0xf35b9b, "female");
  date.position.set(6.8, 0.45, 7.4);
  npcGroup.add(date);
  state.chapterMeshes.date = date;

  playerGroup.position.set(8, 0, 8.1);
  playerGroup.rotation.y = -Math.PI / 2;

  buildSmokeVolume();
  addNightclubInteractions(womensDoor.position, mensDoor.position);
}

function addNightclubInteractions(womensDoorPosition, mensDoorPosition) {
  const dateMesh = state.chapterMeshes.date;
  const amberMan = state.chapterMeshes.amberMan;
  const bartender = state.chapterMeshes.bartender;

  addInteraction({
    id: "talk-date-seat",
    label: "Talk to your date",
    key: "A",
    mesh: dateMesh,
    radius: 1.7,
    enabled: () => state.phase === "seated",
    onActivate: () => {
      showDialogue("Date: I love this song!", 1800);
    }
  });

  addInteraction({
    id: "stand-up",
    label: "Stand and move",
    key: "B",
    mesh: dateMesh,
    radius: 1.8,
    enabled: () => state.phase === "seated",
    onActivate: () => {
      state.phase = "explore-club";
      state.playerCanMove = true;
      state.playerSeated = false;
      setObjective("Walk to the bar and press A to talk to the bartender.", "A = interact, B = action.");
      showDialogue("You stand. Smoke and synth bass roll across the room.", 2400);
    }
  });

  addInteraction({
    id: "amber-guy",
    label: "Confront amber-shades man",
    key: "B",
    mesh: amberMan,
    radius: 1.6,
    enabled: () => state.phase === "explore-club" || state.phase === "dance-invite",
    onActivate: () => {
      showDialogue("...", 1300);
    }
  });

  addInteraction({
    id: "talk-bartender",
    label: "Talk to bartender",
    key: "A",
    mesh: bartender,
    radius: 1.85,
    enabled: () => state.phase === "explore-club",
    onActivate: () => {
      state.phase = "dance-invite";
      setObjective("Your date moved to the floor. Press A at the dance floor to dance.", "Dance floor is left side under strobe lights.");
      showDialogue("Date: Hey detective, dance with me before this song dies.", 3200);
      moveDateTo(-6.4, -5.5);
    }
  });

  addInteraction({
    id: "dance-floor",
    label: "Dance with your date",
    key: "A",
    position: new THREE.Vector3(-6.3, 0, -6.2),
    radius: 2.1,
    enabled: () => state.phase === "dance-invite",
    onActivate: () => {
      startDanceSequence();
    }
  });

  addInteraction({
    id: "enter-womens-room",
    label: "Enter women's room",
    key: "A",
    position: womensDoorPosition.clone(),
    radius: 1.6,
    enabled: () => state.phase === "scream-aftermath",
    onActivate: () => {
      loadWomensRoomChapter();
    }
  });

  addInteraction({
    id: "enter-mens-room",
    label: "Enter men's room",
    key: "A",
    position: mensDoorPosition.clone(),
    radius: 1.6,
    enabled: () => state.phase === "club-after-bathroom",
    onActivate: () => {
      loadMensRoomChapter();
    }
  });

  addInteraction({
    id: "date-after-bathroom",
    label: "Talk to your date",
    key: "A",
    mesh: dateMesh,
    radius: 2.0,
    enabled: () => state.phase === "club-after-bathroom" || state.phase === "club-after-mensroom",
    onActivate: () => {
      if (state.phase === "club-after-bathroom") {
        showDialogue(
          "Date: I just went in with all the drinks... and then I saw all the... is she actually dead?\n\nYou: It wasn't her time of the month.\nDate: Can we go home?\nYou: Let me just use the men's room real quick.",
          8000
        );
        setObjective("Use the men's room before you leave.", "Door is to the back wall.");
      } else {
        showDialogue(
          "Date: Encounter anything?\n\nYou: Nothing out of place. Just a little matter between men. We can go now.",
          5200
        );
        state.playerCanMove = false;
        window.setTimeout(() => {
          loadMotelRoomChapter();
        }, 3400);
      }
    }
  });
}

function startDanceSequence() {
  if (state.flags.has("date-danced")) {
    return;
  }
  state.flags.add("date-danced");
  state.phase = "dancing";
  state.playerCanMove = false;
  showDialogue("You dance until the song buckles into the next groove.", 3200);
  window.setTimeout(() => {
    showDialogue("Date: I need to visit the bathroom to powder my nose.", 2800);
  }, 3400);
  window.setTimeout(() => {
    state.phase = "scream-aftermath";
    setObjective("A scream silenced the room. Enter the women's room and inspect.", "Move to the red door on the back wall and press A.");
    state.playerCanMove = true;
    scene.fog.color.setHex(0x111215);
    showDialogue("A scream silences the club. She runs out. The floor lights sputter.", 3600);
  }, 6600);
}

function moveDateTo(x, z) {
  const date = state.chapterMeshes.date;
  if (!date) {
    return;
  }
  const target = new THREE.Vector3(x, date.position.y, z);
  const moveAnim = (delta) => {
    const dist = date.position.distanceTo(target);
    if (dist < 0.1) {
      return false;
    }
    tempVecA.copy(target).sub(date.position).normalize();
    date.position.addScaledVector(tempVecA, delta * 1.85);
    date.rotation.y = Math.atan2(tempVecA.x, tempVecA.z);
    return true;
  };
  state.animations.push(moveAnim);
}

function loadWomensRoomChapter() {
  resetChapterWorld();
  state.chapter = "womens-room";
  state.phase = "inspect";
  state.playerCanMove = true;
  state.playerSeated = false;
  state.playerBounds = { minX: -6.6, maxX: 6.6, minZ: -5.8, maxZ: 5.8 };
  state.cameraOffset.set(0, 11.6, 12.5);
  state.cameraLookY = 0.8;
  dom.locationLabel.textContent = "Women's powder room";
  dom.timeLabel.textContent = "Nightclub back hall - moments later";
  setObjective("Inspect compact mirror and sink counter evidence.", "Press B on evidence nodes, then exit.");
  renderer.setClearColor(0x0d1116, 1);
  scene.fog = new THREE.Fog(0x12171e, 10, 30);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.75 })
  );
  floor.rotation.x = -Math.PI / 2;
  envGroup.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x29313d, roughness: 0.86 });
  envGroup.add(makeWall(0, 1.6, -6, 14, 3.2, 0.35, wallMaterial));
  envGroup.add(makeWall(0, 1.6, 6, 14, 3.2, 0.35, wallMaterial));
  envGroup.add(makeWall(-7, 1.6, 0, 0.35, 3.2, 12, wallMaterial));
  envGroup.add(makeWall(7, 1.6, 0, 0.35, 3.2, 12, wallMaterial));

  const sinkCounter = new THREE.Mesh(
    new THREE.BoxGeometry(5.8, 0.9, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.55, metalness: 0.15 })
  );
  sinkCounter.position.set(-1.1, 0.45, 4.8);
  envGroup.add(sinkCounter);

  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x7f8ca3, roughness: 0.18, metalness: 0.8 })
  );
  mirror.position.set(-1.1, 1.65, 4.2);
  envGroup.add(mirror);

  const stallWall = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x242a34, roughness: 0.75 })
  );
  stallWall.position.set(2.6, 1.3, -2.5);
  envGroup.add(stallWall);

  const bloodPool = new THREE.Mesh(
    new THREE.CircleGeometry(0.88, 20),
    new THREE.MeshStandardMaterial({ color: 0x5f0811, roughness: 0.95 })
  );
  bloodPool.rotation.x = -Math.PI / 2;
  bloodPool.position.set(3.2, 0.01, -2.2);
  envGroup.add(bloodPool);

  const body = makeCorpse(3.1, 0.15, -2.55);
  npcGroup.add(body);

  const mirrorClue = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.05, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xb2bed6, roughness: 0.2, metalness: 0.65 })
  );
  mirrorClue.position.set(3.55, 0.6, -2.45);
  propGroup.add(mirrorClue);

  const sinkClue = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.04, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.45 })
  );
  sinkClue.position.set(-0.6, 0.95, 4.85);
  propGroup.add(sinkClue);

  const razorClue = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.04, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xa8b5ca, roughness: 0.26, metalness: 0.8 })
  );
  razorClue.position.set(-1.25, 0.95, 4.65);
  propGroup.add(razorClue);

  playerGroup.position.set(-2.4, 0, 4.9);
  playerGroup.rotation.y = Math.PI;

  addInteraction({
    id: "corpse-compact",
    label: "Inspect compact mirror",
    key: "B",
    mesh: mirrorClue,
    radius: 1.4,
    enabled: () => !state.flags.has("clue-compact"),
    onActivate: () => {
      state.flags.add("clue-compact");
      openEvidence(
        "Compact mirror",
        "Hmm... she could have been too busy minding her nose to notice the dealer of her last blowline."
      );
      updateBathroomObjective();
    }
  });

  addInteraction({
    id: "sink-evidence",
    label: "Inspect sink evidence",
    key: "B",
    mesh: sinkClue,
    radius: 1.5,
    enabled: () => !state.flags.has("clue-sink"),
    onActivate: () => {
      state.flags.add("clue-sink");
      openEvidence(
        "Mirror lines and razor",
        "Fresh white lines on the panoramic mirror. A blooded razor blade sits by the sink."
      );
      updateBathroomObjective();
    }
  });

  addInteraction({
    id: "exit-bathroom",
    label: "Exit powder room",
    key: "A",
    position: new THREE.Vector3(-5.8, 0, 0),
    radius: 1.8,
    enabled: () => state.flags.has("clue-compact") && state.flags.has("clue-sink"),
    onActivate: () => {
      state.flags.add("club-aftermath");
      loadNightclubAftermathChapter();
    }
  });
}

function updateBathroomObjective() {
  const compact = state.flags.has("clue-compact");
  const sink = state.flags.has("clue-sink");
  if (compact && sink) {
    setObjective("Evidence logged. Exit the powder room.", "Press A at the door to return to your date.");
  } else {
    const count = Number(compact) + Number(sink);
    setObjective(`Inspect clues in the powder room (${count}/2).`, "Use B on compact mirror and sink counter.");
  }
}

function loadNightclubAftermathChapter() {
  loadNightclubChapter();
  state.phase = "club-after-bathroom";
  state.playerCanMove = true;
  state.playerSeated = false;
  dom.locationLabel.textContent = "Nightclub interior - lights up";
  dom.timeLabel.textContent = "After the scream";
  setObjective("Rejoin your date and assess what happened.", "Press A near your date.");

  scene.fog = new THREE.Fog(0x1a2028, 12, 26);
  renderer.setClearColor(0x151920, 1);

  for (const tile of state.danceTiles) {
    tile.mesh.material.emissiveIntensity = 0.06;
  }

  const date = state.chapterMeshes.date;
  if (date) {
    date.position.set(6.4, date.position.y, 5.4);
  }
  playerGroup.position.set(4.4, 0, 4.9);
}

function loadMensRoomChapter() {
  resetChapterWorld();
  state.chapter = "mens-room";
  state.phase = "inspect-stalls";
  state.playerCanMove = true;
  state.playerBounds = { minX: -5.8, maxX: 5.8, minZ: -5.2, maxZ: 5.2 };
  state.cameraOffset.set(0, 10.5, 11.3);
  state.cameraLookY = 0.8;
  dom.locationLabel.textContent = "Men's room";
  dom.timeLabel.textContent = "Nightclub - same night";
  setObjective("Check both stalls, then return to your date.", "A interacts with doors and fixtures.");
  renderer.setClearColor(0x121419, 1);
  scene.fog = new THREE.Fog(0x151922, 9, 24);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 10),
    new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.72 })
  );
  floor.rotation.x = -Math.PI / 2;
  envGroup.add(floor);
  envGroup.add(makeWall(0, 1.6, -5, 12, 3.2, 0.35, new THREE.MeshStandardMaterial({ color: 0x2c3442, roughness: 0.84 })));
  envGroup.add(makeWall(0, 1.6, 5, 12, 3.2, 0.35, new THREE.MeshStandardMaterial({ color: 0x2c3442, roughness: 0.84 })));
  envGroup.add(makeWall(-6, 1.6, 0, 0.35, 3.2, 10, new THREE.MeshStandardMaterial({ color: 0x2c3442, roughness: 0.84 })));
  envGroup.add(makeWall(6, 1.6, 0, 0.35, 3.2, 10, new THREE.MeshStandardMaterial({ color: 0x2c3442, roughness: 0.84 })));

  const stall1 = makeDoor(-1.7, 1.25, -3.8, 0x7f95ba);
  const stall2 = makeDoor(1.7, 1.25, -3.8, 0x7f95ba);
  envGroup.add(stall1, stall2);

  const urinal1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xc7d2e4, roughness: 0.35 })
  );
  urinal1.position.set(-3.4, 0.8, 3.8);
  envGroup.add(urinal1);
  const urinal2 = urinal1.clone();
  urinal2.position.x = -2;
  envGroup.add(urinal2);

  playerGroup.position.set(0, 0, 4.3);
  playerGroup.rotation.y = Math.PI;
  state.flags.delete("mens-stall-1");
  state.flags.delete("mens-stall-2");

  addInteraction({
    id: "stall-1",
    label: "Open first stall",
    key: "A",
    mesh: stall1,
    radius: 1.6,
    enabled: () => true,
    onActivate: () => {
      state.flags.add("mens-stall-1");
      showDialogue("Empty.", 1400);
      updateMensObjective();
    }
  });

  addInteraction({
    id: "stall-2",
    label: "Open second stall",
    key: "A",
    mesh: stall2,
    radius: 1.6,
    enabled: () => true,
    onActivate: () => {
      if (state.flags.has("mens-stall-2")) {
        showDialogue("No motive here. Just an opportunity.", 1800);
        return;
      }
      state.flags.add("mens-stall-2");
      showDialogue("Apologies, guys.\nNo motive here. Just an opportunity.", 3200);
      updateMensObjective();
    }
  });

  addInteraction({
    id: "exit-mens-room",
    label: "Exit men's room",
    key: "A",
    position: new THREE.Vector3(5.4, 0, 0),
    radius: 1.8,
    enabled: () => state.flags.has("mens-stall-1") && state.flags.has("mens-stall-2"),
    onActivate: () => {
      loadNightclubAfterMensRoom();
    }
  });
}

function updateMensObjective() {
  const count = Number(state.flags.has("mens-stall-1")) + Number(state.flags.has("mens-stall-2"));
  if (count >= 2) {
    setObjective("Both stalls checked. Exit and rejoin your date.", "Press A near the exit.");
  } else {
    setObjective(`Inspect both stalls (${count}/2).`, "Use A on each stall.");
  }
}

function loadNightclubAfterMensRoom() {
  loadNightclubAftermathChapter();
  state.phase = "club-after-mensroom";
  setObjective("Rejoin your date and leave the club.", "Press A near your date.");
}

function loadMotelRoomChapter() {
  resetChapterWorld();
  state.chapter = "motel-room";
  state.phase = "motel-investigation";
  state.playerCanMove = true;
  state.playerBounds = { minX: -7, maxX: 7, minZ: -6, maxZ: 6 };
  state.cameraOffset.set(0, 10.7, 10.6);
  state.cameraLookY = 0.8;
  dom.locationLabel.textContent = "Motel room interior";
  dom.timeLabel.textContent = "Late night";
  setObjective("Inspect the tape recorder and room details.", "A to inspect room props, B for tactical action.");
  renderer.setClearColor(0x100f13, 1);
  scene.fog = new THREE.Fog(0x13131a, 8, 24);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a2625, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  envGroup.add(floor);
  envGroup.add(makeWall(0, 1.6, -6, 14, 3.2, 0.3, new THREE.MeshStandardMaterial({ color: 0x5a3e39, roughness: 0.8 })));
  envGroup.add(makeWall(0, 1.6, 6, 14, 3.2, 0.3, new THREE.MeshStandardMaterial({ color: 0x5a3e39, roughness: 0.8 })));
  envGroup.add(makeWall(-7, 1.6, 0, 0.3, 3.2, 12, new THREE.MeshStandardMaterial({ color: 0x533834, roughness: 0.82 })));
  envGroup.add(makeWall(7, 1.6, 0, 0.3, 3.2, 12, new THREE.MeshStandardMaterial({ color: 0x533834, roughness: 0.82 })));

  const bed = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.9, 3.1),
    new THREE.MeshStandardMaterial({ color: 0x53515a, roughness: 0.7, metalness: 0.05 })
  );
  bed.position.set(-1.9, 0.45, 2.1);
  envGroup.add(bed);

  const sideTable = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.9, 1),
    new THREE.MeshStandardMaterial({ color: 0x64473a, roughness: 0.7 })
  );
  sideTable.position.set(1.2, 0.45, 2.4);
  envGroup.add(sideTable);

  const tapeRecorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xa8afb8, roughness: 0.4, metalness: 0.45 })
  );
  tapeRecorder.position.set(1.2, 0.96, 2.38);
  propGroup.add(tapeRecorder);

  const phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x202229, roughness: 0.42 })
  );
  phone.position.set(0.65, 0.96, 2.42);
  propGroup.add(phone);

  const holster = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.65, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x3f2d22, roughness: 0.7 })
  );
  holster.position.set(1.88, 0.6, 2.45);
  propGroup.add(holster);

  const tvStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x5f4a3b, roughness: 0.75 })
  );
  tvStand.position.set(3.7, 0.4, -0.4);
  envGroup.add(tvStand);
  const tv = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x151515, emissive: 0x263042, emissiveIntensity: 0.2 })
  );
  tv.position.set(3.7, 1.0, -0.6);
  envGroup.add(tv);
  state.chapterMeshes.roomTv = tv;

  const fridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.4, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xcad0db, roughness: 0.3 })
  );
  fridge.position.set(5.2, 0.7, -0.1);
  envGroup.add(fridge);

  const door = makeDoor(-5.8, 1.4, -3.5, 0x70564a);
  envGroup.add(door);
  state.chapterMeshes.motelDoor = door;

  playerGroup.position.set(-2.2, 0, 3.6);
  playerGroup.rotation.y = 0.6;
  state.flags.delete("tape-played");
  state.flags.delete("phone-call");
  state.flags.delete("intruder-resolved");
  state.intruder = null;
  state.intruderActive = false;

  addInteraction({
    id: "tape-recorder",
    label: "Play tape recorder",
    key: "A",
    mesh: tapeRecorder,
    radius: 1.5,
    enabled: () => !state.flags.has("tape-played"),
    onActivate: () => {
      state.flags.add("tape-played");
      showDialogue(
        "Tape recorder: Thursday night at the disco - my date screamed, and I found a body. Later I tried to rearrange the order, but it was no use: not my night... not hers.",
        6600
      );
      setObjective("Wait for the phone and answer it.", "Press A near the phone when it rings.");
      window.setTimeout(() => {
        state.flags.add("phone-ringing");
        dom.musicLabel.textContent = "Music: phone ringing";
      }, 2800);
    }
  });

  addInteraction({
    id: "answer-phone",
    label: "Answer phone",
    key: "A",
    mesh: phone,
    radius: 1.5,
    enabled: () => state.flags.has("phone-ringing") && !state.flags.has("phone-call"),
    onActivate: () => {
      state.flags.add("phone-call");
      state.flags.delete("phone-ringing");
      dom.musicLabel.textContent = state.music && !state.music.paused ? "Music: Daddy Cool (nightclub)" : dom.musicLabel.textContent;
      showDialogue(
        "Date: Hi...\nYou: Did you notice anybody else in there?\nDate: The man with the hat and striped shirt. Looks like someone I get weed from.\nYou: Get some rest. Keep your eyes peeled.\nDate: Good night.\nYou: Night.",
        8500
      );
      setObjective("A pounding hits the door. Check the peephole.", "Press A near the door.");
      state.phase = "door-knock";
    }
  });

  addInteraction({
    id: "check-peephole",
    label: "Check peephole",
    key: "A",
    mesh: door,
    radius: 1.7,
    enabled: () => state.phase === "door-knock" && !state.intruderActive,
    onActivate: () => {
      showDialogue("Fisheye view: neon sign, empty hallway, no one at your door.", 2600);
      window.setTimeout(() => {
        spawnIntruder();
      }, 1900);
    }
  });

  addInteraction({
    id: "grab-gun",
    label: "Grab holstered gun",
    key: "B",
    mesh: holster,
    radius: 1.5,
    enabled: () => state.intruderActive && !state.flags.has("intruder-resolved"),
    onActivate: () => {
      state.flags.add("armed");
      showChoice(
        "De-escalate",
        () => resolveIntruder("You lower your voice, keep the muzzle level, and force him back toward the door."),
        "Shoot",
        () => resolveIntruder("First shot knocks his gun loose. Second shot misses on purpose. He bolts out.")
      );
      setObjective("Choose your response.", "Pick De-escalate or Shoot.");
    }
  });

  addInteraction({
    id: "exit-motel-room",
    label: "Exit room",
    key: "A",
    mesh: door,
    radius: 1.8,
    enabled: () => state.flags.has("intruder-resolved"),
    onActivate: () => {
      loadMotelExteriorNight();
    }
  });
}

function spawnIntruder() {
  if (state.intruderActive) {
    return;
  }
  const intruder = makeHuman(0xefd8ca, 0x2a2a2d, "male");
  intruder.position.set(-5.1, 0.45, -2.8);
  const mask = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.5 })
  );
  mask.position.y = 1.18;
  intruder.add(mask);
  npcGroup.add(intruder);
  state.intruder = intruder;
  state.intruderActive = true;
  showDialogue("A masked man pushes in, gun raised.", 2800);
  setObjective("Stall him while moving to your holster.", "Use movement + B at holster.");
}

function resolveIntruder(outcomeText) {
  hideChoices();
  state.flags.add("intruder-resolved");
  state.intruderActive = false;
  state.phase = "post-intruder";
  if (state.intruder) {
    npcGroup.remove(state.intruder);
    disposeMesh(state.intruder);
    state.intruder = null;
  }
  showDialogue(`${outcomeText}\nThe masked man runs into the neon rain.`, 5200);
  setObjective("The room is clear. Exit to motel exterior.", "Press A at the door.");
}

function loadMotelExteriorNight() {
  resetChapterWorld();
  state.chapter = "motel-exterior-night";
  state.phase = "mail";
  state.playerCanMove = true;
  state.playerBounds = { minX: -14, maxX: 14, minZ: -4, maxZ: 4 };
  state.cameraOffset.set(0, 10.4, 12.2);
  state.cameraLookY = 0.8;
  dom.locationLabel.textContent = "11th Hour Motel exterior";
  dom.timeLabel.textContent = "Late night";
  setObjective("Visit the motel office and ask about mail.", "Move left into the office and press A.");
  renderer.setClearColor(0x0e1020, 1);
  scene.fog = new THREE.Fog(0x101427, 11, 34);

  buildMotelExteriorSet(false);
  playerGroup.position.set(5.8, 0, 0.2);
  playerGroup.rotation.y = -Math.PI / 2;
  state.flags.delete("mail-checked");

  addInteraction({
    id: "office-mail",
    label: "Ask manager for mail",
    key: "A",
    position: new THREE.Vector3(-9.8, 0, 0),
    radius: 2.2,
    enabled: () => !state.flags.has("mail-checked"),
    onActivate: () => {
      state.flags.add("mail-checked");
      showDialogue(
        "Manager: Got your mail. One from your ex-wife, one from a sausage club, and one check for $15,000.\n\nManager: Oh... that check was for room 13. The other room 3.\nYou: Thanks for letting me know.",
        9400
      );
      setObjective("A storm front rolls in. Continue to morning.", "Transitioning to title card...");
      window.setTimeout(async () => {
        await runTypewriterCard("Thunderstorms & Neon Signs\n\n11th Hour Motel. Saturday morning.");
        loadMotelExteriorMorning();
      }, 3600);
    }
  });
}

function loadMotelExteriorMorning() {
  resetChapterWorld();
  state.chapter = "motel-exterior-morning";
  state.phase = "room13-setup";
  state.playerCanMove = true;
  state.playerBounds = { minX: -14, maxX: 14, minZ: -4, maxZ: 4 };
  state.cameraOffset.set(0, 10.2, 12.5);
  state.cameraLookY = 0.8;
  dom.locationLabel.textContent = "11th Hour Motel exterior";
  dom.timeLabel.textContent = "Saturday morning";
  setObjective("Check the duplicate room 3 (room 13).", "Move right past rooms 1-12.");
  renderer.setClearColor(0x313748, 1);
  scene.fog = new THREE.Fog(0x404c61, 16, 40);
  buildMotelExteriorSet(true);

  playerGroup.position.set(-11.2, 0, 0);
  playerGroup.rotation.y = Math.PI / 2;
  state.flags.delete("room3-checked");

  showDialogue(
    "Manager: The man from room 3 is dead!\nYou: ...?\nManager: Not you, 3. The OTHER 3. Thirteen.",
    6200
  );

  addInteraction({
    id: "first-room3",
    label: "Check room 3",
    key: "A",
    position: new THREE.Vector3(-4.4, 0, 2.2),
    radius: 1.4,
    enabled: () => !state.flags.has("room3-checked"),
    onActivate: () => {
      state.flags.add("room3-checked");
      showDialogue("Locked. You've checked out.", 1700);
    }
  });

  addInteraction({
    id: "room13-door",
    label: "Enter other room 3 (13)",
    key: "A",
    position: new THREE.Vector3(12.3, 0, 2.2),
    radius: 1.6,
    enabled: () => true,
    onActivate: () => {
      loadRoom13Chapter();
    }
  });
}

function loadRoom13Chapter() {
  resetChapterWorld();
  state.chapter = "room13";
  state.phase = "inspect-room13";
  state.playerCanMove = true;
  state.playerBounds = { minX: -7, maxX: 7, minZ: -6, maxZ: 6 };
  state.cameraOffset.set(0, 10.7, 10.7);
  state.cameraLookY = 0.8;
  dom.locationLabel.textContent = "Other room 3 (13)";
  dom.timeLabel.textContent = "Saturday morning";
  setObjective("Inspect TV and body scene evidence.", "A toggles TV. B inspects body scene.");
  renderer.setClearColor(0x252a37, 1);
  scene.fog = new THREE.Fog(0x2f3a4d, 9, 26);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 12),
    new THREE.MeshStandardMaterial({ color: 0x3b3a3f, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  envGroup.add(floor);
  envGroup.add(makeWall(0, 1.6, -6, 14, 3.2, 0.3, new THREE.MeshStandardMaterial({ color: 0x5a4c47, roughness: 0.82 })));
  envGroup.add(makeWall(0, 1.6, 6, 14, 3.2, 0.3, new THREE.MeshStandardMaterial({ color: 0x5a4c47, roughness: 0.82 })));
  envGroup.add(makeWall(-7, 1.6, 0, 0.3, 3.2, 12, new THREE.MeshStandardMaterial({ color: 0x594942, roughness: 0.83 })));
  envGroup.add(makeWall(7, 1.6, 0, 0.3, 3.2, 12, new THREE.MeshStandardMaterial({ color: 0x594942, roughness: 0.83 })));

  const body = makeCorpse(0.3, 0.12, 0.9);
  body.rotation.y = Math.PI / 2;
  npcGroup.add(body);

  const tvStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x6a5749, roughness: 0.74 })
  );
  tvStand.position.set(4.2, 0.4, -0.4);
  envGroup.add(tvStand);
  const tv = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.9, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x333b45, emissive: 0xc6d6f3, emissiveIntensity: 0.3 })
  );
  tv.position.set(4.2, 1.0, -0.6);
  envGroup.add(tv);
  state.chapterMeshes.room13Tv = tv;

  const skiMask = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.34, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1c21, roughness: 0.55 })
  );
  skiMask.position.set(4.2, 1.44, -0.3);
  propGroup.add(skiMask);

  const pillBottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.24, 10),
    new THREE.MeshStandardMaterial({ color: 0xd7e1f1, roughness: 0.22 })
  );
  pillBottle.position.set(0.9, 0.22, 1.1);
  propGroup.add(pillBottle);

  const whisky = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.38, 10),
    new THREE.MeshStandardMaterial({ color: 0x6f4016, roughness: 0.22, metalness: 0.12 })
  );
  whisky.position.set(1.2, 0.24, 0.8);
  propGroup.add(whisky);

  playerGroup.position.set(-2.8, 0, 3.4);
  playerGroup.rotation.y = 0.2;
  state.flags.delete("room13-scene-inspected");
  state.flags.delete("room13-tv-off");

  addInteraction({
    id: "tv-toggle",
    label: "Toggle TV static",
    key: "A",
    mesh: tv,
    radius: 1.5,
    enabled: () => true,
    onActivate: () => {
      const material = tv.material;
      const off = !state.flags.has("room13-tv-off");
      state.flags[off ? "add" : "delete"]("room13-tv-off");
      material.emissiveIntensity = off ? 0 : 0.3;
      showDialogue(off ? "Static dies. Room gets quieter." : "Static returns.", 1500);
    }
  });

  addInteraction({
    id: "inspect-pills",
    label: "Inspect pills and whisky",
    key: "B",
    position: new THREE.Vector3(1.0, 0, 1.0),
    radius: 1.45,
    enabled: () => !state.flags.has("room13-scene-inspected"),
    onActivate: () => {
      state.flags.add("room13-scene-inspected");
      openEvidence(
        "Scene analysis",
        "The pills were a mix of amphetamines and painkillers. Label irrelevant. The whisky was the nail in the coffin."
      );
      setObjective("Evidence logged. Exit room 13.", "Press A at the door.");
    }
  });

  addInteraction({
    id: "exit-room13",
    label: "Exit room",
    key: "A",
    position: new THREE.Vector3(-5.8, 0, -3.4),
    radius: 1.8,
    enabled: () => state.flags.has("room13-scene-inspected"),
    onActivate: () => {
      loadExteriorKidChapter();
    }
  });
}

function loadExteriorKidChapter() {
  resetChapterWorld();
  state.chapter = "motel-kid";
  state.phase = "kid-dialogue";
  state.playerCanMove = true;
  state.playerBounds = { minX: -14, maxX: 14, minZ: -4, maxZ: 4 };
  state.cameraOffset.set(0, 10.2, 12.5);
  state.cameraLookY = 0.8;
  dom.locationLabel.textContent = "11th Hour Motel exterior";
  dom.timeLabel.textContent = "Saturday morning";
  setObjective("Talk to the kid by your bag, then wrap with the manager.", "A to interact.");
  renderer.setClearColor(0x313748, 1);
  scene.fog = new THREE.Fog(0x404c61, 16, 40);
  buildMotelExteriorSet(true);

  playerGroup.position.set(9.8, 0, -0.4);
  playerGroup.rotation.y = Math.PI;
  state.flags.delete("kid-talk");
  state.flags.delete("manager-wrap");

  const kid = makeHuman(0xf1d8bf, 0x5c87d2, "male");
  kid.scale.set(0.84, 0.84, 0.84);
  kid.position.set(7.4, 0.38, -1.6);
  npcGroup.add(kid);
  state.chapterMeshes.kid = kid;

  const manager = makeHuman(0xe9d3bf, 0x5a453b, "female");
  manager.scale.set(1.1, 1.05, 1.1);
  manager.position.set(-10.1, 0.5, 0.1);
  npcGroup.add(manager);
  state.chapterMeshes.manager = manager;

  addInteraction({
    id: "kid-talk",
    label: "Talk to kid",
    key: "A",
    mesh: kid,
    radius: 1.6,
    enabled: () => !state.flags.has("kid-talk"),
    onActivate: () => {
      state.flags.add("kid-talk");
      showDialogue("Kid: Is that man gonna be okay?\nYou: Sure. He's just sleeping.", 2800);
      setObjective("Talk with the manager and hit the road.", "A at office desk.");
    }
  });

  addInteraction({
    id: "manager-wrap",
    label: "Talk to manager",
    key: "A",
    mesh: manager,
    radius: 1.8,
    enabled: () => state.flags.has("kid-talk") && !state.flags.has("manager-wrap"),
    onActivate: () => {
      state.flags.add("manager-wrap");
      showDialogue("Manager: Thank you for looking into things.\nYou: I'll be heading out now.", 3000);
      window.setTimeout(() => {
        loadRoadChapter();
      }, 2400);
    }
  });
}

function loadRoadChapter() {
  resetChapterWorld();
  state.chapter = "road";
  state.phase = "drive";
  state.playerCanMove = false;
  state.playerSeated = false;
  state.playerBounds = { minX: -5, maxX: 5, minZ: -32, maxZ: 9 };
  state.cameraOffset.set(0, 13, 11);
  state.cameraLookY = 0.5;
  dom.locationLabel.textContent = "Upstate road to Buffalo";
  dom.timeLabel.textContent = "Afternoon";
  dom.musicLabel.textContent = "Music cue: I'm Only Sleeping (placeholder)";
  setObjective("Drive through traffic to reach the law firm.", "Use joystick or A/D to change lanes.");
  renderer.setClearColor(0x8da3c4, 1);
  scene.fog = new THREE.Fog(0xa0b5ce, 20, 65);
  scene.background = null;

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 78),
    new THREE.MeshStandardMaterial({ color: 0x2f333c, roughness: 0.96 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = -8;
  envGroup.add(road);

  for (let i = 0; i < 21; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xdbd16c, roughness: 0.8 })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.02, 28 - i * 3.6);
    envGroup.add(stripe);
  }

  const skyline = new THREE.Group();
  for (let i = 0; i < 12; i += 1) {
    const h = 3 + Math.random() * 8;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(2, h, 2),
      new THREE.MeshStandardMaterial({ color: 0x6c7b8f, roughness: 0.75 })
    );
    b.position.set(-12 + i * 2.3, h / 2, -34 + Math.random() * 6);
    skyline.add(b);
  }
  envGroup.add(skyline);

  playerGroup.visible = false;
  state.drive.active = true;
  state.drive.timer = 31;
  state.drive.spawnTimer = 0.2;
  state.drive.traffic = [];
  state.drive.laneIndex = 1;
  state.drive.finished = false;

  const car = makeCar(0x292b35);
  car.position.set(state.drive.lanes[state.drive.laneIndex], 0, 7);
  propGroup.add(car);
  state.drive.carMesh = car;
}

function buildMotelExteriorSet(daylight) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 12),
    new THREE.MeshStandardMaterial({ color: daylight ? 0x8895a8 : 0x1f2032, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  envGroup.add(ground);

  const motelBlock = new THREE.Mesh(
    new THREE.BoxGeometry(30, 3.6, 5),
    new THREE.MeshStandardMaterial({ color: daylight ? 0xb3aa9f : 0x6a4f4b, roughness: 0.82 })
  );
  motelBlock.position.set(0, 1.8, 2.6);
  envGroup.add(motelBlock);

  for (let i = 0; i < 13; i += 1) {
    const x = -13 + i * 2.2;
    const door = makeDoor(x, 1.1, 0.1, daylight ? 0x6a6259 : 0x3b2b28);
    envGroup.add(door);
  }

  const office = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 3.3, 4.4),
    new THREE.MeshStandardMaterial({ color: daylight ? 0x9c846e : 0x3e2d2a, roughness: 0.76 })
  );
  office.position.set(-10.1, 1.65, -0.3);
  envGroup.add(office);

  const signPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 4.6, 10),
    new THREE.MeshStandardMaterial({ color: 0x4c4f57, roughness: 0.6, metalness: 0.45 })
  );
  signPost.position.set(-12.8, 2.3, -2.8);
  envGroup.add(signPost);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 1.5, 0.25),
    new THREE.MeshStandardMaterial({
      color: daylight ? 0xc7cad5 : 0x2f2a35,
      emissive: daylight ? 0x101010 : 0xcc4747,
      emissiveIntensity: daylight ? 0 : 0.34
    })
  );
  sign.position.set(-12.8, 4.5, -2.8);
  envGroup.add(sign);
}

function resetChapterWorld() {
  clearGroup(envGroup);
  clearGroup(npcGroup);
  clearGroup(propGroup);
  clearGroup(fxGroup);
  state.interactions = [];
  state.nearestInteraction = null;
  state.animations = [];
  state.smokeParticles = [];
  state.danceTiles = [];
  state.chapterMeshes = {};
  state.choiceVisible = false;
  hideChoices();
  closeEvidence(true);
  hideDialogue();
  playerGroup.visible = true;
  state.drive.active = false;
  state.drive.traffic = [];
  state.drive.carMesh = null;
}

function addInteraction(config) {
  state.interactions.push(config);
}

function updateNearestInteraction() {
  if (state.evidenceOpen || state.choiceVisible) {
    state.nearestInteraction = null;
    return;
  }
  let nearest = null;
  let bestDistance = Infinity;

  for (const interaction of state.interactions) {
    if (interaction.enabled && !interaction.enabled()) {
      continue;
    }
    const position = getInteractionPosition(interaction);
    const radius = Number(interaction.radius || 1.6);
    const distance = position.distanceTo(playerGroup.position);
    if (distance <= radius && distance < bestDistance) {
      bestDistance = distance;
      nearest = interaction;
    }
  }

  state.nearestInteraction = nearest;
}

function getInteractionPosition(interaction) {
  if (interaction.position) {
    return interaction.position;
  }
  if (interaction.mesh) {
    interaction.mesh.getWorldPosition(tempVecC);
    return tempVecC;
  }
  return tempVecC.set(999, 999, 999);
}

function tryActivate(key) {
  if (state.evidenceOpen && key === "B") {
    closeEvidence();
    return;
  }
  if (state.choiceVisible || !state.nearestInteraction) {
    return;
  }
  if (state.nearestInteraction.key !== key) {
    return;
  }
  state.nearestInteraction.onActivate();
}

function setObjective(objective, hint) {
  dom.objectiveLabel.textContent = objective;
  state.baseHint = hint;
  dom.hintLabel.textContent = hint;
}

function showDialogue(text, durationMs = 2600) {
  if (!text) {
    return;
  }
  dom.dialogueBox.classList.remove("hidden");
  dom.dialogueBox.textContent = text;
  if (state.dialogueTimer) {
    window.clearTimeout(state.dialogueTimer);
  }
  state.dialogueTimer = window.setTimeout(() => {
    dom.dialogueBox.classList.add("hidden");
  }, durationMs);
}

function hideDialogue() {
  dom.dialogueBox.classList.add("hidden");
  if (state.dialogueTimer) {
    window.clearTimeout(state.dialogueTimer);
    state.dialogueTimer = null;
  }
}

function showChoice(label1, on1, label2, on2) {
  state.choiceVisible = true;
  dom.choiceBox.classList.remove("hidden");
  dom.choice1.textContent = label1;
  dom.choice2.textContent = label2;
  dom.choice1.onclick = () => {
    hideChoices();
    on1();
  };
  dom.choice2.onclick = () => {
    hideChoices();
    on2();
  };
}

function hideChoices() {
  state.choiceVisible = false;
  dom.choiceBox.classList.add("hidden");
  dom.choice1.onclick = null;
  dom.choice2.onclick = null;
}

function openEvidence(title, text) {
  state.evidenceReturnMoveState = state.playerCanMove;
  state.playerCanMove = false;
  state.evidenceOpen = true;
  dom.evidenceTitle.textContent = title;
  dom.evidenceText.textContent = text;
  dom.evidenceOverlay.classList.remove("hidden");
}

function closeEvidence(force = false) {
  if (!state.evidenceOpen && !force) {
    return;
  }
  dom.evidenceOverlay.classList.add("hidden");
  state.evidenceOpen = false;
  if (!force) {
    state.playerCanMove = state.evidenceReturnMoveState;
  }
}

function updatePlayer(delta, elapsed) {
  if (!state.playerCanMove || state.evidenceOpen || state.choiceVisible) {
    return;
  }

  const drive = state.drive;
  if (drive.active) {
    updateDrive(delta);
    return;
  }

  tempVecA.set(
    (state.keyState.right ? 1 : 0) - (state.keyState.left ? 1 : 0) + state.joysticVec.x,
    0,
    (state.keyState.down ? 1 : 0) - (state.keyState.up ? 1 : 0) + state.joysticVec.y
  );

  if (tempVecA.lengthSq() > 0.001) {
    tempVecA.normalize();
    const speed = state.playerSeated ? 0 : 3.2;
    playerGroup.position.addScaledVector(tempVecA, speed * delta);
    playerGroup.position.x = clamp(playerGroup.position.x, state.playerBounds.minX, state.playerBounds.maxX);
    playerGroup.position.z = clamp(playerGroup.position.z, state.playerBounds.minZ, state.playerBounds.maxZ);
    playerGroup.rotation.y = Math.atan2(tempVecA.x, tempVecA.z);
    playerGroup.position.y = Math.sin(elapsed * 9.4) * 0.03;
  } else {
    playerGroup.position.y = 0;
  }
}

function updateDrive(delta) {
  const drive = state.drive;
  if (!drive.active || drive.finished || !drive.carMesh) {
    return;
  }

  drive.timer -= delta;
  drive.spawnTimer -= delta;
  drive.laneCooldown -= delta;

  const axis = (state.keyState.right ? 1 : 0) - (state.keyState.left ? 1 : 0) + state.joysticVec.x;
  if (drive.laneCooldown <= 0) {
    if (axis > 0.45 && drive.laneIndex < drive.lanes.length - 1) {
      drive.laneIndex += 1;
      drive.laneCooldown = 0.22;
    } else if (axis < -0.45 && drive.laneIndex > 0) {
      drive.laneIndex -= 1;
      drive.laneCooldown = 0.22;
    }
  }

  const targetX = drive.lanes[drive.laneIndex];
  drive.carMesh.position.x += (targetX - drive.carMesh.position.x) * Math.min(1, delta * 8);

  if (drive.spawnTimer <= 0) {
    drive.spawnTimer = 0.8 + Math.random() * 0.55;
    spawnTrafficCar();
  }

  for (let i = drive.traffic.length - 1; i >= 0; i -= 1) {
    const car = drive.traffic[i];
    car.position.z += (6.2 + car.userData.speed) * delta;
    if (Math.abs(car.position.x - drive.carMesh.position.x) < 0.9 && Math.abs(car.position.z - drive.carMesh.position.z) < 1.6) {
      showDialogue("Close call.", 900);
      car.position.z += 2;
    }
    if (car.position.z > 11) {
      propGroup.remove(car);
      disposeMesh(car);
      drive.traffic.splice(i, 1);
    }
  }

  setObjective(
    `Drive to Buffalo law office. ${Math.max(0, drive.timer).toFixed(1)}s`,
    "Use A/D or joystick left/right to switch lanes."
  );

  if (drive.timer <= 0) {
    drive.finished = true;
    state.playerCanMove = false;
    showDialogue("Law Firm exterior, Buffalo. Door locked - weekend.\n\nPause here.", 5600);
    setObjective("End of current playable slice.", "Next beat: law office investigation.");
  }
}

function spawnTrafficCar() {
  const drive = state.drive;
  const lane = Math.floor(Math.random() * drive.lanes.length);
  const color = [0x9a1f22, 0x2d495f, 0x798239, 0x7b6f64][Math.floor(Math.random() * 4)];
  const car = makeCar(color);
  car.position.set(drive.lanes[lane], 0, -34);
  car.userData.speed = Math.random() * 3.4;
  propGroup.add(car);
  drive.traffic.push(car);
}

function updateAnimations(delta, elapsed) {
  state.animations = state.animations.filter((update) => {
    return update(delta, elapsed);
  });

  for (const tile of state.danceTiles) {
    tile.mesh.material.emissiveIntensity = 0.12 + Math.max(0, Math.sin(elapsed * 2.3 + tile.phase)) * 0.55;
  }

  for (const smoke of state.smokeParticles) {
    smoke.position.addScaledVector(smoke.userData.velocity, delta * 0.8);
    smoke.position.y += delta * 0.26;
    if (smoke.position.y > 3.8) {
      smoke.position.y = 0.2;
      smoke.position.x = -8.8 + Math.random() * 5.1;
      smoke.position.z = -8.6 + Math.random() * 4.8;
    }
  }

  if (state.intruderActive && state.intruder) {
    tempVecA.copy(playerGroup.position).sub(state.intruder.position);
    tempVecA.y = 0;
    const dist = tempVecA.length();
    if (dist > 0.01) {
      tempVecA.normalize();
      state.intruder.position.addScaledVector(tempVecA, delta * 1.05);
      state.intruder.rotation.y = Math.atan2(tempVecA.x, tempVecA.z);
    }
  }
}

function updateCamera(delta) {
  if (state.drive.active && state.drive.carMesh) {
    tempVecA.copy(state.drive.carMesh.position).add(state.cameraOffset);
    camera.position.lerp(tempVecA, 1 - Math.exp(-delta * 4));
    tempVecB.copy(state.drive.carMesh.position).setY(state.cameraLookY);
    camera.lookAt(tempVecB);
    return;
  }
  tempVecA.copy(playerGroup.position).add(state.cameraOffset);
  camera.position.lerp(tempVecA, 1 - Math.exp(-delta * 4.2));
  tempVecB.copy(playerGroup.position).setY(state.cameraLookY);
  camera.lookAt(tempVecB);
}

function updatePromptHint() {
  const interaction = state.nearestInteraction;
  if (state.evidenceOpen) {
    dom.hintLabel.textContent = "Evidence view active. Press B or CLOSE to return.";
    return;
  }
  if (!interaction) {
    if (state.baseHint) {
      dom.hintLabel.textContent = state.baseHint;
    }
    return;
  }
  dom.hintLabel.textContent = `[${interaction.key}] ${interaction.label}`;
}

function consumeQueuedButtons() {
  if (state.keyState.aQueued) {
    tryActivate("A");
  }
  if (state.keyState.bQueued) {
    tryActivate("B");
  }
  state.keyState.aQueued = false;
  state.keyState.bQueued = false;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;

  updatePlayer(delta, elapsed);
  updateAnimations(delta, elapsed);
  updateNearestInteraction();
  updatePromptHint();
  consumeQueuedButtons();
  updateCamera(delta);
  renderer.render(scene, camera);
}

function syncSize() {
  const width = dom.canvas.clientWidth || window.innerWidth;
  const height = dom.canvas.clientHeight || Math.max(420, window.innerHeight - 120);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function makeWall(x, y, z, w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function makeDoor(x, y, z, color) {
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.2, 0.16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.73, metalness: 0.08 })
  );
  door.position.set(x, y, z);
  return door;
}

function makeSpeaker(x, y, z) {
  const speaker = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2, 1.05),
    new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.58, metalness: 0.22 })
  );
  speaker.position.set(x, y + 1, z);
  return speaker;
}

function makeFrontman(x, y, z) {
  const singer = makeHuman(0xecd3b8, 0x18181b, "male");
  singer.position.set(x, y + 0.45, z);
  singer.scale.set(1.05, 1.08, 1.05);
  state.animations.push((delta, elapsed) => {
    singer.position.y = y + 0.45 + Math.sin(elapsed * 6.4) * 0.06;
    singer.rotation.y = Math.sin(elapsed * 2.4) * 0.45;
    return true;
  });
  return singer;
}

function makeDrummer(x, y, z) {
  const drummer = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, 0.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x222328, roughness: 0.45 })
  );
  body.position.y = 0.5;
  drummer.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf0d9bc, roughness: 0.4 })
  );
  head.position.y = 1.0;
  drummer.add(head);
  const kit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.58, 0.44, 12),
    new THREE.MeshStandardMaterial({ color: 0x821f2d, roughness: 0.44, metalness: 0.2 })
  );
  kit.position.set(0, 0.22, 0.6);
  drummer.add(kit);
  drummer.position.set(x, y, z);
  state.animations.push((delta, elapsed) => {
    drummer.rotation.y = Math.sin(elapsed * 1.7) * 0.12;
    return true;
  });
  return drummer;
}

function makeTableSet(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const cloth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.8, 0.65, 14),
    new THREE.MeshStandardMaterial({ color: 0x971825, roughness: 0.85 })
  );
  cloth.position.y = 0.34;
  group.add(cloth);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 0.05, 14),
    new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5, metalness: 0.2 })
  );
  top.position.y = 0.7;
  group.add(top);

  const candle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.24, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8f1df, roughness: 0.5 })
  );
  candle.position.set(0.1, 0.84, 0.05);
  group.add(candle);
  const candleGlow = new THREE.PointLight(0xffbc66, 0.4, 2.8, 2);
  candleGlow.position.set(0.1, 1.0, 0.05);
  group.add(candleGlow);

  const ashtray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10),
    new THREE.MeshStandardMaterial({ color: 0x76808f, roughness: 0.3, metalness: 0.5 })
  );
  ashtray.position.set(-0.16, 0.77, -0.08);
  group.add(ashtray);

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.11, 0.26, 9),
    new THREE.MeshStandardMaterial({ color: 0x9f3f1b, transparent: true, opacity: 0.85, roughness: 0.2 })
  );
  glass.position.set(0.3, 0.85, -0.12);
  group.add(glass);

  const wine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.1, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0x9d163f, transparent: true, opacity: 0.84 })
  );
  wine.position.set(-0.31, 0.89, 0.18);
  group.add(wine);

  return { group };
}

function makeCouple(x, y, z, index) {
  const colorsWomen = [0xeb4a98, 0x34acc7, 0xc55ddf];
  const colorsMen = [0x121215, 0x2b4d9f, 0x63243a];
  const group = new THREE.Group();
  const woman = makeHuman(0xf3d9bf, colorsWomen[index % colorsWomen.length], "female");
  woman.position.set(x - 0.45, y, z + 0.1);
  const man = makeHuman(0xf0d3b5, colorsMen[index % colorsMen.length], "male");
  man.position.set(x + 0.45, y, z - 0.1);
  group.add(woman, man);
  state.animations.push((delta, elapsed) => {
    woman.position.y = y + Math.sin(elapsed * 2 + index) * 0.03;
    man.position.y = y + Math.sin(elapsed * 1.8 + index + 1) * 0.02;
    return true;
  });
  return group;
}

function makeHuman(skinColor, outfitColor, bodyType) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyType === "female" ? 0.18 : 0.2, 0.23, 0.86, 10),
    new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.45, metalness: 0.06 })
  );
  body.position.y = 0.45;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.43, metalness: 0.02 })
  );
  head.position.y = 0.98;
  group.add(body, head);

  if (bodyType === "female") {
    const heels = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.06, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.62 })
    );
    heels.position.y = 0.03;
    group.add(heels);
  } else {
    const cigarette = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.14, 6),
      new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.4 })
    );
    cigarette.rotation.z = Math.PI / 2;
    cigarette.position.set(0.08, 0.95, 0.12);
    group.add(cigarette);
  }

  return group;
}

function makeAmberMan() {
  const man = makeHuman(0xefd3b2, 0x1f1f23, "male");
  const shades = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.06, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xd19334, emissive: 0x7c4e17, emissiveIntensity: 0.45 })
  );
  shades.position.set(0, 0.97, 0.16);
  man.add(shades);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.16, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x17191e, roughness: 0.62 })
  );
  cap.position.y = 1.14;
  man.add(cap);
  const chestHair = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f251d, roughness: 0.6 })
  );
  chestHair.rotation.x = Math.PI;
  chestHair.position.set(0, 0.6, 0.16);
  man.add(chestHair);
  const smoke = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xbec6d6, transparent: true, opacity: 0.24 })
  );
  smoke.position.set(0.2, 1.35, 0.2);
  man.add(smoke);
  state.animations.push((delta, elapsed) => {
    smoke.position.y = 1.35 + Math.sin(elapsed * 2.4) * 0.08;
    smoke.material.opacity = 0.14 + Math.max(0, Math.sin(elapsed * 2.4)) * 0.18;
    return true;
  });
  return man;
}

function makeCorpse(x, y, z) {
  const body = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.3, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xbec6d1, roughness: 0.6 })
  );
  torso.rotation.z = 0.28;
  body.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xeacfb2, roughness: 0.42 })
  );
  head.position.set(0.64, 0.05, 0);
  body.add(head);
  body.position.set(x, y, z);
  return body;
}

function makeCar(color) {
  const car = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.45, 2.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 })
  );
  base.position.y = 0.24;
  car.add(base);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.35, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.35, metalness: 0.3 })
  );
  cabin.position.set(0, 0.58, -0.1);
  car.add(cabin);
  return car;
}

function buildSmokeVolume() {
  for (let i = 0; i < 42; i += 1) {
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.22 + Math.random() * 0.25, 7, 7),
      new THREE.MeshBasicMaterial({
        color: 0xb7bfd3,
        transparent: true,
        opacity: 0.1 + Math.random() * 0.06
      })
    );
    smoke.position.set(-8.8 + Math.random() * 5, Math.random() * 2.8, -8.7 + Math.random() * 4.7);
    smoke.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.08, Math.random() * 0.02, (Math.random() - 0.5) * 0.08);
    fxGroup.add(smoke);
    state.smokeParticles.push(smoke);
  }
}

function clearGroup(group) {
  for (let i = group.children.length - 1; i >= 0; i -= 1) {
    const child = group.children[i];
    group.remove(child);
    disposeMesh(child);
  }
}

function disposeMesh(object) {
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
