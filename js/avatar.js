/* =========================================================
   Multiskolan – 3D-gubbe (Three.js + Kenney-modell)
   createStage(canvas)          -> { setLook, focus, bounce, wave, play, dispose }
   renderPortrait(look, gender) -> Promise<dataURL>
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { paintSkin, loadPreset, shade } from './skin.js';

const ASSETS = new URL('../assets/', import.meta.url).href;
const HEIGHT = 1.75;                 // gubbens längd i scenen (meter)

/* ---------- Ladda modell + animationer (en gång) ---------- */
let assetsPromise = null;
function loadAssets() {
  if (assetsPromise) return assetsPromise;
  const L = new FBXLoader();
  const pick = (o, n) => o.animations.find(a => a.name.toLowerCase().includes(n)) || o.animations[0];
  assetsPromise = Promise.all([
    L.loadAsync(ASSETS + 'models/characterMedium.fbx'),
    L.loadAsync(ASSETS + 'anims/idle.fbx'),
    L.loadAsync(ASSETS + 'anims/jump.fbx'),
    L.loadAsync(ASSETS + 'anims/run.fbx')
  ]).then(([model, idle, jump, run]) => {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const scale = HEIGHT / (box.max.y - box.min.y);
    const parts = measure(model);
    return { model, scale, parts, clips: { idle: pick(idle, 'idle'), jump: pick(jump, 'jump'), run: pick(run, 'run') } };
  });
  return assetsPromise;
}

/* Mät kroppsdelar i viloläget (i modellens egna enheter) */
function measure(model) {
  let sm = null;
  model.traverse(o => { if (o.isSkinnedMesh && !sm) sm = o; });
  const g = sm.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const names = sm.skeleton.bones.map(b => b.name);
  const groups = {
    head: ['Head', 'Head_end'],
    hips: ['Hips', 'Spine'],
    chest: ['Chest', 'UpperChest'],
    legs: ['LeftUpLeg', 'RightUpLeg']
  };
  const out = {};
  for (const k in groups) out[k] = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    let b = 0, w = -1;
    for (let k = 0; k < 4; k++) { const ww = sw.getComponent(i, k); if (ww > w) { w = ww; b = si.getComponent(i, k); } }
    const n = names[b];
    for (const k in groups) if (groups[k].includes(n)) {
      v.fromBufferAttribute(pos, i).applyMatrix4(sm.matrixWorld);
      out[k].expandByPoint(v);
    }
  }
  return out;
}

/* ---------- Hjälp för 3D-tillbehör ---------- */
const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...extra });
function mesh(geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}
function tube(pts, r0, r1, m) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const TS = 32, RS = 12;
  const g = new THREE.TubeGeometry(curve, TS, 1, RS, false);
  const pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= TS; i++) {
    const t = i / TS;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= RS; j++) {
      const k = i * (RS + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).normalize().multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  const grp = new THREE.Group();
  grp.add(mesh(g, m));
  const e = curve.getPointAt(1), s = curve.getPointAt(0);
  grp.add(mesh(new THREE.SphereGeometry(r1, 12, 8), m, e.x, e.y, e.z));
  grp.add(mesh(new THREE.SphereGeometry(r0, 12, 8), m, s.x, s.y, s.z));
  return grp;
}

/* Hår, hattar och kjol som 3D-delar. Koordinater i modellens enheter. */
function buildExtras(look, parts) {
  const head = new THREE.Group(), hips = new THREE.Group();
  const hb = parts.head, c = hb.getCenter(new THREE.Vector3()), s = hb.getSize(new THREE.Vector3());
  const top = hb.max.y, back = hb.min.z, W = s.x, H = s.y, D = s.z;
  const hm = mat(look.hairColor, { roughness: 0.55 });
  const preset = look.outfit && look.outfit !== 'egen';

  if (!preset) switch (look.hair) {
    case 'lang': {
      const g = new THREE.CapsuleGeometry(W * 0.44, H * 0.5, 4, 16);
      const m = mesh(g, hm, c.x, top - H * 0.66, back + D * 0.16);
      m.scale.set(1, 1, 0.36);
      head.add(m);
      break;
    }
    case 'hastsvans': {
      const y = top - H * 0.16, z = back + D * 0.04;
      head.add(tube([[c.x, y, z], [c.x, y - H * 0.05, z - D * 0.22], [c.x, y - H * 0.38, z - D * 0.26], [c.x, y - H * 0.7, z - D * 0.12]], W * 0.13, W * 0.05, hm));
      head.add(mesh(new THREE.TorusGeometry(W * 0.12, W * 0.035, 8, 20), mat(look.topColor), c.x, y - H * 0.01, z - D * 0.05));
      break;
    }
    case 'tofsar':
      for (const sx of [-1, 1]) {
        const x = c.x + sx * W * 0.5, y = top - H * 0.32, z = c.z - D * 0.12;
        head.add(tube([[x, y, z], [x + sx * W * 0.2, y - H * 0.04, z], [x + sx * W * 0.28, y - H * 0.35, z], [x + sx * W * 0.22, y - H * 0.62, z + D * 0.04]], W * 0.11, W * 0.05, hm));
        const b = mesh(new THREE.TorusGeometry(W * 0.1, W * 0.03, 8, 20), mat(look.topColor), x + sx * W * 0.04, y, z);
        b.rotation.y = Math.PI / 2;
        head.add(b);
      }
      break;
    case 'knut': {
      const b = mesh(new THREE.SphereGeometry(W * 0.24, 16, 12), hm, c.x, top + H * 0.08, c.z - D * 0.12);
      b.scale.y = 0.85;
      head.add(b);
      break;
    }
    case 'lockigt':
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        head.add(mesh(new THREE.SphereGeometry(W * 0.15, 10, 8), hm, c.x + Math.cos(a) * W * 0.42, top - H * 0.08 + Math.sin(i * 1.7) * H * 0.02, c.z + Math.sin(a) * D * 0.42 - D * 0.04));
      }
      head.add(mesh(new THREE.SphereGeometry(W * 0.36, 16, 10), hm, c.x, top - H * 0.08, c.z - D * 0.04));
      break;
  }

  // Hattar
  const hc = look.hatColor || '#e23b4e';
  switch (look.hat) {
    case 'keps': {
      const dome = mesh(new THREE.SphereGeometry(W * 0.56, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(hc), c.x, top - H * 0.24, c.z);
      dome.scale.set(1.0, 0.75, (D / W) * 1.02);
      head.add(dome);
      const brim = mesh(new THREE.CylinderGeometry(W * 0.4, W * 0.4, H * 0.03, 24, 1, false, -Math.PI / 2, Math.PI), mat(shade(hc, -0.15)), c.x, top - H * 0.24, hb.max.z - D * 0.08);
      brim.scale.z = 1.1;
      head.add(brim);
      head.add(mesh(new THREE.SphereGeometry(W * 0.06, 10, 8), mat(shade(hc, -0.2)), c.x, top + H * 0.17, c.z));
      break;
    }
    case 'mossa': {
      const dome = mesh(new THREE.SphereGeometry(W * 0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(hc, { roughness: 0.95 }), c.x, top - H * 0.3, c.z);
      dome.scale.set(1, 0.95, (D / W) * 1.04);
      head.add(dome);
      const rim = mesh(new THREE.CylinderGeometry(W * 0.59, W * 0.6, H * 0.1, 24), mat(shade(hc, -0.15), { roughness: 0.95 }), c.x, top - H * 0.3, c.z);
      rim.scale.z = (D / W) * 1.04;
      head.add(rim);
      head.add(mesh(new THREE.SphereGeometry(W * 0.14, 12, 10), mat('#ffffff', { roughness: 1 }), c.x, top + H * 0.28, c.z));
      break;
    }
    case 'krona': {
      const gold = mat('#ffd34a', { metalness: 0.7, roughness: 0.25 });
      const r = W * 0.36, y = top + H * 0.02;
      head.add(mesh(new THREE.CylinderGeometry(r, r * 1.04, H * 0.12, 24, 1, true), gold, c.x, y, c.z));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        head.add(mesh(new THREE.ConeGeometry(W * 0.07, H * 0.16, 8), gold, c.x + Math.cos(a) * r, y + H * 0.13, c.z + Math.sin(a) * r));
        head.add(mesh(new THREE.SphereGeometry(W * 0.04, 10, 8), mat(['#ff4d6d', '#3ec7ff', '#8dff5a'][i % 3], { roughness: 0.2 }), c.x + Math.cos(a) * r * 1.02, y, c.z + Math.sin(a) * r * 1.02));
      }
      break;
    }
    case 'rosett': {
      const m = mat(hc);
      const x = c.x + W * 0.3, y = top + H * 0.02, z = c.z + D * 0.1;
      for (const sx of [-1, 1]) {
        const cone = mesh(new THREE.ConeGeometry(W * 0.13, W * 0.26, 12), m, x + sx * W * 0.13, y, z);
        cone.rotation.z = sx * Math.PI / 2;
        cone.scale.z = 0.5;
        head.add(cone);
      }
      head.add(mesh(new THREE.SphereGeometry(W * 0.07, 12, 10), mat(shade(hc, -0.15)), x, y, z));
      break;
    }
    case 'horlurar': {
      const m = mat(hc, { roughness: 0.4 });
      head.add(mesh(new THREE.TorusGeometry(W * 0.56, W * 0.045, 8, 32, Math.PI), m, c.x, c.y + H * 0.05, c.z));
      for (const sx of [-1, 1]) {
        const cup = mesh(new THREE.CylinderGeometry(W * 0.16, W * 0.16, W * 0.12, 20), mat('#2a2f45', { roughness: 0.4 }), c.x + sx * W * 0.56, c.y + H * 0.02, c.z);
        cup.rotation.z = Math.PI / 2;
        head.add(cup);
      }
      break;
    }
  }

  // Kjol / klänning
  const dress = look.top === 'klanning';
  if (!preset && (dress || look.bottom === 'kjol')) {
    const hp = parts.hips, lg = parts.legs;
    const hsz = hp.getSize(new THREE.Vector3()), lsz = lg.getSize(new THREE.Vector3()), hcen = hp.getCenter(new THREE.Vector3());
    const topY = hp.min.y + hsz.y * 0.62, len = lsz.y * (dress ? 1.3 : 1.0);
    const r0 = hsz.x * 0.53, r1 = lsz.x * (dress ? 0.72 : 0.64);
    const col = dress ? look.topColor : look.bottomColor;
    const skirt = mesh(new THREE.CylinderGeometry(r0, r1, len, 28, 3, true), mat(col, { roughness: 0.85, side: THREE.DoubleSide }), hcen.x, topY - len / 2, hcen.z);
    skirt.scale.z = hsz.z / hsz.x * 1.25;
    hips.add(skirt);
    const hem = mesh(new THREE.TorusGeometry(r1, len * 0.03, 6, 40), mat(shade(col, -0.18)), hcen.x, topY - len, hcen.z);
    hem.rotation.x = Math.PI / 2;
    hem.scale.y = skirt.scale.z;
    hips.add(hem);
  }
  return { head, hips };
}

/* ---------- Skapa en gubbe ---------- */
async function textureFor(look, gender) {
  if (look.outfit && look.outfit !== 'egen') {
    try { return { open: await loadPreset(look.outfit), closed: null }; } catch (e) { console.error(e); }
  }
  return { open: paintSkin(look, gender), closed: paintSkin(look, gender, { blink: true }) };
}

async function createCharacter(look, gender) {
  const A = await loadAssets();
  const root = new THREE.Group();
  root.scale.setScalar(A.scale);
  const model = SkeletonUtils.clone(A.model);
  root.add(model);

  let skinned = null;
  const bones = {};
  model.traverse(o => {
    if (o.isSkinnedMesh) { skinned = o; o.castShadow = true; o.frustumCulled = false; }
    if (o.isBone) bones[o.name] = o;
  });

  const canv = await textureFor(look, gender);
  const mk = cv => { if (!cv) return null; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const texOpen = mk(canv.open), texClosed = mk(canv.closed);
  skinned.material = new THREE.MeshStandardMaterial({ map: texOpen, roughness: 0.78, metalness: 0 });

  // 3D-tillbehör fästs på huvud- och höftbenet
  const ex = buildExtras(look, A.parts);
  root.add(ex.head, ex.hips);
  root.updateMatrixWorld(true);
  [...ex.head.children].forEach(o => bones.Head.attach(o));
  [...ex.hips.children].forEach(o => bones.Hips.attach(o));
  root.remove(ex.head, ex.hips);

  // Animationer
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const k in A.clips) actions[k] = mixer.clipAction(A.clips[k]);
  actions.jump.setLoop(THREE.LoopOnce, 1);
  actions.jump.clampWhenFinished = true;
  let current = actions.idle;
  current.play();
  let after = 'idle';
  mixer.addEventListener('finished', e => {
    if (e.action === actions.jump) play(after, 0.25);
  });
  function play(name, fade = 0.2) {
    const next = actions[name];
    if (!next) return;
    if (name === 'jump') after = current === actions.run ? 'run' : 'idle';
    if (next === current && name !== 'jump') return;
    next.reset().setEffectiveWeight(1).play();
    if (current !== next) current.crossFadeTo(next, fade, false);
    current = next;
  }

  let blinkT = -1, nextBlink = 1.5 + Math.random() * 2, time = 0;
  return {
    root, bones, mixer, play,
    get state() { return current === actions.run ? 'run' : current === actions.jump ? 'jump' : 'idle'; },
    update(dt, lookX = 0, lookY = 0) {
      time += dt;
      mixer.update(dt);
      // Huvudet tittar lite mot pekaren
      if (bones.Head && current === actions.idle) {
        bones.Head.rotateY(lookX * 0.35);
        bones.Head.rotateX(lookY * 0.15);
      }
      // Blinka
      if (texClosed) {
        if (time > nextBlink && blinkT < 0) { blinkT = 0; skinned.material.map = texClosed; }
        if (blinkT >= 0) {
          blinkT += dt;
          if (blinkT > 0.13) { blinkT = -1; nextBlink = time + 2 + Math.random() * 3; skinned.material.map = texOpen; }
        }
      }
    },
    dispose() {
      mixer.stopAllAction();
      texOpen && texOpen.dispose();
      texClosed && texClosed.dispose();
      skinned.material.dispose();
      root.traverse(o => {
        if (o.isMesh && !o.isSkinnedMesh) { o.geometry.dispose(); o.material.dispose(); }
      });
    }
  };
}

/* ---------- Ljus ---------- */
function addLights(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xeef2ff, 0x3a2f7b, 1.1));
  const key = new THREE.DirectionalLight(0xfff4ea, 2.0);
  key.position.set(1.8, 3.8, 3);
  scene.add(key);
  const rimPink = new THREE.DirectionalLight(0xff5ccf, 1.3);
  rimPink.position.set(-3, 2.5, -2.5);
  scene.add(rimPink);
  const rimCyan = new THREE.DirectionalLight(0x3ee8ff, 1.3);
  rimCyan.position.set(3, 2.5, -2.5);
  scene.add(rimCyan);
  return key;
}

/* ---------- Scen med podium och kamera ---------- */
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const key = addLights(scene, renderer);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 2.2, bottom: -0.3, near: 0.5, far: 10 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  camera.position.set(0, 1.2, 4.6);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.88, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.9;
  controls.maxDistance = 6;
  controls.minPolarAngle = Math.PI * 0.25;
  controls.maxPolarAngle = Math.PI * 0.6;
  controls.rotateSpeed = 0.7;

  // Podium
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x2b2080, roughness: 0.35, metalness: 0.4 }));
  ped.position.y = -0.07;
  ped.receiveShadow = true;
  scene.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.012, 12, 128), new THREE.MeshBasicMaterial({ color: 0x3ee8ff }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.005;
  scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.008, 12, 128), new THREE.MeshBasicMaterial({ color: 0xff5ccf }));
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = -0.1;
  scene.add(ring2);
  const gc = document.createElement('canvas');
  gc.width = gc.height = 128;
  const gx = gc.getContext('2d');
  const grad = gx.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(62,232,255,0.35)');
  grad.addColorStop(0.7, 'rgba(62,232,255,0.08)');
  grad.addColorStop(1, 'rgba(62,232,255,0)');
  gx.fillStyle = grad;
  gx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.14;
  scene.add(glow);

  // Gnistor
  const N = 70, pos = new Float32Array(N * 3), speeds = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.55 + Math.random() * 0.3;
    pos.set([Math.cos(a) * r, Math.random() * 1.9, Math.sin(a) * r], i * 3);
    speeds.push(0.08 + Math.random() * 0.15);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xbff8ff, size: 0.022, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })));

  // Kamerafokus (justeras när modellen har laddats)
  const FOCUS = {
    body: { t: [0, 0.88, 0], d: 4.6 }, head: { t: [0, 1.45, 0], d: 1.8 }, eyes: { t: [0, 1.45, 0], d: 1.3 },
    top: { t: [0, 1.0, 0], d: 2.6 }, bottom: { t: [0, 0.5, 0], d: 2.6 }, shoes: { t: [0, 0.15, 0], d: 1.9 }, hat: { t: [0, 1.6, 0], d: 2 }
  };
  loadAssets().then(A => {
    const s = A.scale, h = A.parts.head;
    const hc = h.getCenter(new THREE.Vector3()).multiplyScalar(s), hs = h.getSize(new THREE.Vector3()).multiplyScalar(s);
    FOCUS.head = { t: [0, hc.y, 0], d: hs.y * 6.5 };
    FOCUS.eyes = { t: [0, hc.y, 0], d: hs.y * 4.6 };
    FOCUS.hat = { t: [0, hc.y + hs.y * 0.3, 0], d: hs.y * 7.5 };
  }).catch(() => {});
  const desiredTarget = new THREE.Vector3(0, 0.88, 0);
  let desiredDist = 4.6, tween = 0;

  let ch = null, buildId = 0;
  const holder = new THREE.Group();
  scene.add(holder);

  let lookX = 0, lookY = 0, lx = 0, ly = 0;
  const onMove = e => {
    const r = canvas.getBoundingClientRect();
    lookX = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    lookY = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.35) * 2));
  };
  window.addEventListener('pointermove', onMove);

  // Klick på gubben = hopp
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6 || !ch) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const box = new THREE.Box3().setFromObject(ch.root);
    if (ray.ray.intersectsBox(box)) ch.play('jump', 0.1);
  });

  function resize() {
    const p = canvas.parentElement;
    const w = p.clientWidth, h = p.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  resize();

  const clock = new THREE.Clock();
  let raf = 0, alive = true;
  const tmp = new THREE.Vector3();
  const sparksAttr = pGeo.attributes.position;

  function animate() {
    if (!alive) return;
    raf = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (canvas.offsetParent === null) return;
    if (tween > 0) {
      tween -= dt;
      const k = 1 - Math.pow(0.004, dt);
      controls.target.lerp(desiredTarget, k);
      tmp.subVectors(camera.position, controls.target);
      const len = tmp.length() + (desiredDist - tmp.length()) * k;
      camera.position.copy(controls.target).add(tmp.setLength(len));
    }
    controls.update();
    for (let i = 0; i < N; i++) {
      let y = sparksAttr.getY(i) + speeds[i] * dt;
      if (y > 1.9) y = 0;
      sparksAttr.setY(i, y);
    }
    sparksAttr.needsUpdate = true;
    ring.material.color.setHSL(0.52 + Math.sin(t * 0.8) * 0.03, 1, 0.62);
    lx += (lookX - lx) * 0.06;
    ly += (lookY - ly) * 0.06;
    if (ch) ch.update(dt, lx, ly);
    renderer.render(scene, camera);
  }
  animate();

  return {
    async setLook(lookData, gender) {
      const id = ++buildId;
      const next = await createCharacter(lookData, gender);
      if (id !== buildId) { next.dispose(); return; }   // en nyare ändring hann före
      const wasState = ch ? ch.state : 'idle';
      if (ch) { holder.remove(ch.root); ch.dispose(); }
      ch = next;
      holder.add(ch.root);
      if (wasState === 'run') ch.play('run', 0);
    },
    focus(name) {
      const f = FOCUS[name] || FOCUS.body;
      desiredTarget.set(...f.t);
      desiredDist = f.d;
      tween = 1.4;
    },
    bounce() { ch && ch.play('jump', 0.1); },
    wave() { ch && ch.play('jump', 0.1); },
    play(name) { ch && ch.play(name); },
    get state() { return ch ? ch.state : 'idle'; },
    _debug: { camera, controls, get ch() { return ch; } },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      if (ch) ch.dispose();
      controls.dispose();
      renderer.dispose();
    }
  };
}

/* ---------- Porträtt till "Vem spelar?" ---------- */
let pr = null;
function portraitRig() {
  if (pr) return pr;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  addLights(scene, renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  pr = { renderer, scene, camera };
  return pr;
}
let portraitQueue = Promise.resolve();
export function renderPortrait(look, gender, size = 256) {
  const job = portraitQueue.then(async () => {
    const A = await loadAssets();
    const { renderer, scene, camera } = portraitRig();
    renderer.setSize(size, size, false);
    const c = await createCharacter(look, gender);
    c.update(0.35);
    scene.add(c.root);
    const hb = A.parts.head, s = A.scale;
    const hc = hb.getCenter(new THREE.Vector3()).multiplyScalar(s), hs = hb.getSize(new THREE.Vector3()).multiplyScalar(s);
    const ty = hc.y - hs.y * (look.hat && look.hat !== 'ingen' ? 0.3 : 0.5);
    camera.position.set(hs.x * 0.9, ty + hs.y * 0.2, hs.y * 4.0);
    camera.lookAt(0, ty, 0);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(c.root);
    c.dispose();
    return url;
  });
  portraitQueue = job.catch(() => {});
  return job;
}

export function preload() { return loadAssets(); }
