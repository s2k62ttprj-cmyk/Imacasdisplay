// Three.js renderer for the logical cube: physically based plastic, studio lighting,
// animated layer turns, orbit + swipe-to-turn interaction.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createCube, cloneCube, applyMove, parseMove, worldNormal, MOVE_RE,
} from './cube.js';

const STICKER_HEX = {
  U: 0xf6c700, // yellow
  D: 0xe8eaee, // white
  F: 0x00a35a, // green
  B: 0x1061d6, // blue
  R: 0xff6a13, // orange
  L: 0xd3203b, // red
};

const SPACING = 1.0;
const EASE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function roundedRectShape(size, radius) {
  const s = size / 2;
  const r = radius;
  const sh = new THREE.Shape();
  sh.moveTo(-s + r, -s);
  sh.lineTo(s - r, -s);
  sh.quadraticCurveTo(s, -s, s, -s + r);
  sh.lineTo(s, s - r);
  sh.quadraticCurveTo(s, s, s - r, s);
  sh.lineTo(-s + r, s);
  sh.quadraticCurveTo(-s, s, -s, s - r);
  sh.lineTo(-s, -s + r);
  sh.quadraticCurveTo(-s, -s, -s + r, -s);
  return sh;
}

export class CubeView {
  constructor(canvas) {
    this.canvas = canvas;
    this.model = createCube();
    this.queue = [];
    this.anim = null;
    this.speed = 1;
    this.listeners = {};
    this.highlight = new Set();
    this.dimOthers = false;
    this.interactive = true;
    this.turnEnabled = true;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.cam = { yaw: THREE.MathUtils.degToRad(28), pitch: THREE.MathUtils.degToRad(24), dist: 11.2 };
    this.camTarget = { ...this.cam };
    this.camVel = { yaw: 0, pitch: 0 };
    this.lookY = 0;

    // Lights
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1410, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(4, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -4; key.shadow.camera.right = 4;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1; key.shadow.camera.far = 25;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    this.key = key;
    const rim = new THREE.DirectionalLight(0x9db8ff, 1.4);
    rim.position.set(-6, 3, -7);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffe2c4, 0.5);
    fill.position.set(-5, -2, 6);
    scene.add(fill);

    // Ground contact shadow
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.32 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.25;
    ground.receiveShadow = true;
    scene.add(ground);
    this.ground = ground;

    // Soft blob shadow (always-on ambient occlusion feel)
    const blobTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
      grd.addColorStop(0, 'rgba(0,0,0,0.55)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = -2.24;
    scene.add(blob);

    this.root = new THREE.Group();
    scene.add(this.root);
    this.pivot = new THREE.Group();
    this.root.add(this.pivot);

    this.buildCubies();
    this.syncFromModel();

    this.raycaster = new THREE.Raycaster();
    this.bindInput();
    this.size = { w: 1, h: 1 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    this.idleSpin = false;
    renderer.setAnimationLoop(() => this.frame());
  }

  on(evt, fn) {
    (this.listeners[evt] ||= []).push(fn);
  }

  emit(evt, ...args) {
    for (const fn of this.listeners[evt] || []) fn(...args);
  }

  buildCubies() {
    const bodyGeo = new RoundedBoxGeometry(0.965, 0.965, 0.965, 5, 0.085);
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0b0e, roughness: 0.38, metalness: 0.0, clearcoat: 0.55, clearcoatRoughness: 0.35,
    });
    const stickerGeo = new THREE.ExtrudeGeometry(roundedRectShape(0.82, 0.13), {
      depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 8,
    });
    stickerGeo.translate(0, 0, -0.012);
    this.stickerMats = {};
    for (const [f, hex] of Object.entries(STICKER_HEX)) {
      this.stickerMats[f] = new THREE.MeshPhysicalMaterial({
        color: hex, roughness: 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.35, specularIntensity: 0.3,
        envMapIntensity: 0.45, emissive: hex, emissiveIntensity: 0,
      });
    }
    this.meshes = new Map(); // cubie id -> Object3D
    this.stickerMeshes = [];
    for (const c of this.model.cubies) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, this.bodyMat);
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      g.userData.stickers = [];
      for (const s of c.stickers) {
        const mat = this.stickerMats[s.color].clone();
        const m = new THREE.Mesh(stickerGeo, mat);
        const n = new THREE.Vector3(...s.local);
        m.position.copy(n.clone().multiplyScalar(0.4835));
        m.lookAt(n.clone().multiplyScalar(2));
        m.userData = { cubieId: c.id, local: s.local, color: s.color };
        m.castShadow = false;
        g.add(m);
        g.userData.stickers.push(m);
        this.stickerMeshes.push(m);
      }
      g.userData.cubieId = c.id;
      this.root.add(g);
      this.meshes.set(c.id, g);
    }
  }

  syncFromModel() {
    const basis = new THREE.Matrix4();
    for (const c of this.model.cubies) {
      const g = this.meshes.get(c.id);
      if (g.parent !== this.root) this.root.attach(g);
      g.position.set(c.pos[0] * SPACING, c.pos[1] * SPACING, c.pos[2] * SPACING);
      basis.makeBasis(new THREE.Vector3(...c.cols[0]), new THREE.Vector3(...c.cols[1]), new THREE.Vector3(...c.cols[2]));
      g.quaternion.setFromRotationMatrix(basis);
    }
    this.pivot.rotation.set(0, 0, 0);
  }

  // ----- state -----
  setState(model) {
    this.queue = [];
    this.anim = null;
    this.model = cloneCube(model);
    this.syncFromModel();
    this.emit('state', this.model);
  }

  getState() {
    // logical state after all queued moves
    const m = cloneCube(this.model);
    if (this.anim) applyMove(m, this.anim.token);
    for (const q of this.queue) applyMove(m, q.token);
    return m;
  }

  get busy() {
    return !!this.anim || this.queue.length > 0;
  }

  enqueue(tokens, opts = {}) {
    const list = Array.isArray(tokens) ? tokens : [tokens];
    for (const t of list) {
      if (!MOVE_RE.test(t)) continue;
      this.queue.push({ token: t, user: !!opts.user, meta: opts.meta });
    }
  }

  clearQueue() {
    this.queue = [];
  }

  finishNow() {
    if (this.anim) {
      applyMove(this.model, this.anim.token);
      this.anim = null;
    }
    for (const q of this.queue) applyMove(this.model, q.token);
    this.queue = [];
    this.syncFromModel();
  }

  startNext() {
    const next = this.queue.shift();
    if (!next) return;
    const mv = parseMove(next.token);
    this.syncFromModel();
    const ids = new Set(this.model.cubies.filter((c) => mv.layers.includes(c.pos[mv.axis])).map((c) => c.id));
    for (const id of ids) this.pivot.attach(this.meshes.get(id));
    const base = mv.turns === 2 || mv.turns === -2 ? 0.42 : 0.3;
    const dur = (next.user ? 0.17 : base) / this.speed;
    this.anim = { token: next.token, mv, t: 0, dur, user: next.user, meta: next.meta };
    this.emit('movestart', next.token, next.meta);
  }

  // ----- camera -----
  setView(view, opts = {}) {
    const yaw = THREE.MathUtils.degToRad(28) + view * (Math.PI / 2);
    // shortest path from current yaw
    let d = yaw - this.camTarget.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.camTarget.yaw += d;
    if (opts.pitch !== undefined) this.camTarget.pitch = THREE.MathUtils.degToRad(opts.pitch);
    else this.camTarget.pitch = THREE.MathUtils.degToRad(24);
  }

  setFraming({ dist, lookY } = {}) {
    if (dist !== undefined) this.camTarget.dist = dist;
    if (lookY !== undefined) this.lookYTarget = lookY;
  }

  // ----- highlighting -----
  setHighlight(ids, { dim = false } = {}) {
    this.highlight = new Set(ids || []);
    this.dimOthers = dim && this.highlight.size > 0;
  }

  // ----- input -----
  bindInput() {
    const el = this.canvas;
    let drag = null;
    const ndc = (e) => {
      const r = el.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    el.addEventListener('pointerdown', (e) => {
      if (!this.interactive) return;
      el.setPointerCapture(e.pointerId);
      let hit = null;
      if (this.turnEnabled) {
        this.raycaster.setFromCamera(ndc(e), this.camera);
        const hits = this.raycaster.intersectObjects(this.stickerMeshes, false);
        if (hits.length) hit = hits[0];
      }
      drag = {
        id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), hit, decided: false,
      };
      this.camVel.yaw = 0;
      this.camVel.pitch = 0;
      this.userOrbiting = true;
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (drag.hit && !drag.decided) {
        if (Math.hypot(dx, dy) > 14) {
          drag.decided = true;
          const tok = this.swipeToMove(drag.hit, dx, dy);
          if (tok) {
            this.enqueue(tok, { user: true });
            this.emit('usermove', tok);
          }
        }
        return;
      }
      if (drag.decided) return;
      const mx = e.clientX - drag.lx;
      const my = e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      const k = 0.0085;
      this.camTarget.yaw -= mx * k;
      this.camTarget.pitch = THREE.MathUtils.clamp(this.camTarget.pitch + my * k, -1.2, 1.25);
      this.camVel.yaw = -mx * k;
      this.camVel.pitch = my * k;
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      this.userOrbiting = false;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  swipeToMove(hit, dx, dy) {
    const sticker = hit.object;
    const cubie = this.model.cubies.find((c) => c.id === sticker.userData.cubieId);
    if (!cubie || this.busy) return null;
    const n = worldNormal(cubie, sticker.userData.local);
    const nAxis = n[0] ? 0 : n[1] ? 1 : 2;
    const axes = [0, 1, 2].filter((a) => a !== nAxis);
    const center = new THREE.Vector3(...cubie.pos).multiplyScalar(SPACING).add(new THREE.Vector3(...n).multiplyScalar(0.5));
    this.root.updateMatrixWorld();
    const proj = (v) => {
      const p = v.clone().applyMatrix4(this.root.matrixWorld).project(this.camera);
      const r = this.canvas.getBoundingClientRect();
      return new THREE.Vector2((p.x * 0.5 + 0.5) * r.width, (-p.y * 0.5 + 0.5) * r.height);
    };
    const p0 = proj(center);
    const drag = new THREE.Vector2(dx, dy).normalize();
    let best = null;
    for (const a of axes) {
      const dir = new THREE.Vector3(0, 0, 0);
      dir.setComponent(a, 1);
      const s = proj(center.clone().add(dir)).sub(p0).normalize();
      const dot = s.dot(drag);
      if (!best || Math.abs(dot) > Math.abs(best.dot)) best = { a, dot };
    }
    // moving along axis best.a (sign of dot) => rotation about r = n × a
    const aVec = [0, 0, 0];
    aVec[best.a] = Math.sign(best.dot);
    const r = [
      n[1] * aVec[2] - n[2] * aVec[1],
      n[2] * aVec[0] - n[0] * aVec[2],
      n[0] * aVec[1] - n[1] * aVec[0],
    ];
    const rAxis = r[0] ? 0 : r[1] ? 1 : 2;
    const q = Math.sign(r[rAxis]); // +90 about +rAxis if r points along +axis
    const layer = cubie.pos[rAxis];
    return tokenFor(rAxis, layer, q);
  }

  // ----- loop -----
  // Reserve screen space (px) for UI above/below so the cube centres in the free area.
  setInsets(top, bottom) {
    this.insetTarget = { top, bottom };
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.size = { w, h };
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  updateFraming(k) {
    const { w, h } = this.size;
    const tgt = this.insetTarget || { top: 0, bottom: 0 };
    this.inset = this.inset || { ...tgt };
    this.inset.top += (tgt.top - this.inset.top) * k;
    this.inset.bottom += (tgt.bottom - this.inset.bottom) * k;
    const avail = Math.max(120, h - this.inset.top - this.inset.bottom);
    // vertical FOV chosen so the cube (~5.2 units incl. shadow margin) fits the free band and width
    const fitH = 2 * Math.atan((4.5 / 2) / this.cam.dist * (h / avail)) * 180 / Math.PI;
    const fitW = 2 * Math.atan((5.6 / 2) / this.cam.dist * (h / w)) * 180 / Math.PI;
    this.camera.fov = Math.max(fitH, fitW);
    const shift = (this.inset.bottom - this.inset.top) / 2;
    this.camera.setViewOffset(w, h, 0, shift, w, h);
    this.camera.updateProjectionMatrix();
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    // animation
    if (!this.anim && this.queue.length) this.startNext();
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.dur);
      const ang = (a.mv.q * Math.PI) / 2 * EASE(a.t);
      this.pivot.rotation.set(0, 0, 0);
      this.pivot.rotation[['x', 'y', 'z'][a.mv.axis]] = ang;
      if (a.t >= 1) {
        applyMove(this.model, a.token);
        this.syncFromModel();
        this.anim = null;
        this.emit('moveend', a.token, a.meta, a.user);
        if (!this.queue.length) this.emit('idle');
        if (this.queue.length) this.startNext();
      }
    }
    // camera inertia + easing
    if (!this.userOrbiting && (Math.abs(this.camVel.yaw) > 1e-5 || Math.abs(this.camVel.pitch) > 1e-5)) {
      this.camTarget.yaw += this.camVel.yaw;
      this.camTarget.pitch = THREE.MathUtils.clamp(this.camTarget.pitch + this.camVel.pitch, -1.2, 1.25);
      this.camVel.yaw *= 0.92;
      this.camVel.pitch *= 0.92;
    }
    if (this.idleSpin && !this.userOrbiting) this.camTarget.yaw += dt * 0.25;
    const k = 1 - Math.exp(-dt * 7);
    this.cam.yaw += (this.camTarget.yaw - this.cam.yaw) * k;
    this.cam.pitch += (this.camTarget.pitch - this.cam.pitch) * k;
    this.cam.dist += (this.camTarget.dist - this.cam.dist) * k;
    if (this.lookYTarget !== undefined) this.lookY += (this.lookYTarget - this.lookY) * k;
    this.updateFraming(k);
    const { yaw, pitch, dist } = this.cam;
    this.camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist + this.lookY,
      Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    this.camera.lookAt(0, this.lookY, 0);
    // keep light roughly relative to camera so the lit side always faces the viewer
    this.key.position.set(Math.sin(yaw + 0.6) * 8, 7, Math.cos(yaw + 0.6) * 8);

    // highlight pulse
    const t = performance.now() / 1000;
    const pulse = 0.18 + 0.14 * Math.sin(t * 4.2);
    for (const [id, g] of this.meshes) {
      const on = this.highlight.has(id);
      for (const m of g.userData.stickers) {
        m.material.emissiveIntensity = on ? pulse : 0;
        const dim = this.dimOthers && !on;
        m.material.color.setHex(STICKER_HEX[m.userData.color]);
        if (dim) m.material.color.multiplyScalar(0.28);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}

const TOKENS = {
  '0:1': 'R', '0:-1': 'L', '0:0': 'M',
  '1:1': 'U', '1:-1': 'D', '1:0': 'E',
  '2:1': 'F', '2:-1': 'B', '2:0': 'S',
};

export function tokenFor(axis, layer, q) {
  const base = TOKENS[`${axis}:${layer}`];
  const baseQ = parseMove(base).q;
  return q === baseQ ? base : `${base}'`;
}
