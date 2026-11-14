/* Slår ihop många små delar till få, så att grafikkortet får färre ritanrop.
   Utseendet är detsamma: enfärgade material bakas in som hörnfärger i ett gemensamt material
   av samma typ (Phong/Lambert/Standard), texturerade delar slås ihop per material. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Kopiera en del (en materialgrupp) av en geometri till en egen, icke-indexerad geometri
function part(geo, group, names) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const total = g.attributes.position.count;
  const start = group ? group.start : 0;
  const count = group ? Math.min(group.count, total - start) : total;
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const a = g.attributes[name];
    if (!a) continue;
    const Arr = a.isInterleavedBufferAttribute ? a.data.array.constructor : a.array.constructor;
    const arr = new Arr(count * a.itemSize);
    for (let i = 0; i < count; i++) for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.getComponent(start + i, c);
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
  }
  if (g !== geo) g.dispose();
  if (!out.attributes.normal) out.computeVertexNormals();
  return out;
}
function addColor(geo, color) {
  const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}
// Enfärgade, ogenomskinliga material utan textur kan bakas in som hörnfärger
const canBake = m => m && m.color && !m.map && !m.alphaMap && !m.transparent && m.opacity === 1 && !m.vertexColors;
// Färger i hörnen ska vara i samma färgrymd som materialets färg (linjär)
const hex = c => (c && c.getHexString) ? c.getHexString() : '';
const matKey = m => [m.type, m.side, m.flatShading, hex(m.specular), m.shininess, hex(m.emissive), m.emissiveIntensity, m.roughness, m.metalness].join('|');
const baked = new Map();
function bakedMaterial(m) {
  const k = matKey(m);
  if (!baked.has(k)) {
    const b = m.clone();
    b.vertexColors = true; b.color.set(1, 1, 1); b.name = 'baked';
    baked.set(k, b);
  }
  return baked.get(k);
}

/* En rörlig del (dörr, vinge) med flera enfärgade material blir EN del med hörnfärger */
const bakedGeo = new Map();
export function bakeMesh(o) {
  if (!o.isMesh || o.isSkinnedMesh || !Array.isArray(o.material)) return;
  const mats = o.material;
  if (!mats.every(canBake) || new Set(mats.map(matKey)).size !== 1) return;
  const key = o.geometry.uuid + '|' + mats.map(m => m.color.getHexString()).join();
  if (!bakedGeo.has(key)) {
    const groups = o.geometry.groups.length ? o.geometry.groups : [null];
    const geos = groups.map(g => { const m = g ? mats[g.materialIndex] : mats[0]; const p = part(o.geometry, g, ['position', 'normal']); addColor(p, m.color); return p; });
    bakedGeo.set(key, geos.length === 1 ? geos[0] : mergeGeometries(geos, false));
  }
  o.geometry = bakedGeo.get(key);
  o.material = bakedMaterial(mats[0]);
}

/* Statiska saker: allt under root som inte ska röra sig (keep(obj) = true för dörrar, vingar osv.) */
export function mergeStatic(root, keep = () => false) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  root.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.merged) return;
    for (let a = o; a; a = a === root ? null : a.parent) {
      if (!a.visible) return;
      if (keep(a)) { bakeMesh(o); return; }             // rör sig: slå bara ihop färgerna
    }
    const M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const mats = [].concat(o.material);
    const groups = Array.isArray(o.material) && o.geometry.groups.length ? o.geometry.groups : [null];
    for (const g of groups) {
      const m = g ? mats[g.materialIndex] : mats[0];
      if (!m) continue;
      const bake = canBake(m);
      // Redan hörnfärgade material (utan textur) räknas som bakade och kan dela anrop med bakade delar
      const pre = !bake && m.vertexColors && !m.map && !m.transparent && o.geometry.attributes.color;
      const geo = part(o.geometry, g, bake ? ['position', 'normal'] : pre ? ['position', 'normal', 'color'] : ['position', 'normal', 'uv']);
      geo.applyMatrix4(M);
      if (bake) addColor(geo, m.color);
      const vc = bake || pre;
      const key = (vc ? 'vc|' + matKey(m) : m.uuid) + '|' + o.castShadow + o.receiveShadow + '|' + Object.keys(geo.attributes).sort().join();
      if (!buckets.has(key)) buckets.set(key, { mat: vc ? bakedMaterial(m) : m, geos: [], cast: o.castShadow, recv: o.receiveShadow });
      buckets.get(key).geos.push(geo);
    }
    victims.push(o);
  });
  if (!victims.length) return 0;
  for (const v of victims) {
    if (v.children.length) v.layers.set(31);           // har barn som ska synas: bara dölj själva meshen
    else v.parent.remove(v);
  }
  for (const b of buckets.values()) {
    const geo = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (b.geos.length > 1) b.geos.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.userData.merged = true;
    root.add(mesh);
  }
  return victims.length - buckets.size;
}

/* Animerade figurer (djur, kistor): alla delar som följer samma skelett blir EN mesh med ETT skelett.
   Görs en gång på mallen innan den klonas. Varje kopia får då en enda bentextur i stället för en per del. */
export function mergeSkinned(root) {
  const meshes = [];
  root.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  if (meshes.length < 1) return null;
  root.updateMatrixWorld(true);
  const bones = [], boneInv = [], index = new Map();
  const buckets = new Map();
  let cast = false, recv = false;
  for (const sm of meshes) {
    const remap = sm.skeleton.bones.map((b, i) => {
      if (!index.has(b)) { index.set(b, bones.length); bones.push(b); boneInv.push(sm.skeleton.boneInverses[i].clone()); }
      return index.get(b);
    });
    const mats = [].concat(sm.material);
    const groups = Array.isArray(sm.material) && sm.geometry.groups.length ? sm.geometry.groups : [null];
    for (const g of groups) {
      const m = g ? mats[g.materialIndex] : mats[0];
      const geo = part(sm.geometry, g, ['position', 'normal', 'skinIndex', 'skinWeight']);
      geo.applyMatrix4(sm.bindMatrix);
      const si = geo.attributes.skinIndex;
      const arr = new Uint16Array(si.count * 4);
      for (let i = 0; i < si.count; i++) for (let c = 0; c < 4; c++) arr[i * 4 + c] = remap[si.getComponent(i, c)] || 0;
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(arr, 4));
      const sw = geo.attributes.skinWeight;
      if (!(sw.array instanceof Float32Array)) {
        const w = new Float32Array(sw.count * 4);
        for (let i = 0; i < sw.count; i++) for (let c = 0; c < 4; c++) w[i * 4 + c] = sw.getComponent(i, c) / (sw.normalized ? (sw.array instanceof Uint8Array ? 255 : 65535) : 1);
        geo.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
      }
      addColor(geo, m.color || new THREE.Color(1, 1, 1));
      const key = matKey(m);
      if (!buckets.has(key)) buckets.set(key, { mat: bakedMaterial(m), geos: [] });
      buckets.get(key).geos.push(geo);
    }
    cast = cast || sm.castShadow; recv = recv || sm.receiveShadow;
  }
  const list = [...buckets.values()];
  const geos = list.map(b => b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false));
  const geo = geos.length === 1 ? geos[0] : mergeGeometries(geos, true);
  const merged = new THREE.SkinnedMesh(geo, list.length === 1 ? list[0].mat : list.map(b => b.mat));
  merged.castShadow = cast; merged.receiveShadow = recv;
  const parent = meshes[0].parent;
  parent.add(merged);
  merged.bind(new THREE.Skeleton(bones, boneInv), new THREE.Matrix4());
  for (const sm of meshes) { sm.parent.remove(sm); sm.skeleton.dispose(); }
  root.updateMatrixWorld(true);
  merged.computeBoundingSphere();
  merged.boundingSphere.radius *= 1.5;      // marginal för animationen
  merged.frustumCulled = true;
  return merged;
}

/* Frigör allt GPU-minne under ett objekt (geometrier, material, texturer, skelett) */
export function disposeDeep(root, { keepShared = new Set() } = {}) {
  root.traverse(o => {
    if (o.geometry && !keepShared.has(o.geometry)) o.geometry.dispose();
    for (const m of [].concat(o.material || [])) {
      if (keepShared.has(m)) continue;
      for (const k in m) if (m[k] && m[k].isTexture && !keepShared.has(m[k])) m[k].dispose();
      m.dispose();
    }
    if (o.skeleton) o.skeleton.dispose();
  });
}
