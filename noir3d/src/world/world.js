import * as THREE from "three";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function vec3From(arr, fallback = [0, 0, 0]) {
  const v = Array.isArray(arr) ? arr : fallback;
  return new THREE.Vector3(Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0);
}

export class World {
  constructor({ canvas, onHotspotInteract, onEmptyClick }) {
    this.canvas = canvas;
    this.onHotspotInteract = onHotspotInteract;
    this.onEmptyClick = onEmptyClick;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050406);
    this.scene.fog = new THREE.FogExp2(0x060508, 0.045);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.camera.position.set(0, 2.4, 6.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(1, 1, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this._interactables = [];
    this._ground = null;
    this._player = null;
    this._playerTarget = null;

    this._shotAnim = null;

    this._bindEvents();
    this._resize();
    window.addEventListener("resize", () => this._resize());

    this._tPrev = performance.now();
    requestAnimationFrame((t) => this._tick(t));
  }

  async loadSet(setDef) {
    // Clear scene objects but keep camera/renderer.
    for (const obj of [...this.scene.children]) this.scene.remove(obj);
    this._interactables = [];

    const fog = setDef?.fog;
    if (fog?.color) this.scene.fog.color = new THREE.Color(fog.color);
    if (fog?.density != null) this.scene.fog.density = Number(fog.density);

    // Lights
    const amb = new THREE.AmbientLight(0xbdb0a0, 0.22);
    this.scene.add(amb);

    const key = new THREE.DirectionalLight(0xfff2d2, 0.55);
    key.position.set(-4, 8, 6);
    key.castShadow = false;
    this.scene.add(key);

    const rim = new THREE.PointLight(0x4aa6ff, 1.1, 18, 2);
    rim.position.set(6, 3.2, -3);
    this.scene.add(rim);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(40, 40, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1718,
      roughness: 1,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = false;
    ground.userData.ground = true;
    this.scene.add(ground);
    this._ground = ground;

    // Player
    const player = this._makeCharacter({ color: 0x2a2a2e, emissive: 0x000000 });
    player.position.copy(vec3From(setDef?.playerSpawn || [0, 0, 3]));
    player.userData.isPlayer = true;
    this.scene.add(player);
    this._player = player;
    this._playerTarget = null;

    // Set dressing objects
    for (const o of setDef?.objects || []) {
      const obj = this._makeObject(o);
      if (!obj) continue;
      this.scene.add(obj);
      if (o.hotspotId) this._interactables.push(obj);
    }

    // Default camera framing
    if (setDef?.defaultShot) await this.setShot(setDef.defaultShot);
  }

  async setShot(shotDef) {
    const shot = shotDef || {};
    const pos = vec3From(shot.pos || [0, 2.2, 6.3]);
    const lookAt = vec3From(shot.lookAt || [0, 1.4, 0]);
    const fov = clamp(Number(shot.fov ?? this.camera.fov), 18, 80);
    const ms = clamp(Number(shot.ms ?? 650), 0, 8000);

    if (ms <= 0) {
      this.camera.position.copy(pos);
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(lookAt);
      return;
    }

    const fromPos = this.camera.position.clone();
    const fromFov = this.camera.fov;
    const fromLook = new THREE.Vector3();
    this.camera.getWorldDirection(fromLook);
    fromLook.multiplyScalar(10).add(this.camera.position);

    const t0 = performance.now();
    this._shotAnim = {
      t0,
      ms,
      fromPos,
      toPos: pos,
      fromFov,
      toFov: fov,
      fromLook,
      toLook: lookAt,
    };
  }

  movePlayerTo(point) {
    if (!this._player) return;
    const p = point.clone();
    p.y = this._player.position.y;
    this._playerTarget = p;
  }

  _bindEvents() {
    this.canvas.addEventListener("pointerdown", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.pointer.set(x, y);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const hits = this.raycaster.intersectObjects(this._interactables, true);
      if (hits.length > 0) {
        const hit = hits[0].object;
        const hotspotId = this._findHotspotId(hit);
        if (hotspotId) this.onHotspotInteract?.(hotspotId);
        return;
      }

      const groundHits = this._ground
        ? this.raycaster.intersectObject(this._ground, false)
        : [];
      if (groundHits.length > 0) {
        this.onEmptyClick?.(groundHits[0]);
      }
    });
  }

  _findHotspotId(obj) {
    let o = obj;
    while (o) {
      if (o.userData?.hotspotId) return o.userData.hotspotId;
      o = o.parent;
    }
    return null;
  }

  _makeObject(def) {
    const type = def?.type || "box";
    const pos = vec3From(def.position || [0, 0, 0]);
    const rot = vec3From(def.rotation || [0, 0, 0]);

    let mesh = null;

    if (type === "box") {
      const size = def.size || [1, 1, 1];
      const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color || 0x2a2a2a,
        roughness: def.roughness ?? 0.95,
        metalness: def.metalness ?? 0.0,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
    } else if (type === "neon") {
      const size = def.size || [1.4, 0.3, 0.08];
      const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color || 0x331010,
        emissive: def.emissive || 0xff3a2a,
        emissiveIntensity: def.emissiveIntensity ?? 2.5,
        roughness: 0.6,
        metalness: 0.0,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      const light = new THREE.PointLight(def.emissive || 0xff3a2a, 1.6, 10, 2);
      light.position.copy(pos).add(new THREE.Vector3(0, 0, 0.6));
      mesh.add(light);
    } else if (type === "character") {
      mesh = this._makeCharacter({
        color: def.color || 0x222226,
        emissive: def.emissive || 0x000000,
      });
      mesh.position.copy(pos);
    } else if (type === "prop") {
      const size = def.size || [0.6, 0.6, 0.6];
      const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color || 0x3a3025,
        roughness: 0.9,
        metalness: 0.0,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
    } else {
      return null;
    }

    mesh.rotation.set(rot.x, rot.y, rot.z);
    if (def.hotspotId) mesh.userData.hotspotId = def.hotspotId;
    return mesh;
  }

  _makeCharacter({ color, emissive }) {
    const g = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.75, 6, 10);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.95,
      metalness: 0.0,
      emissive,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.9, 0);
    g.add(body);

    const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x1b1a1c,
      roughness: 0.9,
      metalness: 0.0,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.55, 0);
    g.add(head);

    return g;
  }

  _resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _tick(t) {
    const dt = Math.min(0.05, (t - this._tPrev) / 1000);
    this._tPrev = t;

    // Player movement
    if (this._player && this._playerTarget) {
      const p = this._player.position;
      const to = this._playerTarget;
      const dir = to.clone().sub(p);
      const dist = dir.length();
      if (dist < 0.05) {
        this._playerTarget = null;
      } else {
        dir.normalize();
        const speed = 2.2;
        p.addScaledVector(dir, speed * dt);
        this._player.lookAt(to.x, p.y + 1.2, to.z);
      }
    }

    // Cinematic shot tween
    if (this._shotAnim) {
      const a = this._shotAnim;
      const u = clamp((t - a.t0) / a.ms, 0, 1);
      // Smoothstep
      const s = u * u * (3 - 2 * u);
      this.camera.position.set(
        lerp(a.fromPos.x, a.toPos.x, s),
        lerp(a.fromPos.y, a.toPos.y, s),
        lerp(a.fromPos.z, a.toPos.z, s),
      );
      this.camera.fov = lerp(a.fromFov, a.toFov, s);
      this.camera.updateProjectionMatrix();
      const lx = lerp(a.fromLook.x, a.toLook.x, s);
      const ly = lerp(a.fromLook.y, a.toLook.y, s);
      const lz = lerp(a.fromLook.z, a.toLook.z, s);
      this.camera.lookAt(lx, ly, lz);
      if (u >= 1) this._shotAnim = null;
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((t2) => this._tick(t2));
  }
}

