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
import { paintSkin, loadPreset, shade, resolveLook } from './skin.js';

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
    legs: ['LeftUpLeg', 'RightUpLeg'],
    lfoot: ['LeftFoot', 'LeftToes', 'LeftToes_end'],
    rfoot: ['RightFoot', 'RightToes', 'RightToes_end']
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

/* Hår, hattar, kjol, cape och skodelar som 3D. Koordinater i modellens enheter. */
const sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
function buildExtras(lookIn, parts) {
  const look = resolveLook(lookIn);
  const G = { head: new THREE.Group(), hips: new THREE.Group(), chest: new THREE.Group(), lfoot: new THREE.Group(), rfoot: new THREE.Group() };
  const head = G.head;
  const hb = parts.head, c = hb.getCenter(new THREE.Vector3()), s = hb.getSize(new THREE.Vector3());
  const top = hb.max.y, back = hb.min.z, front = hb.max.z, W = s.x, H = s.y, D = s.z;
  const glowCol = look.glow === 'guld' ? '#ffcf3a' : look.glow === 'rosa' ? '#ff5ccf' : null;
  const hm = mat(look.hairColor, glowCol ? { roughness: 0.3, metalness: 0.3, emissive: glowCol, emissiveIntensity: 0.35 } : { roughness: 0.55 });
  const preset = look.outfit && look.outfit !== 'egen';
  const backHair = (w, len) => { const m = mesh(new THREE.CapsuleGeometry(W * w, H * len, 4, 16), hm, c.x, top - H * 0.66, back + D * 0.16); m.scale.set(1, 1, 0.36); return m; };

  if (!preset) switch (look.hair) {
    case 'lang': head.add(backHair(0.44, 0.5)); break;
    case 'langlockar':
      head.add(backHair(0.46, 0.5));
      for (let i = 0; i < 9; i++) {
        const a = -1.2 + i * 0.3;
        head.add(mesh(sph(W * 0.11), hm, c.x + Math.sin(a) * W * 0.46, top - H * 1.05 + Math.abs(Math.sin(i * 2.1)) * H * 0.06, c.z - Math.cos(a) * D * 0.42));
      }
      break;
    case 'hastsvans': {
      const y = top - H * 0.16, z = back + D * 0.04;
      head.add(tube([[c.x, y, z], [c.x, y - H * 0.05, z - D * 0.22], [c.x, y - H * 0.38, z - D * 0.26], [c.x, y - H * 0.7, z - D * 0.12]], W * 0.13, W * 0.05, hm));
      head.add(mesh(new THREE.TorusGeometry(W * 0.12, W * 0.035, 8, 20), mat(look.topColor), c.x, y - H * 0.01, z - D * 0.05));
      break;
    }
    case 'flata': {
      const y = top - H * 0.3, z = back + D * 0.06;
      for (let i = 0; i < 9; i++) {
        const sx = (i % 2 ? 1 : -1) * W * 0.035;
        const b = mesh(sph(W * (0.12 - i * 0.006)), hm, c.x + sx, y - i * H * 0.1, z - D * 0.12 - Math.sin(i * 0.35) * D * 0.08);
        b.scale.set(1, 1.25, 0.9);
        head.add(b);
      }
      head.add(mesh(new THREE.TorusGeometry(W * 0.06, W * 0.025, 8, 16), mat(look.topColor), c.x, y - 8.6 * H * 0.1, z - D * 0.16));
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
      const b = mesh(sph(W * 0.24, 16, 12), hm, c.x, top + H * 0.08, c.z - D * 0.12);
      b.scale.y = 0.85;
      head.add(b);
      break;
    }
    case 'dubbelknut':
      for (const sx of [-1, 1]) head.add(mesh(sph(W * 0.19, 16, 12), hm, c.x + sx * W * 0.32, top + H * 0.02, c.z - D * 0.05));
      break;
    case 'lockigt':
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        head.add(mesh(sph(W * 0.15, 10, 8), hm, c.x + Math.cos(a) * W * 0.42, top - H * 0.08 + Math.sin(i * 1.7) * H * 0.02, c.z + Math.sin(a) * D * 0.42 - D * 0.04));
      }
      head.add(mesh(sph(W * 0.36, 16, 10), hm, c.x, top - H * 0.08, c.z - D * 0.04));
      break;
    case 'afro': {
      const a = mesh(sph(W * 0.72, 20, 14), hm, c.x, top - H * 0.12, c.z - D * 0.12);
      a.scale.set(1, 0.85, 0.95);
      head.add(a);
      for (let i = 0; i < 22; i++) {
        const t = i * 2.4, r = W * 0.68;
        head.add(mesh(sph(W * 0.13, 8, 6), hm, c.x + Math.cos(t) * r * Math.sin(i * 0.7 + 1), top - H * 0.12 + Math.cos(i * 0.7 + 1) * r * 0.85, c.z - D * 0.12 + Math.sin(t) * r * Math.sin(i * 0.7 + 1) * 0.95));
      }
      break;
    }
    case 'mohikan':
      for (let i = 0; i < 6; i++) {
        const t = i / 5, z = front - D * 0.12 - t * D * 0.85;
        const cone = mesh(new THREE.ConeGeometry(W * 0.09, H * (0.32 - Math.abs(t - 0.4) * 0.2), 8), hm, c.x, top - H * 0.02 - Math.pow(t - 0.35, 2) * H * 0.3, z);
        cone.rotation.x = -0.5 + t * 0.9;
        head.add(cone);
      }
      break;
    case 'spikigt':
      for (let i = 0; i < 10; i++) {
        const a = i * 2.39, r = W * (0.12 + (i % 3) * 0.1);
        const cone = mesh(new THREE.ConeGeometry(W * 0.08, H * 0.2, 7), hm, c.x + Math.cos(a) * r, top - H * 0.03, c.z + Math.sin(a) * r * 0.9 - D * 0.05);
        cone.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        head.add(cone);
      }
      break;
  }

  // Hattar
  const hc = look.hatColor || '#e23b4e';
  const gold = mat('#ffd34a', { metalness: 0.7, roughness: 0.25, ...(look.glow === 'guld' ? { emissive: '#ffb300', emissiveIntensity: 0.6 } : {}) });
  const band = (y, r = W * 0.56) => { const b = mesh(new THREE.TorusGeometry(r, W * 0.035, 8, 32, Math.PI), mat(hc, { roughness: 0.4 }), c.x, y, c.z); return b; };
  switch (look.hat) {
    case 'keps': {
      const dome = mesh(new THREE.SphereGeometry(W * 0.56, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(hc), c.x, top - H * 0.24, c.z);
      dome.scale.set(1.0, 0.75, (D / W) * 1.02);
      head.add(dome);
      const brim = mesh(new THREE.CylinderGeometry(W * 0.4, W * 0.4, H * 0.03, 24, 1, false, -Math.PI / 2, Math.PI), mat(shade(hc, -0.15)), c.x, top - H * 0.24, front - D * 0.08);
      brim.scale.z = 1.1;
      head.add(brim);
      head.add(mesh(sph(W * 0.06), mat(shade(hc, -0.2)), c.x, top + H * 0.17, c.z));
      break;
    }
    case 'mossa': {
      const dome = mesh(new THREE.SphereGeometry(W * 0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(hc, { roughness: 0.95 }), c.x, top - H * 0.3, c.z);
      dome.scale.set(1, 0.95, (D / W) * 1.04);
      head.add(dome);
      const rim = mesh(new THREE.CylinderGeometry(W * 0.59, W * 0.6, H * 0.1, 24), mat(shade(hc, -0.15), { roughness: 0.95 }), c.x, top - H * 0.3, c.z);
      rim.scale.z = (D / W) * 1.04;
      head.add(rim);
      head.add(mesh(sph(W * 0.14, 12, 10), mat('#ffffff', { roughness: 1 }), c.x, top + H * 0.28, c.z));
      break;
    }
    case 'krona': {
      const r = W * 0.36, y = top + H * 0.02;
      head.add(mesh(new THREE.CylinderGeometry(r, r * 1.04, H * 0.12, 24, 1, true), gold, c.x, y, c.z));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        head.add(mesh(new THREE.ConeGeometry(W * 0.07, H * 0.16, 8), gold, c.x + Math.cos(a) * r, y + H * 0.13, c.z + Math.sin(a) * r));
        head.add(mesh(sph(W * 0.04), mat(['#ff4d6d', '#3ec7ff', '#8dff5a'][i % 3], { roughness: 0.2 }), c.x + Math.cos(a) * r * 1.02, y, c.z + Math.sin(a) * r * 1.02));
      }
      break;
    }
    case 'tiara': {
      const m = mat(hc, { metalness: 0.6, roughness: 0.25, ...(look.glow === 'rosa' ? { emissive: '#ff5ccf', emissiveIntensity: 0.6 } : {}) });
      const arc = mesh(new THREE.TorusGeometry(W * 0.5, W * 0.025, 8, 32, Math.PI), m, c.x, top - H * 0.2, c.z + D * 0.05);
      arc.rotation.x = -Math.PI / 2 + 0.3;
      head.add(arc);
      for (let i = -2; i <= 2; i++) {
        const a = Math.PI / 2 + i * 0.32;
        const p = mesh(new THREE.ConeGeometry(W * 0.035, H * (0.1 + (2 - Math.abs(i)) * 0.05), 6), m, c.x + Math.cos(a) * W * 0.5, top - H * 0.12 + (2 - Math.abs(i)) * H * 0.03, c.z + D * 0.05 + Math.sin(a) * W * 0.47);
        head.add(p);
      }
      head.add(mesh(sph(W * 0.06), mat('#ffffff', { roughness: 0.05, metalness: 0.2 }), c.x, top - H * 0.02, c.z + D * 0.05 + W * 0.47));
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
      head.add(mesh(sph(W * 0.07, 12, 10), mat(shade(hc, -0.15)), x, y, z));
      break;
    }
    case 'horlurar': {
      head.add(mesh(new THREE.TorusGeometry(W * 0.56, W * 0.045, 8, 32, Math.PI), mat(hc, { roughness: 0.4 }), c.x, c.y + H * 0.05, c.z));
      for (const sx of [-1, 1]) {
        const cup = mesh(new THREE.CylinderGeometry(W * 0.16, W * 0.16, W * 0.12, 20), mat('#2a2f45', { roughness: 0.4 }), c.x + sx * W * 0.56, c.y + H * 0.02, c.z);
        cup.rotation.z = Math.PI / 2;
        head.add(cup);
      }
      break;
    }
    case 'cowboy': {
      const m = mat(hc, { roughness: 0.9 });
      const brim = mesh(new THREE.CylinderGeometry(W * 0.95, W * 0.95, H * 0.03, 32), m, c.x, top - H * 0.18, c.z);
      brim.scale.z = 0.85;
      head.add(brim);
      const crown = mesh(new THREE.CylinderGeometry(W * 0.42, W * 0.5, H * 0.42, 24), m, c.x, top + H * 0.02, c.z);
      crown.scale.z = 0.8;
      head.add(crown);
      const bandM = mesh(new THREE.CylinderGeometry(W * 0.505, W * 0.505, H * 0.07, 24, 1, true), mat(shade(hc, -0.4)), c.x, top - H * 0.12, c.z);
      bandM.scale.z = 0.8;
      head.add(bandM);
      break;
    }
    case 'trollkarl': {
      const m = mat(hc, { roughness: 0.8 });
      head.add(mesh(new THREE.CylinderGeometry(W * 0.8, W * 0.8, H * 0.03, 32), m, c.x, top - H * 0.16, c.z));
      const cone = mesh(new THREE.ConeGeometry(W * 0.5, H * 1.2, 24), m, c.x, top + H * 0.42, c.z - D * 0.05);
      cone.rotation.x = -0.15;
      head.add(cone);
      for (let i = 0; i < 6; i++) head.add(mesh(sph(W * 0.05, 8, 6), mat('#ffd84a', { emissive: '#ffd84a', emissiveIntensity: 0.4 }), c.x + Math.cos(i * 2.1) * W * (0.36 - i * 0.04), top + H * (0.05 + i * 0.13), c.z + Math.sin(i * 2.1) * W * (0.36 - i * 0.04)));
      break;
    }
    case 'kattoron':
    case 'kaninoron': {
      head.add(band(top - H * 0.15, W * 0.55));
      for (const sx of [-1, 1]) {
        if (look.hat === 'kattoron') {
          const e = mesh(new THREE.ConeGeometry(W * 0.16, H * 0.3, 4), mat(hc), c.x + sx * W * 0.3, top + H * 0.08, c.z);
          e.rotation.z = -sx * 0.25;
          head.add(e);
          const i = mesh(new THREE.ConeGeometry(W * 0.09, H * 0.18, 4), mat('#ffb3d0'), c.x + sx * W * 0.3, top + H * 0.05, c.z + W * 0.06);
          i.rotation.z = -sx * 0.25;
          head.add(i);
        } else {
          const e = mesh(new THREE.CapsuleGeometry(W * 0.1, H * 0.5, 4, 10), mat(hc), c.x + sx * W * 0.2, top + H * 0.32, c.z);
          e.rotation.z = -sx * 0.18; e.scale.z = 0.55;
          head.add(e);
          const i = mesh(new THREE.CapsuleGeometry(W * 0.05, H * 0.38, 4, 8), mat('#ffb3d0'), c.x + sx * W * 0.2, top + H * 0.32, c.z + W * 0.05);
          i.rotation.z = -sx * 0.18; i.scale.z = 0.4;
          head.add(i);
        }
      }
      break;
    }
    case 'enhorning': {
      head.add(band(top - H * 0.15, W * 0.55));
      const horn = mesh(new THREE.ConeGeometry(W * 0.1, H * 0.5, 16), gold, c.x, top + H * 0.12, c.z + D * 0.18);
      horn.rotation.x = 0.35;
      head.add(horn);
      for (let i = 0; i < 4; i++) head.add(mesh(new THREE.TorusGeometry(W * (0.09 - i * 0.018), W * 0.012, 6, 16), mat('#ffffff'), c.x, top - H * 0.02 + i * H * 0.1, c.z + D * 0.12 + i * H * 0.035));
      ['#ff5ccf', '#8a5cff', '#3ec7ff'].forEach((col, i) => head.add(mesh(sph(W * 0.09, 10, 8), mat(col), c.x - W * 0.3 + i * W * 0.05, top - H * 0.02 - i * H * 0.08, c.z - D * 0.2)));
      break;
    }
    case 'partyhatt': {
      const cone = mesh(new THREE.ConeGeometry(W * 0.3, H * 0.75, 20), mat(hc), c.x + W * 0.05, top + H * 0.28, c.z);
      cone.rotation.z = -0.15;
      head.add(cone);
      for (let i = 0; i < 3; i++) {
        const r = mesh(new THREE.TorusGeometry(W * (0.24 - i * 0.07), W * 0.025, 6, 20), mat('#ffffff'), c.x + W * 0.05 + i * W * 0.025, top + H * (0.06 + i * 0.18), c.z);
        r.rotation.x = Math.PI / 2; r.rotation.y = 0.15;
        head.add(r);
      }
      head.add(mesh(sph(W * 0.09, 10, 8), mat('#ffd84a'), c.x + W * 0.15, top + H * 0.66, c.z));
      break;
    }
    case 'blomkrans':
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2, x = c.x + Math.cos(a) * W * 0.5, z = c.z + Math.sin(a) * D * 0.5;
        const col = ['#ff5ccf', '#ffd84a', '#ffffff', '#8a5cff', '#ff7a3d'][i % 5];
        head.add(mesh(sph(W * 0.09, 10, 8), mat(col), x, top - H * 0.08, z));
        head.add(mesh(sph(W * 0.04, 8, 6), mat('#ffd84a'), x + Math.cos(a) * W * 0.06, top - H * 0.08, z + Math.sin(a) * W * 0.06));
        if (i % 2) head.add(mesh(sph(W * 0.05, 6, 6), mat('#5ec46a'), c.x + Math.cos(a + 0.2) * W * 0.5, top - H * 0.12, c.z + Math.sin(a + 0.2) * D * 0.5));
      }
      break;
    case 'propeller': {
      const cols = ['#e23b4e', '#ffd84a', '#2f6db5', '#3ec46a'];
      for (let i = 0; i < 4; i++) {
        const q = mesh(new THREE.SphereGeometry(W * 0.56, 12, 10, (i * Math.PI) / 2, Math.PI / 2, 0, Math.PI / 2), mat(cols[i]), c.x, top - H * 0.24, c.z);
        q.scale.set(1, 0.75, (D / W) * 1.02);
        head.add(q);
      }
      head.add(mesh(new THREE.CylinderGeometry(W * 0.02, W * 0.02, H * 0.18, 8), mat('#d8d8e8'), c.x, top + H * 0.2, c.z));
      const prop = new THREE.Group();
      prop.position.set(c.x, top + H * 0.3, c.z);
      prop.userData.spin = 9;
      for (const sx of [-1, 1]) {
        const blade = mesh(new THREE.BoxGeometry(W * 0.45, H * 0.015, W * 0.1), mat(sx > 0 ? '#e23b4e' : '#2f6db5'), sx * W * 0.23, 0, 0);
        blade.rotation.x = sx * 0.3;
        prop.add(blade);
      }
      prop.add(mesh(sph(W * 0.04), mat('#ffd84a'), 0, 0, 0));
      head.add(prop);
      break;
    }
    case 'hjalm': {
      const r = Math.max(W, H, D) * 0.72;
      const glass = mesh(sph(r, 32, 20), new THREE.MeshPhysicalMaterial({ color: '#bff6ff', roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }), c.x, c.y + H * 0.04, c.z);
      glass.castShadow = false;
      head.add(glass);
      const collar = mesh(new THREE.TorusGeometry(r * 0.7, r * 0.12, 12, 32), mat('#e8ecf5', { metalness: 0.5, roughness: 0.3 }), c.x, c.y - r * 0.68, c.z);
      collar.rotation.x = Math.PI / 2;
      head.add(collar);
      head.add(mesh(sph(r * 0.08, 8, 6), mat(hc, { emissive: hc, emissiveIntensity: 0.8 }), c.x + r * 0.55, c.y - r * 0.5, c.z + r * 0.35));
      break;
    }
  }

  // Kjolar
  const dress = look.top === 'klanning';
  const skirtType = dress ? 'klanning' : look.bottom;
  if (!preset && ['klanning', 'kjol', 'tutu', 'veckkjol'].includes(skirtType)) {
    const hp = parts.hips, lg = parts.legs;
    const hsz = hp.getSize(new THREE.Vector3()), lsz = lg.getSize(new THREE.Vector3()), hcen = hp.getCenter(new THREE.Vector3());
    const topY = hp.min.y + hsz.y * 0.62;
    const col = dress ? look.topColor : look.bottomColor;
    const zs = hsz.z / hsz.x * 1.25;
    const r0 = hsz.x * 0.53;
    const addSkirt = (len, r1, m, segs = 28, pleat = 0) => {
      const g = new THREE.CylinderGeometry(r0, r1, len, segs, 3, true);
      if (pleat) {
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), y = p.getY(i);
          const k = 1 + pleat * Math.cos(a * segs / 2) * (0.5 - y / len);
          p.setXYZ(i, x * k, y, z * k);
        }
        g.computeVertexNormals();
      }
      const sk = mesh(g, m, hcen.x, topY - len / 2, hcen.z);
      sk.scale.z = zs;
      G.hips.add(sk);
      return sk;
    };
    if (skirtType === 'tutu') {
      const m = mat(col, { roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
      addSkirt(lsz.y * 0.7, lsz.x * 0.88, m, 40, 0.16);
      addSkirt(lsz.y * 0.55, lsz.x * 0.8, mat(shade(col, 0.35), { roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), 40, 0.16);
    } else {
      const len = lsz.y * (dress ? 1.3 : skirtType === 'veckkjol' ? 0.95 : 1.0);
      const r1 = lsz.x * (dress ? 0.72 : skirtType === 'veckkjol' ? 0.68 : 0.64);
      addSkirt(len, r1, mat(col, { roughness: 0.85, side: THREE.DoubleSide }), skirtType === 'veckkjol' ? 32 : 28, skirtType === 'veckkjol' ? 0.08 : 0);
      const hem = mesh(new THREE.TorusGeometry(r1, len * 0.03, 6, 40), mat(shade(col, -0.18)), hcen.x, topY - len, hcen.z);
      hem.rotation.x = Math.PI / 2;
      hem.scale.y = zs;
      G.hips.add(hem);
    }
  }

  // Superhjälte-cape
  if (!preset && look.top === 'superhjalte') {
    const ch = parts.chest, csz = ch.getSize(new THREE.Vector3()), cc = ch.getCenter(new THREE.Vector3());
    const len = (ch.max.y - parts.legs.min.y) * 0.95;
    const g = new THREE.CylinderGeometry(csz.x * 0.42, csz.x * 0.75, len, 20, 4, true, Math.PI * 0.6, Math.PI * 0.8);
    const cape = mesh(g, mat(look.topColor2 || '#e23b4e', { roughness: 0.7, side: THREE.DoubleSide }), cc.x, ch.max.y - len / 2 - csz.y * 0.05, cc.z + csz.z * 0.05);
    cape.scale.z = 0.9;
    G.chest.add(cape);
  }

  // Skodelar
  if (!preset) for (const [k, sx] of [['lfoot', 1], ['rfoot', -1]]) {
    const fb = parts[k], fc = fb.getCenter(new THREE.Vector3()), fs = fb.getSize(new THREE.Vector3());
    if (look.shoeStyle === 'rullskridskor') {
      for (let i = 0; i < 4; i++) {
        const w = mesh(new THREE.CylinderGeometry(fs.x * 0.26, fs.x * 0.26, fs.x * 0.3, 16), mat(['#ff5ccf', '#3ee8ff', '#ffd84a', '#8dff5a'][i], { roughness: 0.3 }), fc.x, fb.min.y + fs.x * 0.02, fb.min.z + fs.z * (0.14 + i * 0.24));
        w.rotation.z = Math.PI / 2;
        G[k].add(w);
      }
    }
    if (look.shoeStyle === 'tofflor') G[k].add(mesh(sph(fs.x * 0.32, 12, 10), mat(shade(look.shoes, 0.35), { roughness: 1 }), fc.x, fb.min.y + fs.y * 0.6, fb.max.z - fs.z * 0.18));
    if (look.shoeStyle === 'vinterkangor') {
      const cuff = mesh(new THREE.TorusGeometry(fs.x * 0.42, fs.x * 0.14, 8, 20), mat('#ffffff', { roughness: 1 }), fc.x, fb.max.y - fs.y * 0.1, fc.z - fs.z * 0.15);
      cuff.rotation.x = Math.PI / 2;
      G[k].add(cuff);
    }
  }
  return G;
}

/* ---------- Prylar (byggs i gubbens viloläge och fästs på ett ben) ---------- */
function buildGear(name, A, restOf) {
  const U = 1 / A.scale;                                   // 1 meter i modellens enheter
  const out = [];
  const attach = (boneName, obj, pos, quat = new THREE.Quaternion()) => {
    const rest = restOf[boneName];
    if (!rest) return;
    const m = new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(1, 1, 1));
    new THREE.Matrix4().copy(rest).invert().multiply(m).decompose(obj.position, obj.quaternion, obj.scale);
    out.push({ bone: boneName, obj });
  };
  const tp = n => new THREE.Vector3().setFromMatrixPosition(restOf[n]);
  const wood = mat('#9a6a3e', { roughness: 0.8 }), metal = mat('#c9ced8', { metalness: 0.7, roughness: 0.3 }), grip = mat('#e23b4e', { roughness: 0.6 });

  if (name === 'spade' || name === 'yxa') {
    const hand = tp('RightHand'), fing = restOf.RightHandIndex1 ? tp('RightHandIndex1') : hand.clone();
    const g = new THREE.Group();
    const len = (name === 'spade' ? 0.95 : 0.7) * U;
    g.add(mesh(new THREE.CylinderGeometry(0.018 * U, 0.02 * U, len, 10), wood, 0, len * 0.25, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.026 * U, 0.026 * U, 0.12 * U, 10), grip, 0, -len * 0.2, 0));
    if (name === 'spade') {
      const blade = mesh(new THREE.BoxGeometry(0.2 * U, 0.26 * U, 0.02 * U), metal, 0, len * 0.75 + 0.12 * U, 0);
      g.add(blade);
      const point = mesh(new THREE.ConeGeometry(0.14 * U, 0.08 * U, 4, 1), metal, 0, len * 0.75 + 0.29 * U, 0);
      point.rotation.y = Math.PI / 4; point.scale.z = 0.15;
      g.add(point);
      g.add(mesh(new THREE.TorusGeometry(0.05 * U, 0.012 * U, 6, 16), wood, 0, -len * 0.27 - 0.04 * U, 0));
    } else {
      const head = mesh(new THREE.BoxGeometry(0.06 * U, 0.12 * U, 0.2 * U), metal, 0, len * 0.72, 0.06 * U);
      g.add(head);
      g.add(mesh(new THREE.BoxGeometry(0.02 * U, 0.16 * U, 0.06 * U), metal, 0, len * 0.72, 0.18 * U));
    }
    // Skaftet pekar framåt och lite uppåt, greppet i handen
    const dir = fing.clone().sub(hand).normalize();
    const pos = hand.clone().addScaledVector(dir, 0.05 * U);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.55, 1).normalize());
    attach('RightHand', g, pos, q);
  }
  if (name === 'spo') {
    // Fiskespö: långt smalt spö, rulle vid handtaget och en lina med flöte från toppen
    const hand = tp('RightHand'), fing = restOf.RightHandIndex1 ? tp('RightHandIndex1') : hand.clone();
    const g = new THREE.Group(), L = 1.45 * U;
    const rod = mesh(new THREE.CylinderGeometry(0.006 * U, 0.016 * U, L, 8), mat('#2f6db5', { roughness: 0.4 }), 0, L * 0.42, 0);
    g.add(rod, mesh(new THREE.CylinderGeometry(0.024 * U, 0.024 * U, 0.22 * U, 10), mat('#3a2a1e', { roughness: 0.9 }), 0, -0.04 * U, 0));
    const reel = mesh(new THREE.CylinderGeometry(0.045 * U, 0.045 * U, 0.035 * U, 16), metal, 0.05 * U, 0.1 * U, 0);
    reel.rotation.z = Math.PI / 2;
    g.add(reel, mesh(new THREE.BoxGeometry(0.03 * U, 0.008 * U, 0.008 * U), grip, 0.08 * U, 0.1 * U, 0.03 * U));
    const tipY = L * 0.92, lineLen = 0.75 * U;
    // linan hänger ner från toppen (i spöets lokala riktning "bakåt-ner" så den ser hängande ut)
    const line = new THREE.Group(); line.position.set(0, tipY, 0); line.rotation.x = 2.3;
    line.add(mesh(new THREE.CylinderGeometry(0.0025 * U, 0.0025 * U, lineLen, 4), mat('#f4f4f4'), 0, lineLen / 2, 0));
    const bob = new THREE.Group(); bob.position.y = lineLen;
    bob.add(mesh(new THREE.SphereGeometry(0.035 * U, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e23b4e', { emissive: '#e23b4e', emissiveIntensity: 0.2 }), 0, 0, 0));
    const bot = mesh(new THREE.SphereGeometry(0.035 * U, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#ffffff'), 0, 0, 0);
    bob.add(bot); line.add(bob); g.add(line);
    const pos = hand.clone().addScaledVector(fing.clone().sub(hand).normalize(), 0.05 * U);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.8, 0.75).normalize());
    attach('RightHand', g, pos, q);
  }
  if (name === 'fjader') {
    const hb = A.parts.head, c = hb.getCenter(new THREE.Vector3()), s = hb.getSize(new THREE.Vector3());
    const g = new THREE.Group();
    const vane = mesh(new THREE.SphereGeometry(1, 16, 10), mat('#ffffff', { roughness: 0.9, emissive: '#ff9fe0', emissiveIntensity: 0.25 }), 0, 0.16 * U, 0);
    vane.scale.set(0.05 * U, 0.17 * U, 0.008 * U);
    const tip = mesh(new THREE.SphereGeometry(1, 12, 8), mat('#ff5ccf', { emissive: '#ff5ccf', emissiveIntensity: 0.4 }), 0, 0.29 * U, 0);
    tip.scale.set(0.035 * U, 0.06 * U, 0.009 * U);
    g.add(vane, tip, mesh(new THREE.CylinderGeometry(0.004 * U, 0.004 * U, 0.38 * U, 6), mat('#e8e0ff'), 0, 0.14 * U, 0));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.55, 0.3, -0.35));
    attach('Head', g, new THREE.Vector3(c.x + s.x * 0.32, hb.max.y - s.y * 0.2, c.z - s.z * 0.2), q);
  }
  if (name === 'inlines') {
    for (const [k, bone] of [['lfoot', 'LeftFoot'], ['rfoot', 'RightFoot']]) {
      const fb = A.parts[k], fc = fb.getCenter(new THREE.Vector3()), fs = fb.getSize(new THREE.Vector3());
      const g = new THREE.Group();
      const r = 0.035 * U, y0 = fb.min.y - r * 0.9;
      g.add(mesh(new THREE.BoxGeometry(fs.x * 0.32, 0.03 * U, fs.z * 0.95), mat('#2a2f45', { roughness: 0.4 }), fc.x, y0 + r * 0.9, fc.z));
      for (let i = 0; i < 4; i++) {
        const w = mesh(new THREE.CylinderGeometry(r, r, 0.022 * U, 16), mat(['#ff5ccf', '#3ee8ff', '#ffd84a', '#8dff5a'][i], { roughness: 0.3, emissive: ['#ff5ccf', '#3ee8ff', '#ffd84a', '#8dff5a'][i], emissiveIntensity: 0.25 }), fc.x, y0, fb.min.z + fs.z * (0.12 + i * 0.25));
        w.rotation.z = Math.PI / 2;
        g.add(w);
      }
      const cuff = mesh(new THREE.TorusGeometry(fs.x * 0.42, 0.018 * U, 8, 20), mat('#3ee8ff', { roughness: 0.4 }), fc.x, fb.max.y - fs.y * 0.05, fc.z - fs.z * 0.15);
      cuff.rotation.x = Math.PI / 2;
      g.add(cuff);
      attach(bone, g, new THREE.Vector3());
    }
  }
  return out;
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
  const boneFor = { head: 'Head', hips: 'Hips', chest: bones.UpperChest ? 'UpperChest' : 'Chest', lfoot: 'LeftFoot', rfoot: 'RightFoot' };
  for (const k in ex) root.add(ex[k]);
  root.updateMatrixWorld(true);
  const spinners = [];
  for (const k in ex) {
    [...ex[k].children].forEach(o => { (bones[boneFor[k]] || bones.Hips).attach(o); if (o.userData.spin) spinners.push(o); });
    root.remove(ex[k]);
  }

  // Benens viloläge (relativt gubben) – används för att fästa prylar
  const restOf = {};
  {
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const k in bones) restOf[k] = inv.clone().multiply(bones[k].matrixWorld);
  }
  const gear = {};

  // Glöd (exklusiva saker)
  const eff = resolveLook(look);
  let aura = null;
  if (eff.glow) {
    const col = eff.glow === 'guld' ? '#ffcf3a' : '#ff5ccf';
    const gc = document.createElement('canvas'); gc.width = gc.height = 128;
    const gx = gc.getContext('2d'), gr = gx.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, col + 'cc'); gr.addColorStop(0.5, col + '44'); gr.addColorStop(1, col + '00');
    gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(gc);
    aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const box = new THREE.Box3().setFromObject(model);
    box.min.divideScalar(A.scale); box.max.divideScalar(A.scale);     // till modellens enheter
    const sz = box.getSize(new THREE.Vector3());
    aura.scale.set(sz.y * 0.75, sz.y * 1.2, 1);
    aura.position.set(0, box.min.y + sz.y * 0.5, -sz.z * 0.6);
    aura.renderOrder = -1;
    root.add(aura);
    const light = new THREE.PointLight(col, 2.5, 4);
    light.position.set(0, box.min.y + sz.y * 0.6, sz.z * 3);
    root.add(light);
  }

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

  /* ---------- Poser / rörelser (läggs ovanpå animationen) ---------- */
  const sideOf = b => { if (!b) return 1; const v = new THREE.Vector3(); b.getWorldPosition(v); return v.x >= 0 ? 1 : -1; };
  const sL = sideOf(bones.LeftArm), sR = sideOf(bones.RightArm);
  const pq = new THREE.Quaternion(), wq = new THREE.Quaternion(), rq = new THREE.Quaternion(), tq = new THREE.Quaternion(), ax = new THREE.Vector3();
  // Vrid ett ben runt en axel i gubbens eget koordinatsystem (oberoende av riggens axlar)
  function rotW(bone, x, y, z, angle) {
    if (!bone || !angle) return;
    ax.set(x, y, z).normalize().applyQuaternion(rq);
    bone.parent.getWorldQuaternion(pq);
    wq.setFromAxisAngle(ax, angle);
    tq.copy(pq).invert().multiply(wq).multiply(pq);
    bone.quaternion.premultiply(tq);
  }
  const raise = (bone, side, a) => rotW(bone, 0, 0, 1, side * a);
  const EMOTES = { vinka: 2.8, flexa: 2.6, dansa: 3.6, heja: 2.2, titta: 3.2, snurra: 1.5, buga: 2.2 };
  let emo = null, runUntil = 0;
  function emote(name) {
    if (name === 'hoppa') { play('jump', 0.1); return 1.2; }
    if (name === 'spring') { play('run', 0.3); runUntil = time + 2.6; return 3.0; }
    if (!EMOTES[name]) return 0;
    if (current !== actions.idle) play('idle', 0.2);
    emo = { name, t: 0, d: EMOTES[name] };
    if (name === 'heja') play('jump', 0.1);
    return emo.d;
  }
  function applyEmote(name, t, w) {
    const B = bones, f = t * 7;
    switch (name) {
      case 'vinka':
        raise(B.RightArm, sR, 2.65 * w);
        raise(B.RightForeArm, sR, (0.2 + 0.5 * Math.sin(t * 10)) * w);
        rotW(B.Head, 0, 0, 1, -sR * 0.15 * w);
        break;
      case 'flexa':
        raise(B.LeftArm, sL, 1.45 * w); raise(B.RightArm, sR, 1.45 * w);
        raise(B.LeftForeArm, sL, 1.75 * w); raise(B.RightForeArm, sR, 1.75 * w);
        rotW(B.Spine, 1, 0, 0, -0.1 * w);
        rotW(B.Head, 0, 1, 0, Math.sin(t * 2.5) * 0.3 * w);
        break;
      case 'dansa':
        rotW(B.Hips, 0, 1, 0, Math.sin(f) * 0.3 * w);
        rotW(B.Spine, 0, 0, 1, Math.sin(f) * 0.14 * w);
        raise(B.LeftArm, sL, (1.7 + Math.sin(f) * 0.9) * w);
        raise(B.RightArm, sR, (1.7 - Math.sin(f) * 0.9) * w);
        raise(B.LeftForeArm, sL, 0.6 * w); raise(B.RightForeArm, sR, 0.6 * w);
        rotW(B.Head, 0, 0, 1, Math.sin(f * 2) * 0.12 * w);
        break;
      case 'heja':
        raise(B.LeftArm, sL, 2.75 * w); raise(B.RightArm, sR, 2.75 * w);
        raise(B.LeftForeArm, sL, Math.sin(t * 14) * 0.3 * w); raise(B.RightForeArm, sR, -Math.sin(t * 14) * 0.3 * w);
        break;
      case 'titta':
        rotW(B.Head, 0, 1, 0, Math.sin(t * 2.2) * 0.5 * w);
        rotW(B.Spine, 0, 1, 0, Math.sin(t * 2.2) * 0.15 * w);
        break;
      case 'buga':
        rotW(B.Spine, 1, 0, 0, 0.38 * w);
        rotW(B.Head, 1, 0, 0, 0.12 * w);
        raise(B.RightArm, sR, -0.3 * w);
        break;
      case 'snurra': {
        const k = Math.min(1, t / 1.3);
        root.rotation.y = (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2) * Math.PI * 2;
        break;
      }
    }
  }

  /* ---------- Arbete: hugga med yxan / gräva med spaden (loopar så länge man håller) ---------- */
  let work = null, workW = 0, workT = 0, lastWork = null;
  const FWD = -1;   // framåt-lyft av armen = negativ vinkel runt x-axeln
  function applyWork(name, t, w) {
    const B = bones;
    if (name === 'hugga') {
      // Ta sats bakåt/uppåt ... hugg snabbt ner ... studs tillbaka
      const p = (t * 1.6) % 1;
      let lift;
      if (p < 0.55) lift = 0.6 + 1.9 * Math.sin(p / 0.55 * Math.PI / 2);          // upp
      else if (p < 0.7) lift = 2.5 - 2.3 * ((p - 0.55) / 0.15);                     // hugg!
      else lift = 0.2 + 0.4 * ((p - 0.7) / 0.3);                                     // tillbaka
      rotW(B.RightArm, 1, 0, 0, FWD * lift * w);
      rotW(B.LeftArm, 1, 0, 0, FWD * (lift * 0.8) * w);
      raise(B.RightArm, sR, -0.35 * w); raise(B.LeftArm, sL, -0.55 * w);              // armarna in mot mitten (båda händerna på skaftet)
      rotW(B.RightForeArm, 1, 0, 0, FWD * 0.35 * w); rotW(B.LeftForeArm, 1, 0, 0, FWD * 0.5 * w);
      rotW(B.Spine, 1, 0, 0, (0.08 + (lift < 1.2 ? 0.18 : -0.05)) * w);             // böj fram i hugget
      rotW(B.Spine, 0, 1, 0, -0.18 * w);
      rotW(B.Head, 1, 0, 0, 0.12 * w);
    } else if (name === 'grava') {
      // Stöt ner spaden ... luta bak och lyft jorden
      const p = (t * 1.3) % 1, s = Math.sin(p * Math.PI * 2);
      const bend = 0.28 + 0.16 * s;
      rotW(B.Spine, 1, 0, 0, bend * w);
      rotW(B.Head, 1, 0, 0, -0.15 * w);
      rotW(B.RightArm, 1, 0, 0, FWD * (0.9 + 0.35 * s) * w);
      rotW(B.LeftArm, 1, 0, 0, FWD * (1.2 + 0.35 * s) * w);
      raise(B.RightArm, sR, -0.25 * w); raise(B.LeftArm, sL, -0.45 * w);
      rotW(B.RightForeArm, 1, 0, 0, FWD * (0.3 - 0.2 * s) * w); rotW(B.LeftForeArm, 1, 0, 0, FWD * (0.5 - 0.2 * s) * w);
    }
  }

  let blinkT = -1, nextBlink = 1.5 + Math.random() * 2, time = 0;
  return {
    root, bones, mixer, play, emote,
    // 'hugga', 'grava' eller null
    setWork(name) {
      if (name === work) return;
      if (name && current !== actions.idle) play('idle', 0.15);
      if (name) { workT = 0; lastWork = name; }
      work = name;
    },
    /* Prylar: 'spade', 'yxa', 'fjader', 'inlines' */
    setGear(name, on) {
      if (on && !gear[name]) {
        gear[name] = buildGear(name, A, restOf);
        for (const { bone, obj } of gear[name]) bones[bone] && bones[bone].add(obj);
      } else if (!on && gear[name]) {
        for (const { obj } of gear[name]) { obj.parent && obj.parent.remove(obj); obj.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }
        delete gear[name];
      }
    },
    hasGear(name) { return !!gear[name]; },
    get state() { return current === actions.run ? 'run' : current === actions.jump ? 'jump' : 'idle'; },
    update(dt, lookX = 0, lookY = 0) {
      time += dt;
      mixer.update(dt);
      for (const sp of spinners) sp.rotation.y += dt * sp.userData.spin;
      if (runUntil && time > runUntil) { runUntil = 0; if (current === actions.run) play('idle', 0.35); }
      if (emo) {
        emo.t += dt;
        root.getWorldQuaternion(rq);
        if (emo.t >= emo.d) { if (emo.name === 'snurra') root.rotation.y = 0; emo = null; }
        else applyEmote(emo.name, emo.t, Math.max(0, Math.min(1, emo.t / 0.35, (emo.d - emo.t) / 0.35)));
      }
      workW = Math.max(0, Math.min(1, workW + (work ? dt * 6 : -dt * 6)));
      if (workW > 0 && lastWork) {
        if (work) workT += dt;
        root.getWorldQuaternion(rq);
        applyWork(lastWork, workT, workW);
      }
      if (aura) { const k = 1 + Math.sin(time * 2.5) * 0.06; aura.material.opacity = 0.75 + Math.sin(time * 2.5) * 0.2; aura.scale.x = aura.userData.sx || (aura.userData.sx = aura.scale.x); aura.scale.x = aura.userData.sx * k; }
      // Huvudet tittar lite mot pekaren
      if (bones.Head && current === actions.idle && !emo) {
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
        if (o.isSprite) { o.material.map && o.material.map.dispose(); o.material.dispose(); }
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
export function createStage(canvas, opts = {}) {
  const mini = !!opts.mini;
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
  if (mini) {
    controls.enabled = false;
    camera.fov = 28;
    camera.position.set(0, 1.15, 5.8);
    controls.target.set(0, 0.86, 0);
    camera.updateProjectionMatrix();
  }

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
    if (ray.ray.intersectsBox(box)) { if (mini) nextShow(true); else ch.play('jump', 0.1); }
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

  // Visningsläge: gubben gör olika rörelser av sig själv
  const SHOW = ['vinka', 'dansa', 'hoppa', 'flexa', 'titta', 'snurra', 'spring', 'heja', 'buga'];
  let showT = 2.5, lastShow = '';
  function nextShow(now = false) {
    if (!ch) return;
    let n;
    do { n = SHOW[Math.floor(Math.random() * SHOW.length)]; } while (n === lastShow);
    lastShow = n;
    const d = ch.emote(n);
    showT = d + 2 + Math.random() * 2.5;
    if (opts.onEmote) opts.onEmote(n);
  }

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
    if (mini && ch) { showT -= dt; if (showT <= 0) nextShow(); }
    renderer.render(scene, camera);
  }
  animate();

  let shownGear = null;
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
      if (shownGear) ch.setGear(shownGear, true);
    },
    // Visa en pryl i handen/på kroppen (bara för att titta, t.ex. i Prylar-fliken)
    showGear(name) {
      if (ch && shownGear) ch.setGear(shownGear, false);
      shownGear = name || null;
      if (ch && shownGear) ch.setGear(shownGear, true);
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
    emote(name) { const d = ch ? ch.emote(name) : 0; if (mini) showT = d + 3; return d; },
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
export { createCharacter, loadAssets };

/* Helbild (används för tester och kan användas till förhandsvisningar) */
export function renderSnapshot(look, gender, { size = 320, view = 'front', anim = 0.35 } = {}) {
  const job = portraitQueue.then(async () => {
    await loadAssets();
    const { renderer, scene, camera } = portraitRig();
    renderer.setSize(size, size, false);
    const c = await createCharacter(look, gender);
    c.update(anim);
    scene.add(c.root);
    const z = view === 'back' ? -3.4 : 3.4, x = view === 'side' ? 3.4 : 0.6;
    camera.position.set(view === 'side' ? x : 0.6, 1.1, view === 'side' ? 0.4 : z);
    camera.lookAt(0, 0.9, 0);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(c.root);
    c.dispose();
    return url;
  });
  portraitQueue = job.catch(() => {});
  return job;
}
