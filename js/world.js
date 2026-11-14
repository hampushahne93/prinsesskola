/* =========================================================
   Guldmyntsjakten – kartan
   270 x 270 meter med kullar, sjöar, gräs, träd, stenar,
   kristaller, en bergsring runt kanten och rymdhimmel.
   ========================================================= */
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export const HALF = 135;              // kartan går från -135 till +135 meter
export const PLAY = HALF - 14;        // så långt man kan springa
export const WATER = -2.2;            // vattennivå
const SEG = 180;                      // rutnät för terrängen (1,5 m per ruta)
const STEP = (HALF * 2) / SEG;

/* ---------- Brus (deterministiskt) ---------- */
function hash(x, z) {
  let h = x * 374761393 + z * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const smooth = t => t * t * (3 - 2 * t);
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  const u = smooth(xf), v = smooth(zf);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, z, oct = 4) {
  let s = 0, amp = 1, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { s += noise(x * f + i * 17.3, z * f - i * 9.1) * amp; tot += amp; amp *= 0.5; f *= 2.03; }
  return s / tot;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Grundterräng */
function baseHeight(x, z) {
  let h = fbm(x * 0.011, z * 0.011, 5) * 11;           // stora kullar
  h += fbm(x * 0.045 + 40, z * 0.045 - 12, 3) * 1.6;   // småkullar
  h += Math.max(0, fbm(x * 0.02 - 70, z * 0.02 + 30, 3)) * 9;   // några höga toppar
  const r = Math.hypot(x, z);
  h = h * sstep(10, 38, r) + 0.4 * (1 - sstep(10, 38, r));       // platt start i mitten
  const d = Math.max(Math.abs(x), Math.abs(z));
  const e = sstep(HALF - 26, HALF, d);
  h += e * e * 34 + e * fbm(x * 0.06, z * 0.06, 3) * 6;          // berg runt kanten
  return h;
}

/* ---------- Gårdar: en i varje hörn, på plana platser ---------- */
export const FARMS = [];
{
  const PAD = 21;
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    let best = null;
    for (const [minW, lo, hi] of [[1.4, 34, 96], [0.6, 26, 104], [-1, 26, 104]]) {
    if (best) break;
    for (let a = lo; a <= hi; a += 5) for (let b = lo; b <= hi; b += 5) {
      const x = sx * a, z = sz * b, hs = [];
      for (let k = 0; k < 16; k++) { const t = k / 16 * Math.PI * 2; hs.push(baseHeight(x + Math.cos(t) * PAD, z + Math.sin(t) * PAD)); hs.push(baseHeight(x + Math.cos(t) * PAD * 0.5, z + Math.sin(t) * PAD * 0.5)); }
      hs.push(baseHeight(x, z));
      const mean = hs.reduce((p, c) => p + c, 0) / hs.length;
      if (Math.min(...hs) < WATER + minW) continue;
      const v = hs.reduce((p, c) => p + (c - mean) ** 2, 0) / hs.length;
      const score = v + Math.abs(mean - 2.5) * 0.05;
      if (!best || score < best.score) best = { x, z, h: mean, score };
    }
    }
    if (!best) continue;
    // Ladans dörr pekar mot mitten av kartan (avrundat till 90°)
    const yaw = Math.round(Math.atan2(-best.x, -best.z) / (Math.PI / 2)) * (Math.PI / 2);
    FARMS.push({ kind: 'farm', x: best.x, z: best.z, h: Math.max(WATER + 1.2, best.h), yaw, pad: PAD });
  }
  // Två stora lador på egna gårdsplaner
  const PADB = 17;
  for (let n = 0; n < 2; n++) {
    let best = null;
    for (let x = -100; x <= 100; x += 5) for (let z = -100; z <= 100; z += 5) {
      if (Math.hypot(x, z) < 45 || FARMS.some(f => Math.hypot(x - f.x, z - f.z) < f.pad + PADB + 22)) continue;
      const hs = [];
      for (let k = 0; k < 16; k++) { const t = k / 16 * Math.PI * 2; hs.push(baseHeight(x + Math.cos(t) * PADB, z + Math.sin(t) * PADB)); hs.push(baseHeight(x + Math.cos(t) * PADB * 0.5, z + Math.sin(t) * PADB * 0.5)); }
      const mean = hs.reduce((p, c) => p + c, 0) / hs.length;
      if (Math.min(...hs) < WATER + 0.8) continue;
      const score = hs.reduce((p, c) => p + (c - mean) ** 2, 0) / hs.length + Math.abs(mean - 2.5) * 0.05;
      if (!best || score < best.score) best = { x, z, h: mean, score };
    }
    if (!best) break;
    const yaw = Math.round(Math.atan2(-best.x, -best.z) / (Math.PI / 2)) * (Math.PI / 2);
    FARMS.push({ kind: 'big', x: best.x, z: best.z, h: Math.max(WATER + 1.2, best.h), yaw, pad: PADB });
  }
}

/* Höjd med utplanade gårdar */
function rawHeight(x, z) {
  let h = baseHeight(x, z);
  for (const f of FARMS) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < f.pad + 14) h += (f.h - h) * (1 - sstep(f.pad, f.pad + 14, d));
  }
  return h;
}
const inFarm = (x, z, extra = 0) => FARMS.some(f => Math.hypot(x - f.x, z - f.z) < f.pad + extra);

/* Höjdkarta i rutnät + bilinjär avläsning (exakt som meshen) */
const N = SEG + 1;
const heights = new Float32Array(N * N);
for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
  heights[iz * N + ix] = rawHeight(-HALF + ix * STEP, -HALF + iz * STEP);
}
/* Stenar som går att stå på */
export const ROCKS = [];
export function rockHeightAt(x, z) {
  let best = -Infinity;
  for (const r of ROCKS) {
    const dx = x - r.x, dz = z - r.z, d2 = (dx * dx + dz * dz) / (r.r * r.r);
    if (d2 < 1) { const h = r.cy + r.hy * Math.sqrt(1 - d2); if (h > best) best = h; }
  }
  return best;
}
export function heightAt(x, z) {
  const fx = Math.min(SEG - 0.0001, Math.max(0, (x + HALF) / STEP));
  const fz = Math.min(SEG - 0.0001, Math.max(0, (z + HALF) / STEP));
  const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const h00 = heights[iz * N + ix], h10 = heights[iz * N + ix + 1], h01 = heights[(iz + 1) * N + ix], h11 = heights[(iz + 1) * N + ix + 1];
  // samma triangeldelning som meshen
  if (tx + tz <= 1) return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
  return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
}
function slopeAt(x, z) {
  const e = 0.8;
  return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
}

/* Färg för marken */
const C = (h) => new THREE.Color(h);
function groundColor(x, z, h, slope, out) {
  const n = fbm(x * 0.08, z * 0.08, 2) * 0.5 + 0.5;
  const g1 = C('#56b847'), g2 = C('#3f9a3c'), g3 = C('#86d35a');
  out.copy(g1).lerp(n > 0.5 ? g3 : g2, Math.abs(n - 0.5) * 1.6);
  out.lerp(C('#2f7d3a'), sstep(0.2, -0.6, h / 6) * 0.5);                      // mörkare i dalar
  if (h < WATER + 0.7) out.lerp(C('#e6d39a'), sstep(WATER + 0.7, WATER + 0.1, h));   // sand vid vatten
  if (slope > 0.6) out.lerp(C('#8a7f9e'), sstep(0.6, 1.2, slope));            // sten i branter
  if (h > 16) out.lerp(C('#9a90b5'), sstep(16, 28, h));                       // berg
  if (h > 30) out.lerp(C('#f2f0ff'), sstep(30, 38, h));                       // snötoppar
  for (const f of FARMS) {                                                      // grusplan vid ladan
    const d = Math.hypot(x - f.x, z - f.z);
    const r0 = f.kind === 'big' ? 12 : 8;
    if (d < r0 + 5) out.lerp(C(n > 0.5 ? '#c4a574' : '#b8976a'), (1 - sstep(r0, r0 + 5, d)) * 0.85);
  }
  return out;
}

/* Slump med frö */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* =========================================================
   Bygg allt
   ========================================================= */
export function buildWorld(scene, { lowSpec = false } = {}) {
  const uniforms = { uTime: { value: 0 } };
  const windify = (mat, amount = 0.12) => {
    mat.onBeforeCompile = shader => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float hh = max(position.y, 0.0);
        vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        transformed.x += sin(uTime * 1.8 + ip.x * 0.15 + ip.y * 0.1) * ${amount.toFixed(3)} * hh;
        transformed.z += cos(uTime * 1.4 + ip.y * 0.13) * ${(amount * 0.7).toFixed(3)} * hh;`);
    };
    return mat;
  };

  /* ---------- Himmel ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C('#1a1a5e') }, mid: { value: C('#5a4fc8') }, horizon: { value: C('#ffb0d8') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = mix(horizon, mid, smoothstep(-0.02, 0.25, h)); c = mix(c, top, smoothstep(0.25, 0.8, h)); gl_FragColor = vec4(c,1.0); }`
  }));
  sky.renderOrder = -10;
  scene.add(sky);
  // Stjärnor
  {
    const R = rng(11), n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, y = 0.25 + R() * 0.75, r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 850, y * 850, Math.sin(a) * r * 850], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
  }
  // Stor planet med ring på himlen
  {
    const grp = new THREE.Group();
    const pl = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 32), new THREE.MeshBasicMaterial({ color: '#ff7ad9', fog: false }));
    const shade = new THREE.Mesh(new THREE.SphereGeometry(121, 48, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#7a2a8a', fog: false, transparent: true, opacity: 0.45 }));
    shade.rotation.y = -0.6;
    const ring = new THREE.Mesh(new THREE.RingGeometry(150, 215, 96), new THREE.MeshBasicMaterial({ color: '#ffd84a', fog: false, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
    ring.rotation.x = Math.PI / 2 - 0.35;
    grp.add(pl, shade, ring);
    grp.position.set(-420, 330, -560);
    grp.rotation.z = 0.3;
    scene.add(grp);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(28, 24, 16), new THREE.MeshBasicMaterial({ color: '#bff6ff', fog: false }));
    moon.position.set(520, 260, -380);
    scene.add(moon);
  }
  scene.fog = new THREE.Fog('#c9a8e8', 70, 300);

  /* ---------- Ljus ---------- */
  scene.add(new THREE.HemisphereLight('#dbe8ff', '#4a6a3a', 1.15));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.3);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowSpec ? 1024 : 2048, lowSpec ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 250 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  /* ---------- Terräng ---------- */
  const pos = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), tmp = new THREE.Color();
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const i = iz * N + ix, x = -HALF + ix * STEP, z = -HALF + iz * STEP, h = heights[i];
    pos.set([x, h, z], i * 3);
    groundColor(x, z, h, slopeAt(x, z), tmp);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const idx = [];
  for (let iz = 0; iz < SEG; iz++) for (let ix = 0; ix < SEG; ix++) {
    const a = iz * N + ix, b = a + 1, c = a + N, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  tg.setIndex(idx);
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  /* ---------- Vatten ---------- */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshStandardMaterial({ color: '#3ec7ff', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.72 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER;
  scene.add(water);

  /* ---------- Bergsring längre bort ---------- */
  {
    const R = rng(5), n = 70;
    const g = new THREE.ConeGeometry(1, 1, 7);
    const m = new THREE.MeshLambertMaterial({ color: '#7d6fb0', flatShading: true });
    const im = new THREE.InstancedMesh(g, m, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.05, r = 215 + R() * 60, h = 45 + R() * 75;
      p.set(Math.cos(a) * r, h / 2 - 5, Math.sin(a) * r);
      sc.set(24 + R() * 22, h, 24 + R() * 22);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6);
      im.setMatrixAt(i, M.compose(p, q, sc));
    }
    scene.add(im);
  }

  /* ---------- Hjälp för utplacering ---------- */
  const R = rng(1234);
  let avoidFarm = 4;
  const spot = (minH = WATER + 0.4, maxSlope = 0.55, edge = PLAY - 2) => {
    for (let t = 0; t < 40; t++) {
      const x = (R() * 2 - 1) * edge, z = (R() * 2 - 1) * edge, h = heightAt(x, z);
      if (h > minH && slopeAt(x, z) < maxSlope && Math.hypot(x, z) > 6 && !inFarm(x, z, avoidFarm)) return [x, h, z];
    }
    return null;
  };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

  /* ---------- Gräs ---------- */
  {
    const blades = new THREE.BufferGeometry(), bp = [], bc = [];
    const base = C('#2f7d34'), tip = C('#a8e66a');
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3 + 0.3, ca = Math.cos(a), sa = Math.sin(a), w = 0.05, h = 0.5 + k * 0.08, lean = 0.12;
      bp.push(-w * ca, 0, -w * sa, w * ca, 0, w * sa, lean * sa, h, -lean * ca);
      bc.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
    }
    blades.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    blades.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    blades.computeVertexNormals();
    const count = lowSpec ? 22000 : 48000;
    const gm = windify(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.16);
    const grass = new THREE.InstancedMesh(blades, gm, count);
    let n = 0;
    const tint = new THREE.Color();
    avoidFarm = -10;
    for (let i = 0; i < count * 3 && n < count; i++) {
      const s = spot(WATER + 0.5, 0.6, PLAY + 6);
      if (!s) continue;
      const [x, h, z] = s;
      if (h > 20) continue;
      Q.setFromAxisAngle(UP, R() * Math.PI * 2);
      const k = 0.7 + R() * 0.9;
      S.set(k, k * (0.8 + R() * 0.6), k);
      grass.setMatrixAt(n, M.compose(P.set(x, h - 0.03, z), Q, S));
      groundColor(x, z, h, 0, tint).multiplyScalar(1.6);
      grass.setColorAt(n, tint);
      n++;
    }
    grass.count = n;
    avoidFarm = 4;
    grass.receiveShadow = true;
    scene.add(grass);
  }

  /* ---------- Blommor ---------- */
  {
    const n = 2600, g = new THREE.IcosahedronGeometry(0.09, 0);
    g.translate(0, 0.35, 0);
    const f = new THREE.InstancedMesh(g, windify(new THREE.MeshLambertMaterial({ color: '#ffffff' }), 0.1), n);
    const cols = ['#ff5ccf', '#ffd84a', '#ffffff', '#8a5cff', '#3ee8ff', '#ff7a3d'].map(C);
    let k = 0;
    // blommorna växer i små klungor
    while (k < n) {
      const s = spot(WATER + 0.8, 0.35);
      if (!s) continue;
      const c = cols[Math.floor(R() * cols.length)];
      for (let j = 0; j < 14 && k < n; j++) {
        const x = s[0] + (R() - 0.5) * 6, z = s[2] + (R() - 0.5) * 6, h = heightAt(x, z);
        if (h < WATER + 0.6) continue;
        f.setMatrixAt(k, M.compose(P.set(x, h, z), Q.identity(), S.setScalar(0.8 + R() * 0.6)));
        f.setColorAt(k, c);
        k++;
      }
    }
    scene.add(f);
  }

  /* ---------- Stenar ---------- */
  const colliders = [];
  ROCKS.length = 0;      // { x, z, r } – sådant man inte kan springa igenom
  {
    const n = 170, g = new THREE.DodecahedronGeometry(1, 0);
    const rocks = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), n);
    const rc = ['#8d86a8', '#a29cbc', '#76708f'].map(C);
    for (let i = 0; i < n; i++) {
      const s = spot(WATER - 1, 1.2); if (!s) continue;
      const big = R() < 0.15, k = big ? 2 + R() * 2.5 : 0.3 + R() * 0.9;
      Q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.3, R() * 6.3, (R() - 0.5) * 0.3));
      S.set(k * (0.8 + R() * 0.5), k * (0.6 + R() * 0.4), k * (0.8 + R() * 0.5));
      const cy = s[1] + k * 0.15 - (big ? k * 0.25 : 0);
      rocks.setMatrixAt(i, M.compose(P.set(s[0], cy, s[2]), Q, S));
      rocks.setColorAt(i, rc[i % 3]);
      // Stenen blir mark man kan stå på (en kupol)
      ROCKS.push({ x: s[0], z: s[2], r: Math.min(S.x, S.z) * 0.92, cy, hy: S.y * 0.9 });
    }
    rocks.castShadow = true; rocks.receiveShadow = true;
    scene.add(rocks);
  }

  /* ---------- Träd ---------- */
  {
    const n = 150;
    const trunkG = new THREE.CylinderGeometry(0.22, 0.32, 1, 7); trunkG.translate(0, 0.5, 0);
    const leafG = new THREE.IcosahedronGeometry(1, 1);
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: '#7a5236', flatShading: true }), n);
    const leaves = new THREE.InstancedMesh(leafG, windify(new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), 0.04), n * 2);
    const lc = ['#3f9a3c', '#58b84a', '#2f8a5a', '#6fc24f'].map(C);
    let t = 0, l = 0;
    for (let i = 0; i < n; i++) {
      // fler träd i klungor
      const s = spot(WATER + 1, 0.45); if (!s) continue;
      const [x, h, z] = s, th = 2.2 + R() * 2.5, k = 1.4 + R() * 1.4;
      trunks.setMatrixAt(t++, M.compose(P.set(x, h - 0.2, z), Q.identity(), S.set(1, th, 1)));
      const c = lc[Math.floor(R() * lc.length)];
      leaves.setMatrixAt(l, M.compose(P.set(x, h + th + k * 0.5, z), Q.setFromAxisAngle(UP, R() * 6), S.set(k, k * 0.9, k))); leaves.setColorAt(l++, c);
      leaves.setMatrixAt(l, M.compose(P.set(x + (R() - 0.5), h + th + k * 1.3, z + (R() - 0.5)), Q, S.set(k * 0.65, k * 0.65, k * 0.65))); leaves.setColorAt(l++, c.clone().offsetHSL(0, 0, 0.06));
      colliders.push({ x, z, r: 0.45 });
    }
    trunks.count = t; leaves.count = l;
    trunks.castShadow = leaves.castShadow = true;
    trunks.receiveShadow = leaves.receiveShadow = true;
    scene.add(trunks, leaves);
  }

  /* ---------- Lysande kristaller (lite rymdkänsla) ---------- */
  const crystals = [];
  {
    const g = new THREE.OctahedronGeometry(1, 0);
    const cols = ['#3ee8ff', '#ff5ccf', '#8a5cff'];
    for (let i = 0; i < 26; i++) {
      const s = spot(3, 0.8); if (!s) continue;
      const c = cols[i % 3], grp = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1, flatShading: true });
      for (let j = 0; j < 4; j++) {
        const cr = new THREE.Mesh(g, m);
        const k = 0.35 + R() * 0.7;
        cr.scale.set(k * 0.45, k * 1.6, k * 0.45);
        cr.position.set((R() - 0.5) * 1.2, k * 1.1, (R() - 0.5) * 1.2);
        cr.rotation.set((R() - 0.5) * 0.6, R() * 3, (R() - 0.5) * 0.6);
        cr.castShadow = true;
        grp.add(cr);
      }
      grp.position.set(s[0], s[1] - 0.1, s[2]);
      scene.add(grp);
      crystals.push(grp);
      colliders.push({ x: s[0], z: s[2], r: 0.9 });
    }
  }

  return {
    sun, terrain, colliders,
    update(t) {
      uniforms.uTime.value = t;
      crystals.forEach((c, i) => { c.rotation.y = t * 0.2 + i; });
    },
    // Färgkarta till minikartan
    minimap(size = 180) {
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      const ctx = cv.getContext('2d'), img = ctx.createImageData(size, size), c = new THREE.Color();
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        const x = -HALF + (px / size) * HALF * 2, z = -HALF + (py / size) * HALF * 2, h = heightAt(x, z);
        groundColor(x, z, h, slopeAt(x, z), c);
        if (h < WATER) c.set('#3ec7ff');
        const sh = 0.85 + Math.max(-0.15, Math.min(0.2, (heightAt(x - 1, z - 1) - h) * -0.15));
        const o = (py * size + px) * 4;
        img.data[o] = c.r * 255 * sh; img.data[o + 1] = c.g * 255 * sh; img.data[o + 2] = c.b * 255 * sh; img.data[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return cv;
    }
  };
}

/* =========================================================
   Gårdar: lada, staket och väderkvarn (OBJ-modeller)
   ========================================================= */
const PROP_COLORS = {
  DarkRed: '#a3352b', LightRed: '#c94a3c', RoofBlack: '#3b3a48', White: '#f4f1ea',
  Brown: '#8a5a3a', Grey: '#a3a3b3'
};
function loadOBJ(name) {
  return new OBJLoader().loadAsync(new URL(`../assets/props/${name}.obj`, import.meta.url).href).then(obj => {
    const mats = {};
    const matFor = m => mats[m.name] || (mats[m.name] = new THREE.MeshLambertMaterial({ color: PROP_COLORS[m.name] || '#cccccc', flatShading: true }));
    obj.traverse(o => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(matFor) : matFor(o.material);
      o.castShadow = true;
      o.receiveShadow = true;
    });
    return obj;
  });
}

export async function loadFarms(scene, colliders) {
  const [barn, bigBarn, windmill, fence1, fence2] = await Promise.all(['Barn', 'BigBarn', 'Windmill', 'Fence', 'Fence2'].map(loadOBJ));

  // Väderkvarnens vingar snurrar runt navet
  const HUB = new THREE.Vector3(0, 8.94, 0.7);
  const bladesSrc = windmill.children.find(o => /Blades/i.test(o.name));
  if (bladesSrc) bladesSrc.geometry.translate(-HUB.x, -HUB.y, -HUB.z);

  // Ladornas dörrar: flytta geometrin så att gångjärnet hamnar i origo
  const KITS = {
    farm: { src: barn, scale: 1, body: [-3.86, 3.86, -3.99, 4.06], top: 6.0, gap: [-1.65, 1.65], frontZ: 3.92,
      hinges: { Door2: [-1.93, 3.9, -1], Door: [1.84, 3.9, 1] } },
    // Stora ladan har skjutdörrar: i modellen står de öppna, stängda glider de ihop över öppningen
    big: { src: bigBarn, scale: 1.5, body: [-3.86, 3.86, -4.06, 3.99], top: 7.9, gap: [-1.65, 1.65], frontZ: 3.84,
      slide: { Door2: 1.14, Door: -1.03 } }
  };
  for (const kit of Object.values(KITS)) {
    if (kit.slide) {
      kit.src.children.forEach(o => {
        const key = /Door2/i.test(o.name) ? 'Door2' : /Door/i.test(o.name) ? 'Door' : null;
        if (key) o.userData.slide = kit.slide[key];
      });
      continue;
    }
    kit.src.children.forEach(o => {
      const key = /Door2/i.test(o.name) ? 'Door2' : /Door/i.test(o.name) ? 'Door' : null;
      if (!key) return;
      const [hx, hz] = kit.hinges[key];
      o.geometry.translate(-hx, 0, -hz);
      o.userData.hinge = [hx, hz, kit.hinges[key][2]];
    });
  }
  // Trägolv (plankor) – ritas på en canvas
  const plankTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const x = cv.getContext('2d'), cols = ['#8a5a36', '#7b4f2f', '#946340', '#835532', '#9c6a45'];
    const R = rng(77);
    for (let i = 0; i < 8; i++) {
      x.fillStyle = cols[i % cols.length]; x.fillRect(0, i * 64, 512, 64);
      for (let k = 0; k < 14; k++) { x.fillStyle = 'rgba(60,30,10,.12)'; x.fillRect(0, i * 64 + R() * 64, 512, 1 + R() * 2); }   // ådring
      const cut = R() * 400 + 50;
      x.fillStyle = '#4a2c18'; x.fillRect(0, i * 64, 512, 3); x.fillRect(cut, i * 64, 3, 64);                               // fogar
      for (const nx of [12, cut - 10, cut + 14, 498]) for (const ny of [14, 50]) { x.fillStyle = '#3a2414'; x.beginPath(); x.arc(nx, i * 64 + ny, 2.5, 0, 7); x.fill(); }
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return t;
  })();
  const hay = new THREE.BoxGeometry(1.3, 0.7, 0.8);
  const hayMat = new THREE.MeshLambertMaterial({ color: '#e8c55a' });
  const hayBand = new THREE.MeshLambertMaterial({ color: '#b8873a' });

  const spinners = [], barns = [];
  const toWorld = (f, lx, lz) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw); return [f.x + lx * c + lz * s, f.z - lx * s + lz * c]; };
  const box = (f, cx, cz, w, d, top, extra = {}) => {
    const [wx, wz] = toWorld(f, cx, cz);
    const swap = Math.abs(Math.sin(f.yaw)) > 0.5;
    const c = { box: true, x: wx, z: wz, hw: (swap ? d : w) / 2, hd: (swap ? w : d) / 2, top, ...extra };
    colliders.push(c);
    return c;
  };

  function addBarn(f, kit, oz) {
    const g = new THREE.Group();
    g.position.set(f.x, f.h, f.z);
    g.rotation.y = f.yaw;
    scene.add(g);
    const S = kit.scale;
    const b = kit.src.clone(true);
    b.scale.setScalar(S);
    b.position.set(0, -0.05, oz);
    b.traverse(o => { if (o.isMesh) o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const mm = m.clone(); mm.side = THREE.DoubleSide; return mm; }); });
    g.add(b);
    const doors = [];
    b.children.forEach(o => {
      if (o.userData.hinge) { o.position.set(o.userData.hinge[0], 0, o.userData.hinge[1]); doors.push(o); }
      if (o.userData.slide) { o.position.x = o.userData.slide; doors.push(o); }    // börjar stängd
    });

    // Väggar som kollision (dörröppningen stängs av en egen låda)
    const [x0, x1, z0, z1] = kit.body.map(v => v * S), T = 0.35, top = f.h + kit.top * S;
    const [g0, g1] = kit.gap.map(v => v * S), fz = kit.frontZ * S + oz;
    box(f, 0, z0 + oz + T / 2, x1 - x0, T, top);                      // bakvägg
    box(f, x0 + T / 2, (z0 + z1) / 2 + oz, T, z1 - z0, top);          // vänster
    box(f, x1 - T / 2, (z0 + z1) / 2 + oz, T, z1 - z0, top);          // höger
    box(f, (x0 + g0) / 2, fz, g0 - x0, T, top);                       // fram vänster
    box(f, (g1 + x1) / 2, fz, x1 - g1, T, top);                       // fram höger
    const door = box(f, (g0 + g1) / 2, fz, g1 - g0, T, top, { active: true });

    // Trägolv ovanpå modellens golv
    const FLOOR = 0.27 * S;
    const fw = x1 - x0 - 0.3, fd = z1 - z0 - 0.3;
    const ft = plankTex.clone(); ft.needsUpdate = true; ft.repeat.set(fw / 4, fd / 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshLambertMaterial({ map: ft }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, FLOOR - 0.04, (z0 + z1) / 2 + oz);
    floor.receiveShadow = true;
    g.add(floor);

    // Höbalar inne i ladan
    for (const [hx, hz, hy, r] of [[x0 + 1.2, z0 + oz + 1.0, 0.35 + FLOOR, 0], [x0 + 2.6, z0 + oz + 1.0, 0.35 + FLOOR, 0], [x0 + 1.9, z0 + oz + 1.0, 1.05 + FLOOR, 0], [x1 - 1.0, z0 + oz + 1.6, 0.35 + FLOOR, Math.PI / 2]]) {
      const m = new THREE.Mesh(hay, hayMat);
      m.position.set(hx, hy, hz); m.rotation.y = r; m.castShadow = m.receiveShadow = true;
      g.add(m);
      for (const dx of [-0.35, 0.35]) { const bnd = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.82), hayBand); bnd.position.set(dx, 0, 0); m.add(bnd); }
      const [wx, wz] = toWorld(f, hx, hz);
      colliders.push({ x: wx, z: wz, r: 0.6, top: f.h + hy + 0.35 });
    }

    const [dx, dz] = toWorld(f, (g0 + g1) / 2, fz + 1.2);
    const inner = (() => {
      const a = toWorld(f, x0, z0 + oz), c = toWorld(f, x1, z1 + oz);
      return { minX: Math.min(a[0], c[0]) + 0.2, maxX: Math.max(a[0], c[0]) - 0.2, minZ: Math.min(a[1], c[1]) + 0.2, maxZ: Math.max(a[1], c[1]) - 0.2 };
    })();
    barns.push({
      kind: f.kind, doors, doorCollider: door, door: { x: dx, z: dz }, inner, roof: f.h + 2.2 * S, floorY: f.h - 0.05 + FLOOR,
      open: false, t: 0,
      toggle() { this.open = !this.open; }
    });
  }

  const SEG = 5.89, NX = 5, NZ = 4;
  const hw = SEG * NX / 2, hd = SEG * NZ / 2;
  for (const f of FARMS) {
    if (f.kind === 'big') { addBarn(f, KITS.big, -1); continue; }
    addBarn(f, KITS.farm, -3);
    const g = new THREE.Group();
    g.position.set(f.x, f.h, f.z);
    g.rotation.y = f.yaw;
    scene.add(g);

    // Staket runt hagen, med grind framför ladan (går att hoppa över)
    let k = 0;
    const place = (lx, lz, rot) => {
      const fe = (k++ % 2 ? fence2 : fence1).clone();
      fe.position.set(lx, 0, lz);
      fe.rotation.y = rot;
      g.add(fe);
      for (let t = -2.6; t <= 2.6; t += 1.3) {
        const [wx, wz] = toWorld(f, lx + Math.cos(rot) * t, lz - Math.sin(rot) * t);
        colliders.push({ x: wx, z: wz, r: 0.45, jump: f.h + 1.2 });
      }
    };
    for (let i = 0; i < NX; i++) {
      const lx = -hw + SEG * (i + 0.5);
      place(lx, -hd, 0);
      if (i !== Math.floor(NX / 2)) place(lx, hd, 0);
    }
    for (let j = 0; j < NZ; j++) {
      const lz = -hd + SEG * (j + 0.5);
      place(-hw, lz, Math.PI / 2);
      place(hw, lz, Math.PI / 2);
    }

    // Väderkvarn utanför hörnet bak till vänster
    const w = windmill.clone(true);
    const wx = -hw - 5, wz = -hd + 4;
    w.position.set(wx, -0.1, wz);
    g.add(w);
    const bl = w.children.find(o => /Blades/i.test(o.name));
    if (bl) { bl.position.copy(HUB); spinners.push(bl); }
    box(f, wx + 1.6, wz, 5.4, 2.1, f.h + 9.7);
  }

  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return {
    barns,
    update(t, dt) {
      for (const s of spinners) s.rotation.z -= dt * 0.9;
      for (const b of barns) {
        const target = b.open ? 1 : 0;
        if (b.t === target) continue;
        b.t = target > b.t ? Math.min(1, b.t + dt * 1.6) : Math.max(0, b.t - dt * 1.6);
        const a = ease(b.t) * 1.75;
        for (const d of b.doors) {
          if (d.userData.slide) d.position.x = d.userData.slide * (1 - ease(b.t));     // skjutdörr
          else d.rotation.y = a * d.userData.hinge[2];                                 // gångjärnsdörr
        }
        b.doorCollider.active = b.t < 0.7;
      }
    }
  };
}
