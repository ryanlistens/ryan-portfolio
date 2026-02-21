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
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 160);
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

const ambient = new THREE.AmbientLight(0x4f4455, 0.6);
const key = new THREE.DirectionalLight(0xffd2a6, 1.15);
const fill = new THREE.DirectionalLight(0x7aa7ff, 0.5);
key.position.set(8, 16, 7);
fill.position.set(-10, 12, -8);
scene.add(ambient, key, fill);

const state = {
  running: false,
  introStarted: false,
  phase: "menu",
  playerCanMove: false,
  dialogueTimer: null,
  evidenceOpen: false,
  evidenceReturnCanMove: false,
  controls: {
    up: false,
    down: false,
    left: false,
    right: false,
    aQueued: false,
    bQueued: false,
    aHeld: false,
    bHeld: false,
    joyX: 0,
    joyY: 0,
    joyActive: false
  },
  player: {
    mesh: null,
    body: null,
    leftLeg: null,
    rightLeg: null,
    leftArm: null,
    rightArm: null,
    pos: new THREE.Vector3(7.4, 0, 6.8),
    yaw: Math.PI * 0.88,
    seated: true
  },
  dateMesh: null,
  bartenderMesh: null,
  amberManMesh: null,
  womensDoorPos: new THREE.Vector3(),
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
  cameraBounds: null
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
  const suitMat = new THREE.MeshStandardMaterial({ color: 0x1a1b20, roughness: 0.45, metalness: 0.07 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xeed5b3, roughness: 0.4, metalness: 0.03 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.5 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.3, metalness: 0.15 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.28), suitMat);
  torso.position.y = 0.76;
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.3), suitMat);
  shoulders.position.y = 1.02;
  const collar = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.06, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.5 })
  );
  collar.position.y = 1.08;
  collar.position.z = 0.06;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skinMat);
  head.position.y = 1.24;
  head.scale.set(1, 1.08, 0.96);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
    new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7 })
  );
  hair.position.y = 1.26;

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.5, 8), suitMat);
  leftArm.position.set(-0.33, 0.56, 0);
  leftArm.rotation.z = 0.14;
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), skinMat);
  leftHand.position.set(-0.36, 0.3, 0);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.5, 8), suitMat);
  rightArm.position.set(0.33, 0.56, 0);
  rightArm.rotation.z = -0.14;
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), skinMat);
  rightHand.position.set(0.36, 0.3, 0);

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.46, 8), pantsMat);
  leftLeg.position.set(-0.1, 0.25, 0);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.46, 8), pantsMat);
  rightLeg.position.set(0.1, 0.25, 0);
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.16), shoeMat);
  leftShoe.position.set(-0.1, 0.025, 0.02);
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.16), shoeMat);
  rightShoe.position.set(0.1, 0.025, 0.02);

  root.add(torso, shoulders, collar, head, hair, leftArm, leftHand, rightArm, rightHand, leftLeg, rightLeg, leftShoe, rightShoe);
  state.player.mesh = root;
  state.player.body = torso;
  state.player.leftLeg = leftLeg;
  state.player.rightLeg = rightLeg;
  state.player.leftArm = leftArm;
  state.player.rightArm = rightArm;
  root.position.copy(state.player.pos);
  root.rotation.y = state.player.yaw;
  charGroup.add(root);
}

function attachInput() {
  const startCase = () => {
    if (state.introStarted) {
      return;
    }
    state.introStarted = true;
    runIntro();
  };

  bindPress(dom.titleScreen, startCase);
  bindPress(dom.startBtn, (event) => {
    if (event) {
      event.stopPropagation();
    }
    startCase();
  });

  bindPress(dom.closeEvidenceBtn, () => {
    closeEvidence();
  });

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
    e: "interact",
    E: "interact",
    Enter: "interact",
    j: "interact",
    J: "interact",
    b: "action",
    B: "action",
    " ": "action",
    k: "action",
    K: "action"
  };

  window.addEventListener("keydown", (event) => {
    const action = keyMap[event.key];
    if (!action) {
      return;
    }
    if (action === "interact") {
      queueButton("a", true);
    } else if (action === "action") {
      queueButton("b", true);
    } else {
      state.controls[action] = true;
    }
    if (event.key.startsWith("Arrow") || action === "interact" || action === "action") {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    const action = keyMap[event.key];
    if (!action) {
      return;
    }
    if (action === "interact") {
      state.controls.aHeld = false;
    } else if (action === "action") {
      state.controls.bHeld = false;
    } else {
      state.controls[action] = false;
    }
    if (event.key.startsWith("Arrow") || action === "interact" || action === "action") {
      event.preventDefault();
    }
  });

  bindPress(dom.btnA, () => queueButton("a", false));
  bindPress(dom.btnB, () => queueButton("b", false));

  const activateNearest = () => {
    if (state.evidenceOpen) {
      closeEvidence();
      return;
    }
    if (!state.nearestInteraction) {
      return;
    }
    triggerInteraction(state.nearestInteraction);
  };
  bindPress(dom.canvas, activateNearest, 260);

  setupJoystick();
}

function bindPress(element, handler, minGapMs = 120) {
  if (!element) {
    return;
  }
  let last = 0;
  const wrapped = (event) => {
    if (event && event.cancelable) {
      event.preventDefault();
    }
    const now = performance.now();
    if (now - last < minGapMs) {
      return;
    }
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
    if (!state.controls.aHeld || !hold) {
      state.controls.aQueued = true;
    }
    if (hold) {
      state.controls.aHeld = true;
    }
    return;
  }
  if (!state.controls.bHeld || !hold) {
    state.controls.bQueued = true;
  }
  if (hold) {
    state.controls.bHeld = true;
  }
}

function setupJoystick() {
  const pad = dom.joystick;
  const knob = dom.joystickKnob;
  if (!pad || !knob) {
    return;
  }

  const setKnob = (x, y) => {
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  };

  const update = (x, y) => {
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = x - cx;
    let dy = y - cy;
    const max = rect.width * 0.31;
    const dist = Math.hypot(dx, dy);
    if (dist > max) {
      const scale = max / dist;
      dx *= scale;
      dy *= scale;
    }
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

  pad.addEventListener("pointerdown", (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    state.controls.joyActive = true;
    update(event.clientX, event.clientY);
    if (typeof pad.setPointerCapture === "function") {
      try {
        pad.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore.
      }
    }
  });
  pad.addEventListener("pointermove", (event) => {
    if (!state.controls.joyActive) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    update(event.clientX, event.clientY);
  });
  pad.addEventListener("pointerup", clear);
  pad.addEventListener("pointercancel", clear);
  pad.addEventListener("pointerleave", clear);

  pad.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }
      state.controls.joyActive = true;
      update(touch.clientX, touch.clientY);
    },
    { passive: false }
  );
  pad.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch || !state.controls.joyActive) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }
      update(touch.clientX, touch.clientY);
    },
    { passive: false }
  );
  pad.addEventListener(
    "touchend",
    (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      clear();
    },
    { passive: false }
  );
  pad.addEventListener(
    "touchcancel",
    (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      clear();
    },
    { passive: false }
  );
}

async function runIntro() {
  dom.tapPrompt.textContent = "loading case file...";
  await fadeOut(dom.titleScreen);
  await runTypewriter(INTRO_TEXT);
  dom.gameRoot.classList.remove("hidden");
  startMusic();
  loadNightclubScene("seated");
  if (!state.running) {
    state.running = true;
    animate();
  }
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
        window.setTimeout(() => {
          dom.typewriterScreen.classList.add("hidden");
          resolve();
        }, 1050);
      }
    }, 35);
  });
}

async function startMusic() {
  const audio = state.music || new Audio();
  state.music = audio;
  audio.loop = true;
  audio.volume = 0.68;

  const candidates = ["songs/nightclub.mp3", "music/nightclub.mp3"];
  for (const src of candidates) {
    const ok = await tryAudioSource(audio, src);
    if (!ok) {
      continue;
    }
    try {
      await audio.play();
      dom.hudMusic.textContent = `Music cue: Daddy Cool (${src})`;
      return;
    } catch (error) {
      // Continue to next source.
    }
  }
  dom.hudMusic.textContent = "Music cue: add songs/nightclub.mp3";
}

function tryAudioSource(audio, src) {
  return new Promise((resolve) => {
    let done = false;
    const pass = () => {
      if (done) {
        return;
      }
      done = true;
      clear();
      resolve(true);
    };
    const fail = () => {
      if (done) {
        return;
      }
      done = true;
      clear();
      resolve(false);
    };
    const clear = () => {
      audio.removeEventListener("canplaythrough", pass);
      audio.removeEventListener("error", fail);
    };
    audio.addEventListener("canplaythrough", pass, { once: true });
    audio.addEventListener("error", fail, { once: true });
    audio.src = src;
    audio.load();
    window.setTimeout(fail, 2400);
  });
}

function loadNightclubScene(startPhase) {
  resetWorld();
  state.phase = startPhase;
  state.playerCanMove = startPhase !== "seated";
  state.player.seated = startPhase === "seated";
  state.player.pos.set(7.4, 0, 6.8);
  state.player.yaw = Math.PI * 0.88;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.flags.delete("bathroom-mirror");
  state.flags.delete("bathroom-sink");

  state.cameraBounds = { minX: -11.5, maxX: 11.5, minZ: -10.5, maxZ: 10.5, maxY: 6.0 };

  dom.hudLocation.textContent = "Nightclub interior. Little Italy.";
  dom.hudTime.textContent = "Summer 1979. 11:54 PM.";
  scene.fog = new THREE.FogExp2(0x0a0a10, 0.038);
  renderer.setClearColor(0x08070d, 1);

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
  walls.forEach((mesh) => envGroup.add(mesh));

  const danceBase = makeBox(-6.6, 0.04, -6.2, 8.8, 0.08, 8.8, 0x180f18, 0.36);
  envGroup.add(danceBase);
  buildDanceFloor(-9.9, -9.5);

  const stage = makeBox(-9.0, 0.35, -10.1, 5.4, 0.7, 4.3, 0x23232b, 0.26);
  envGroup.add(stage);
  envGroup.add(makeBox(-11.2, 1.1, -9.4, 1.2, 2.2, 1.1, 0x12151c, 0.22));
  envGroup.add(makeBox(-6.9, 1.1, -9.4, 1.2, 2.2, 1.1, 0x12151c, 0.22));

  const platform = makeBox(5.1, 0.24, 0.2, 9.7, 0.48, 15.4, 0x1e1820, 0.12);
  envGroup.add(platform);
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

  const bar = makeBox(-8.6, 0.72, 8.1, 4.7, 1.44, 1.6, 0x4f311f, 0.22);
  envGroup.add(bar);
  const backBar = makeBox(-8.6, 1.7, 9.4, 3.6, 1.1, 0.6, 0x2e231e, 0.3);
  envGroup.add(backBar);

  const womensDoor = makeDoor(0.9, -10.9, 0xb22543);
  const mensDoor = makeDoor(-3.1, -10.9, 0x9d7a23);
  envGroup.add(womensDoor, mensDoor);
  state.womensDoorPos.copy(womensDoor.position).setY(0);

  const entrance = makeDoor(0.0, 10.9, 0x272029);
  envGroup.add(entrance);

  addCabaretLights();
  addSmoke();

  state.obstacles = [
    makeObstacle(-11.8, -6.5, -11.8, -8.0),
    makeObstacle(0.3, 9.8, -7.3, 7.7),
    makeObstacle(-10.8, -6.0, 7.1, 9.2),
    makeObstacle(-10.8, -7.1, -10.9, -9.3)
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
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.34,
          roughness: 0.22,
          metalness: 0.2
        })
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
  const candleLight = new THREE.PointLight(0xffb86f, 0.3, 2.8, 2);
  candleLight.position.set(x + 0.1, 1.0, z + 0.06);
  envGroup.add(candleLight);

  const ashtray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10),
    new THREE.MeshStandardMaterial({ color: 0x7c8795, roughness: 0.3, metalness: 0.5 })
  );
  ashtray.position.set(x - 0.18, 0.77, z - 0.09);
  envGroup.add(ashtray);

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
  const frontman = makePerson(0xdec6a7, 0x0f1013, false);
  frontman.position.set(-8.8, 0.36, -10.0);
  frontman.scale.set(1.04, 1.08, 1.04);
  charGroup.add(frontman);
  state.animations.push((dt, t) => {
    frontman.position.y = 0.36 + Math.sin(t * 5.6) * 0.08;
    frontman.rotation.y = Math.sin(t * 2.4) * 0.4;
    return true;
  });

  const drummer = makePerson(0xe7cfaf, 0x1c1c22, false);
  drummer.position.set(-9.8, 0.36, -10.9);
  charGroup.add(drummer);
  const drumKit = makeBox(-9.8, 0.26, -10.4, 1.1, 0.5, 1.0, 0x7a1f2b, 0.28);
  envGroup.add(drumKit);

  const couplePositions = [
    [3.7, -4.6, 0xeb4d9c, 0x131317],
    [6.2, -1.3, 0x45a8d3, 0x2c50a6],
    [3.6, 2.0, 0xbc4fd1, 0x682646]
  ];
  couplePositions.forEach((cfg, idx) => {
    const woman = makePerson(0xf1d7b8, cfg[2], true);
    woman.position.set(cfg[0], 0.36, cfg[1] + 0.12);
    const man = makePerson(0xecd2b0, cfg[3], false);
    man.position.set(cfg[0] + 0.7, 0.36, cfg[1] - 0.08);
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
  charGroup.add(amber);
  state.amberManMesh = amber;
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
    showDialogue("...", 1100);
  });

  addInteraction("bartender", "A", () => state.phase === "explore", () => state.bartenderMesh.position, 1.8, () => {
    state.phase = "dance-invite";
    setObjective("Your date moved to the dance floor. Meet her and press A.", "Dance floor is lit on the left.");
    showDialogue("Date: Come on, detective. Dance before this song dies.", 3600);
    moveDateTo(-6.5, -6.0);
  });

  addInteraction(
    "dance-date",
    "A",
    () => state.phase === "dance-invite",
    () => state.dateMesh.position,
    1.9,
    () => {
      runDanceBeat();
    }
  );

  addInteraction(
    "womens-door",
    "A",
    () => state.phase === "scream",
    () => state.womensDoorPos,
    1.8,
    () => {
      loadBathroomScene();
    }
  );
}

function runDanceBeat() {
  if (state.flags.has("dance-sequence")) {
    return;
  }
  state.flags.add("dance-sequence");
  state.phase = "dancing";
  state.playerCanMove = false;
  showDialogue("You dance until the track snaps into the next beat.", 2900);
  window.setTimeout(() => {
    showDialogue("Date: I need the bathroom to powder my nose.", 2600);
  }, 3200);
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
    if (tempA.length() < 0.08) {
      return false;
    }
    tempA.normalize();
    state.dateMesh.position.addScaledVector(tempA, dt * 1.95);
    state.dateMesh.rotation.y = Math.atan2(tempA.x, tempA.z);
    return true;
  });
}

function loadBathroomScene() {
  resetWorld();
  state.phase = "bathroom";
  state.playerCanMove = true;
  state.player.seated = false;
  state.player.pos.set(-2.6, 0, 4.4);
  state.player.yaw = Math.PI;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;

  state.cameraBounds = { minX: -6.5, maxX: 6.5, minZ: -5.5, maxZ: 5.5, maxY: 4.5 };

  dom.hudLocation.textContent = "Women's powder room";
  dom.hudTime.textContent = "Minutes later";
  scene.fog = new THREE.FogExp2(0x1a2029, 0.06);
  renderer.setClearColor(0x111620, 1);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 12),
    new THREE.MeshStandardMaterial({ color: 0x212834, roughness: 0.88 })
  );
  floor.rotation.x = -Math.PI / 2;
  envGroup.add(floor);

  const wallColor = 0x2e3645;
  envGroup.add(makeBox(0, 1.6, -6, 14, 3.2, 0.35, wallColor, 0.74));
  envGroup.add(makeBox(0, 1.6, 6, 14, 3.2, 0.35, wallColor, 0.74));
  envGroup.add(makeBox(-7, 1.6, 0, 0.35, 3.2, 12, wallColor, 0.74));
  envGroup.add(makeBox(7, 1.6, 0, 0.35, 3.2, 12, wallColor, 0.74));

  const sink = makeBox(-1.1, 0.45, 4.8, 5.8, 0.9, 1.2, 0x2e333d, 0.6);
  envGroup.add(sink);
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x8a97b3, roughness: 0.2, metalness: 0.82 })
  );
  mirror.position.set(-1.1, 1.64, 4.21);
  envGroup.add(mirror);

  const stall = makeBox(2.8, 1.3, -2.7, 4.4, 2.6, 0.3, 0x27303f, 0.75);
  envGroup.add(stall);
  const blood = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 20),
    new THREE.MeshStandardMaterial({ color: 0x5a0812, roughness: 0.95 })
  );
  blood.rotation.x = -Math.PI / 2;
  blood.position.set(3.3, 0.01, -2.2);
  envGroup.add(blood);

  const corpse = makeCorpse(3.2, 0.12, -2.5);
  charGroup.add(corpse);

  const compact = makeBox(3.5, 0.58, -2.45, 0.34, 0.05, 0.34, 0xaeb9d3, 0.24);
  envGroup.add(compact);
  const sinkClue = makeBox(-0.7, 0.93, 4.83, 0.58, 0.04, 0.3, 0xf7f7f7, 0.5);
  envGroup.add(sinkClue);

  state.obstacles = [
    makeObstacle(1.0, 5.1, -3.4, -1.4),
    makeObstacle(-4.0, 2.1, 4.2, 5.6)
  ];

  clearInteractions();
  addInteraction("compact", "B", () => !state.flags.has("bathroom-mirror"), () => compact.position, 1.4, () => {
    state.flags.add("bathroom-mirror");
    openEvidence(
      "Compact mirror",
      "Hmm... she could have been too busy minding her nose to notice the dealer of her last blowline."
    );
    updateBathroomObjective();
  });

  addInteraction("sink", "B", () => !state.flags.has("bathroom-sink"), () => sinkClue.position, 1.4, () => {
    state.flags.add("bathroom-sink");
    openEvidence("Sink counter", "White lines on the mirror. Bloody razor blade near the faucet.");
    updateBathroomObjective();
  });

  addInteraction(
    "exit-bathroom",
    "A",
    () => state.flags.has("bathroom-mirror") && state.flags.has("bathroom-sink"),
    () => new THREE.Vector3(-5.8, 0, 0),
    1.9,
    () => loadClubAftermath()
  );

  updateBathroomObjective();
}

function updateBathroomObjective() {
  const count = Number(state.flags.has("bathroom-mirror")) + Number(state.flags.has("bathroom-sink"));
  if (count >= 2) {
    setObjective("Evidence logged. Leave the powder room.", "Press A at the exit.");
  } else {
    setObjective(`Inspect clue points (${count}/2).`, "Use B on compact mirror and sink evidence.");
  }
}

function loadClubAftermath() {
  loadNightclubScene("aftermath");
  state.phase = "aftermath";
  state.playerCanMove = true;
  state.player.seated = false;
  dom.hudLocation.textContent = "Nightclub interior - lights up";
  dom.hudTime.textContent = "After the scream";
  scene.fog.color.setHex(0x1f2630);
  scene.fog.density = 0.052;
  renderer.setClearColor(0x19202b, 1);

  state.player.pos.set(4.6, 0, 4.8);
  state.player.yaw = Math.PI * 0.96;
  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;

  state.dateMesh.position.set(6.2, 0.36, 5.4);
  for (const tile of state.danceTiles) {
    tile.mesh.material.emissiveIntensity = 0.06;
  }

  clearInteractions();
  addInteraction("date-aftermath", "A", () => true, () => state.dateMesh.position, 1.9, () => {
    showDialogue(
      "Date: I just went in with all the drinks... and then I saw all the... is she actually dead?\n\nYou: It wasn't her time of the month.\nDate: Can we go home?",
      7200
    );
    setObjective("Opening level slice complete.", "Next build: men's room, motel, and road chapters.");
  });
}

function addInteraction(id, keyName, enabledFn, getPosFn, radius, onTrigger) {
  const marker = createMarker();
  markerGroup.add(marker);
  state.interactions.push({
    id,
    keyName,
    enabledFn,
    getPosFn,
    radius,
    onTrigger,
    marker
  });
}

function clearInteractions() {
  for (const it of state.interactions) {
    markerGroup.remove(it.marker);
    disposeObject(it.marker);
  }
  state.interactions = [];
  state.nearestInteraction = null;
}

function createMarker() {
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.03, 8, 20),
    new THREE.MeshStandardMaterial({
      color: 0xffd892,
      emissive: 0xffa34d,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.4
    })
  );
  ring.rotation.x = Math.PI / 2;
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffe0ad,
      emissive: 0xffb35f,
      emissiveIntensity: 0.52
    })
  );
  dot.position.y = 0.24;
  marker.add(ring, dot);
  return marker;
}

function updateInteractions(elapsed) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const it of state.interactions) {
    const enabled = it.enabledFn();
    const pos = it.getPosFn();
    if (!enabled) {
      it.marker.visible = false;
      continue;
    }
    it.marker.visible = true;
    it.marker.position.set(pos.x, pos.y + 1.4 + Math.sin(elapsed * 2.2) * 0.03, pos.z);
    it.marker.rotation.y += 0.02;

    const dist = tempA.set(pos.x, state.player.pos.y, pos.z).distanceTo(state.player.pos);
    if (dist <= it.radius && dist < nearestDist) {
      nearest = it;
      nearestDist = dist;
    }
  }
  state.nearestInteraction = nearest;
  if (state.evidenceOpen) {
    dom.interactionText.textContent = "Press B or BACK to close evidence.";
    return;
  }
  const nearA = findNearestByKey("A");
  const nearB = findNearestByKey("B");
  if (!nearA && !nearB) {
    dom.interactionText.textContent = state.activeBaseHint;
    return;
  }
  const parts = [];
  if (nearA) {
    parts.push(`[A] ${formatInteractionLabel(nearA.id)}`);
  }
  if (nearB) {
    parts.push(`[B] ${formatInteractionLabel(nearB.id)}`);
  }
  dom.interactionText.textContent = parts.join("  |  ");
}

function formatInteractionLabel(id) {
  const labels = {
    "talk-date": "Talk to your date",
    "stand-up": "Stand up",
    bartender: "Talk to bartender",
    "dance-date": "Dance",
    "amber-man": "Action at amber shades man",
    "womens-door": "Enter women's room",
    compact: "Inspect compact mirror",
    sink: "Inspect sink clue",
    "exit-bathroom": "Exit powder room",
    "date-aftermath": "Talk to your date"
  };
  return labels[id] || "Interact";
}

function triggerInteraction(interaction) {
  if (!interaction || !interaction.enabledFn()) {
    return;
  }
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
  if (!state.evidenceOpen) {
    return;
  }
  state.evidenceOpen = false;
  state.playerCanMove = state.evidenceReturnCanMove;
  dom.evidenceOverlay.classList.add("hidden");
}

function setObjective(text, hint) {
  dom.objectiveText.textContent = text;
  dom.interactionText.textContent = hint;
  state.activeBaseHint = hint;
}

function showDialogue(text, durationMs = 2500) {
  dom.dialogueBox.textContent = text;
  dom.dialogueBox.classList.remove("hidden");
  if (state.dialogueTimer) {
    window.clearTimeout(state.dialogueTimer);
  }
  state.dialogueTimer = window.setTimeout(() => {
    dom.dialogueBox.classList.add("hidden");
    state.dialogueTimer = null;
  }, durationMs);
}

function findNearestByKey(keyName) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const it of state.interactions) {
    if (!it.enabledFn() || it.keyName !== keyName) {
      continue;
    }
    const pos = it.getPosFn();
    const dist = tempA.set(pos.x, state.player.pos.y, pos.z).distanceTo(state.player.pos);
    if (dist <= it.radius && dist < nearestDist) {
      nearest = it;
      nearestDist = dist;
    }
  }
  return nearest;
}

function updateInputTriggers() {
  if (state.controls.aQueued) {
    const target = findNearestByKey("A");
    if (target) {
      triggerInteraction(target);
    }
  }
  if (state.controls.bQueued) {
    if (state.evidenceOpen) {
      closeEvidence();
    } else {
      const target = findNearestByKey("B");
      if (target) {
        triggerInteraction(target);
      }
    }
  }
  state.controls.aQueued = false;
  state.controls.bQueued = false;
}

function updatePlayer(delta, elapsed) {
  if (!state.playerCanMove || state.evidenceOpen) {
    return;
  }
  const inputX = (state.controls.right ? 1 : 0) - (state.controls.left ? 1 : 0) + state.controls.joyX;
  const inputZ = (state.controls.down ? 1 : 0) - (state.controls.up ? 1 : 0) + state.controls.joyY;
  tempA.set(inputX, 0, inputZ);
  if (tempA.lengthSq() < 0.001) {
    state.player.mesh.position.y = 0;
    if (state.player.leftLeg) { state.player.leftLeg.rotation.x = 0; }
    if (state.player.rightLeg) { state.player.rightLeg.rotation.x = 0; }
    if (state.player.leftArm) { state.player.leftArm.rotation.x = 0; }
    if (state.player.rightArm) { state.player.rightArm.rotation.x = 0; }
    return;
  }

  tempA.normalize();
  const speed = state.player.seated ? 0 : 3.2;
  const trialX = state.player.pos.x + tempA.x * speed * delta;
  const trialZ = state.player.pos.z + tempA.z * speed * delta;

  if (canMoveTo(trialX, state.player.pos.z)) {
    state.player.pos.x = trialX;
  }
  if (canMoveTo(state.player.pos.x, trialZ)) {
    state.player.pos.z = trialZ;
  }

  state.player.pos.x = clamp(state.player.pos.x, -11.2, 11.2);
  state.player.pos.z = clamp(state.player.pos.z, -10.8, 10.8);
  state.player.yaw = Math.atan2(tempA.x, tempA.z);

  state.player.mesh.position.copy(state.player.pos);
  state.player.mesh.rotation.y = state.player.yaw;
  state.player.mesh.position.y = Math.sin(elapsed * 9.2) * 0.02;

  const walkPhase = Math.sin(elapsed * 10) * 0.35;
  if (state.player.leftLeg) {
    state.player.leftLeg.rotation.x = walkPhase;
  }
  if (state.player.rightLeg) {
    state.player.rightLeg.rotation.x = -walkPhase;
  }
  if (state.player.leftArm) {
    state.player.leftArm.rotation.x = -walkPhase * 0.5;
  }
  if (state.player.rightArm) {
    state.player.rightArm.rotation.x = walkPhase * 0.5;
  }
}

function canMoveTo(x, z) {
  for (const o of state.obstacles) {
    if (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ) {
      return false;
    }
  }
  return true;
}

function updateAnimations(delta, elapsed) {
  state.animations = state.animations.filter((fn) => fn(delta, elapsed));
  for (const tile of state.danceTiles) {
    const glow = state.phase === "aftermath" ? 0.06 : 0.2 + Math.max(0, Math.sin(elapsed * 2.4 + tile.phase)) * 0.56;
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
  let desired;
  let lerpSpeed;
  if (state.player.seated) {
    desired = tempA.set(
      state.player.pos.x - 2.5,
      state.player.pos.y + 3.4,
      state.player.pos.z - 3.2
    );
    lerpSpeed = 3.0;
  } else {
    const backDistance = 4.2;
    const height = 2.4;
    const offsetX = Math.sin(state.player.yaw) * backDistance;
    const offsetZ = Math.cos(state.player.yaw) * backDistance;
    desired = tempA.set(
      state.player.pos.x - offsetX,
      state.player.pos.y + height,
      state.player.pos.z - offsetZ
    );
    lerpSpeed = 7.5;
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

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;
  if (!state.running) {
    return;
  }

  updatePlayer(delta, elapsed);
  updateAnimations(delta, elapsed);
  updateInteractions(elapsed);
  updateInputTriggers();
  updateCamera(delta);
  renderer.render(scene, camera);
}

function syncViewport() {
  const width = dom.canvas.clientWidth || window.innerWidth;
  const height = dom.canvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

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
  if (!charGroup.children.includes(state.player.mesh)) {
    charGroup.add(state.player.mesh);
  }
}

function clearGroup(group, preserve) {
  for (let i = group.children.length - 1; i >= 0; i -= 1) {
    const child = group.children[i];
    if (preserve && child === preserve) {
      continue;
    }
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
        node.material.forEach((m) => m.dispose());
      } else {
        node.material.dispose();
      }
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
  for (let i = 0; i < 44; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.22 + Math.random() * 0.28, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xb8c1d6,
        transparent: true,
        opacity: 0.08 + Math.random() * 0.08
      })
    );
    puff.position.set(-9.4 + Math.random() * 5.4, Math.random() * 3.2, -8.8 + Math.random() * 4.8);
    puff.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.08, Math.random() * 0.02, (Math.random() - 0.5) * 0.08);
    fxGroup.add(puff);
    state.smoke.push(puff);
  }
}

function makePerson(skin, outfit, female) {
  const root = new THREE.Group();
  const outfitMat = new THREE.MeshStandardMaterial({ color: outfit, roughness: 0.44, metalness: 0.08 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.42 });

  if (female) {
    const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 0.6, 10), outfitMat);
    dress.position.y = 0.32;
    const bust = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.2), outfitMat);
    bust.position.y = 0.72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat);
    head.position.y = 0.96;
    head.scale.set(1, 1.05, 0.95);
    const hairBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.1, 0.34, 10),
      new THREE.MeshStandardMaterial({ color: darkenColor(skin, 0.35), roughness: 0.65 })
    );
    hairBack.position.y = 0.9;
    hairBack.position.z = -0.04;
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.38, 6), skinMat);
    leftArm.position.set(-0.2, 0.56, 0);
    leftArm.rotation.z = 0.18;
    const rightArm = leftArm.clone();
    rightArm.position.set(0.2, 0.56, 0);
    rightArm.rotation.z = -0.18;
    root.add(dress, bust, head, hairBack, leftArm, rightArm);
  } else {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.22), outfitMat);
    torso.position.y = 0.68;
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.2), outfitMat);
    hips.position.y = 0.45;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat);
    head.position.y = 0.98;
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: darkenColor(skin, 0.3), roughness: 0.6 })
    );
    hair.position.y = 1.0;
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.42, 6), outfitMat);
    leftArm.position.set(-0.25, 0.52, 0);
    leftArm.rotation.z = 0.12;
    const rightArm = leftArm.clone();
    rightArm.position.set(0.25, 0.52, 0);
    rightArm.rotation.z = -0.12;
    const leftLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, 0.36, 8),
      new THREE.MeshStandardMaterial({ color: darkenColor(outfit, 0.8), roughness: 0.5 })
    );
    leftLeg.position.set(-0.08, 0.2, 0);
    const rightLeg = leftLeg.clone();
    rightLeg.position.set(0.08, 0.2, 0);
    root.add(torso, hips, head, hair, leftArm, rightArm, leftLeg, rightLeg);
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
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.28, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xc4ccd8, roughness: 0.55 })
  );
  torso.rotation.z = 0.3;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe7ccb0, roughness: 0.45 })
  );
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
