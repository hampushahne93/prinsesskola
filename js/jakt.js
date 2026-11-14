/* =========================================================
   Guldmyntsjakten – spelet (tredjepersonsvy)
   ========================================================= */
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { createCharacter } from './avatar.js';
import { buildWorld, heightAt, rockHeightAt, HALF, PLAY, WATER, FARMS, loadFarms , TOWN } from './world.js';

const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;

/* ---------- Spelaren från sparfilen ---------- */
const data = Save.load();
const player = Save.active() || Save.players()[0] || null;
const FALLBACK = { skin: '#f6b694', hair: 'kort', hairColor: '#6a4026', eyes: '#2f6db5', top: 'tshirt', topColor: '#3ee8ff', bottom: 'jeans', bottomColor: '#2f6db5', shoes: '#e23b4e' };
const look = player ? { ...FALLBACK, ...player.look } : FALLBACK;
$('pname').textContent = player ? player.name : 'Gäst';
$('pcoins').textContent = '🪙 ' + (player ? player.coins : 0);

/* ---------- Renderare och scen ---------- */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1400);

const world = buildWorld(scene, { lowSpec: touch });
let farms = null;
loadFarms(scene, world.colliders).then(f => { farms = f; return spawnChests(f.chestSpots); })
  .then(() => import('./animals.js')).then(m => m.spawnAnimals(scene, world)).then(a => { animals = a; })
  .catch(e => console.error('Gårdar/djur', e));
let animals = null;

/* ---------- Skattkistor: 10 st på slumpade platser av 100 möjliga ---------- */
const CHESTS = 10, chests = [];
const CHEST_COLORS = { DarkMetal: '#4b4b58', Wood: '#a0602c', Metal: '#9097a6', Gold: '#ffcc3a', Gold_Dark: '#d0901c' };
async function spawnChests(spots) {
  const src = await new FBXLoader().loadAsync(new URL('../assets/props/Chest.fbx', import.meta.url).href);
  const mats = {};
  src.traverse(o => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map(m => mats[m.name] || (mats[m.name] = new THREE.MeshLambertMaterial({
      color: CHEST_COLORS[m.name] || '#cccccc', flatShading: true,
      emissive: /Gold/.test(m.name) ? '#ffb000' : '#000000', emissiveIntensity: /Gold/.test(m.name) ? 0.25 : 0 })));
    o.castShadow = true; o.frustumCulled = false;
  });
  // Ungefär 45 % inomhus (hus och lador): 4 eller 5 av 10, resten ute
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const inside = shuffle(spots.filter(s => s.where !== 'ute')), outside = shuffle(spots.filter(s => s.where === 'ute'));
  const nIn = Math.random() < 0.5 ? 4 : 5, picked = [], used = new Set();
  // Nergrävda kistor (2 st) väljs bland utomhusplatserna som inte används, syns inte på kartan
  const buried = outside.slice(CHESTS, CHESTS + 2);
  for (const s of inside) { if (picked.length >= nIn) break; if (!used.has(s.bid)) { used.add(s.bid); picked.push(s); } }   // max en kista per hus/lada
  for (const s of [...picked, ...outside.slice(0, CHESTS - picked.length)]) {
    const o = SkeletonUtils.clone(src);
    o.scale.setScalar(0.0055);
    o.position.set(s.x, s.y, s.z);
    o.rotation.y = s.rot;
    const lids = [];
    o.traverse(b => { if (b.isBone && b.name === 'Chest_Top') lids.push({ b, r0: b.rotation.x }); });
    scene.add(o);
    // Glittrande stjärna ovanför så att kistan syns på håll
    const star = new THREE.Sprite(starMat);
    star.position.set(s.x, s.y + 1.7, s.z); star.scale.setScalar(0.7);
    scene.add(star);
    world.colliders.push({ x: s.x, z: s.z, r: 0.6, top: s.y + 0.95 });
    chests.push({ ...s, obj: o, lids, star, open: false, t: 0 });
  }
  // En av kistorna ger 1 minut extra speltid i stället för mynt
  chests[Math.floor(Math.random() * chests.length)].bonusTime = true;
  // Nergrävda kistor: bara en liten jordhög, ingen stjärna och inte på kartan
  for (const s of buried) {
    const o = SkeletonUtils.clone(src);
    o.scale.setScalar(0.0055);
    o.position.set(s.x, s.y - 1.1, s.z);
    o.rotation.y = s.rot;
    o.visible = false;
    const lids = [];
    o.traverse(b => { if (b.isBone && b.name === 'Chest_Top') lids.push({ b, r0: b.rotation.x }); });
    scene.add(o);
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.set(s.x, s.y - 0.05, s.z); mound.rotation.y = s.rot;
    scene.add(mound);
    // Träskylt bredvid högen
    const sign = makeSign();
    const sx = s.x + Math.cos(s.rot) * 1.1, sz = s.z - Math.sin(s.rot) * 1.1;
    sign.position.set(sx, heightAt(sx, sz) - 0.05, sz); sign.rotation.y = s.rot + 0.25; sign.scale.setScalar(1.45);
    scene.add(sign);
    world.colliders.push({ x: sx, z: sz, r: 0.18 });
    digs.push({ ...s, obj: o, lids, mound, sign, dug: false, rise: 0, open: false, t: 0, buried: true });
  }
}
const digs = [];
// Skylt: stolpe + bräda med text "Skatt?" och ett rött kryss
const signParts = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c8955a'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(90,55,25,.35)'; g.lineWidth = 3;
  for (let y = 18; y < 128; y += 30) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + 6, 170, y - 6, 256, y + 2); g.stroke(); }
  g.strokeStyle = '#7a4a22'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 120);
  g.fillStyle = '#4a2a10'; g.font = 'bold 52px Fredoka, Arial Rounded MT Bold, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('Skatt?', 150, 66);
  g.strokeStyle = '#e23b4e'; g.lineWidth = 12; g.lineCap = 'round';
  g.beginPath(); g.moveTo(22, 40); g.lineTo(66, 88); g.moveTo(66, 40); g.lineTo(22, 88); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const wood = new THREE.MeshLambertMaterial({ color: '#8a5a32', flatShading: true });
  return { board: new THREE.MeshLambertMaterial({ map: t }), wood };
})();
function makeSign() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.25, 0.1), signParts.wood); post.position.y = 0.62;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 0.05), signParts.wood); back.position.set(0, 1.08, -0.01);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), signParts.board); face.position.set(0, 1.08, 0.016);
  const face2 = face.clone(); face2.rotation.y = Math.PI; face2.position.z = -0.036;
  back.rotation.z = face.rotation.z = face2.rotation.z = 0.06;
  g.add(post, back, face, face2);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const moundGeo = new THREE.SphereGeometry(0.75, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); moundGeo.scale(1, 0.22, 0.8);
const moundMat = new THREE.MeshLambertMaterial({ color: '#7a5a3a', flatShading: true });
const starMat = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,150,1)'); gr.addColorStop(0.25, 'rgba(255,210,60,0.8)'); gr.addColorStop(1, 'rgba(255,200,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fffbe0'; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 7 : 22; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
  g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
})();
let coins = player ? player.coins : 0;
function openChest(c) {
  if (c.open) return;
  c.open = true;
  coinBurst(c);
  if (c.bonusTime) {                                  // tidskistan
    if (timeLeft !== null && !timeUp) timeLeft += 60;
    $('timer').classList.remove('bump'); void $('timer').offsetWidth; $('timer').classList.add('bump');
    toast('⏱️ +1 minut extra speltid!');
    return;
  }
  // 1 eller 2 guldmynt per kista (50/50), nergrävda kistor ger dubbelt
  const n = (Math.random() < 0.5 ? 1 : 2) * (c.buried ? 2 : 1);
  giveCoins(n);
  const left = chests.filter(x => !x.open).length;
  toast(`🎉 +${n} guldmynt${n === 1 ? '' : ''}!` + (c.buried ? ' Du grävde upp en skatt!' : left ? ` ${left} kistor kvar` : ' Du hittade alla kistor!'));
}
function giveCoins(n) {
  if (player) coins = Save.addCoins(player.id, n); else coins += n;
  $('pcoins').textContent = '🪙 ' + coins;
  $('pcoins').classList.remove('bump'); void $('pcoins').offsetWidth; $('pcoins').classList.add('bump');
}
// Mynt som hoppar ur kistan
const burst = [];
const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), coinMat = new THREE.MeshLambertMaterial({ color: '#ffcc3a', emissive: '#ffb000', emissiveIntensity: 0.4 });
function coinBurst(c) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(coinGeo, coinMat);
    m.position.set(c.x, c.y + 0.7, c.z); m.rotation.x = Math.PI / 2;
    const a = Math.random() * Math.PI * 2;
    scene.add(m);
    burst.push({ m, vx: Math.cos(a) * 1.5, vz: Math.sin(a) * 1.5, vy: 5 + Math.random() * 2.5, life: 1.3 });
  }
}
function updateChests(dt, t) {
  for (const c of digs) {
    if (!c.dug) continue;
    if (c.rise < 1) { c.rise = Math.min(1, c.rise + dt * 1.2); c.obj.position.y = c.y - 1.1 + 1.1 * (1 - Math.pow(1 - c.rise, 3)); c.mound.scale.setScalar(1 - c.rise * 0.6); }
    else if (!c.open) openChest(c);
    if (c.open && c.t < 1) { c.t = Math.min(1, c.t + dt * 1.8); const e = 1 - Math.pow(1 - c.t, 3); for (const l of c.lids) l.b.rotation.x = l.r0 - 1.2 * e; }
  }
  for (const c of chests) {
    if (c.open && c.t < 1) {
      c.t = Math.min(1, c.t + dt * 1.8);
      const e = 1 - Math.pow(1 - c.t, 3);
      for (const l of c.lids) l.b.rotation.x = l.r0 - 1.2 * e;
    }
    if (c.open) { c.star.material = starMat; c.star.visible = c.t < 0.5; }
    else { c.star.position.y = c.y + 1.7 + Math.sin(t * 2 + c.x) * 0.12; c.star.material.rotation = t; }
  }
  for (let i = burst.length - 1; i >= 0; i--) {
    const b = burst[i];
    b.vy -= 14 * dt; b.m.position.x += b.vx * dt; b.m.position.y += b.vy * dt; b.m.position.z += b.vz * dt;
    b.m.rotation.z += dt * 10; b.life -= dt;
    if (b.life <= 0) { scene.remove(b.m); burst.splice(i, 1); }
  }
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

/* ---------- Minikarta ---------- */
const mini = $('minimap'), mctx = mini.getContext('2d');
const mapImg = world.minimap(180);
function drawMinimap(x, z, heading) {
  const s = mini.width;
  mctx.drawImage(mapImg, 0, 0, s, s);
  mctx.fillStyle = '#f4f1ea'; mctx.strokeStyle = '#6a4a8a'; mctx.lineWidth = 1;
  for (const h of TOWN.houses) {   // husen i staden
    const hx = ((h.x + HALF) / (HALF * 2)) * s, hz = ((h.z + HALF) / (HALF * 2)) * s, r = h.type === 4 ? 4 : 2.5;
    mctx.fillRect(hx - r, hz - 2.5, r * 2, 5); mctx.strokeRect(hx - r, hz - 2.5, r * 2, 5);
  }
  for (const f of FARMS) {   // gårdar och stora lador
    const fx = ((f.x + HALF) / (HALF * 2)) * s, fz = ((f.z + HALF) / (HALF * 2)) * s, r = f.kind === 'big' ? 6 : 4;
    mctx.fillStyle = f.kind === 'big' ? '#8a1f2a' : '#c94a3c'; mctx.strokeStyle = '#ffffff'; mctx.lineWidth = 1.5;
    mctx.fillRect(fx - r, fz - r, r * 2, r * 2); mctx.strokeRect(fx - r, fz - r, r * 2, r * 2);
  }
  for (const c of chests) {   // oöppnade kistor
    if (c.open) continue;
    const cx = ((c.x + HALF) / (HALF * 2)) * s, cz = ((c.z + HALF) / (HALF * 2)) * s;
    mctx.beginPath(); mctx.arc(cx, cz, 3.5, 0, Math.PI * 2);
    mctx.fillStyle = '#ffcc3a'; mctx.fill(); mctx.strokeStyle = '#7a4a00'; mctx.lineWidth = 1.2; mctx.stroke();
  }
  const px = ((x + HALF) / (HALF * 2)) * s, pz = ((z + HALF) / (HALF * 2)) * s;
  mctx.save(); mctx.translate(px, pz); mctx.rotate(-heading);
  mctx.beginPath(); mctx.moveTo(0, 9); mctx.lineTo(6, -6); mctx.lineTo(0, -2); mctx.lineTo(-6, -6); mctx.closePath();
  mctx.fillStyle = '#ffffff'; mctx.fill(); mctx.strokeStyle = '#e23b4e'; mctx.lineWidth = 2; mctx.stroke();
  mctx.restore();
}

/* ---------- Gubben ---------- */
const P = { x: 0, z: 0, y: heightAt(0, 0), vy: 0, grounded: true, heading: 0, speed: 0 };
const RUN = 7;            // meter per sekund (ca 1 minut diagonalt över kartan)
const WALK = 2.6;
const GRAVITY = -22, JUMP = 9.5;     // ca 2 m högt: räcker för att hoppa över staketen
let ch = null;
/* ---------- Prylar (köps i "Ändra gubbe" → Prylar) ---------- */
const GEAR = [
  { id: 'spade', key: '1', name: 'Spade', icon: '<svg viewBox="0 0 40 40"><rect x="18" y="4" width="4" height="20" rx="2" fill="#b07a48"/><rect x="14" y="2" width="12" height="5" rx="2.5" fill="#e23b4e"/><path d="M11 22h18v7c0 5-4 9-9 9s-9-4-9-9z" fill="#cfd5df" stroke="#8a93a6" stroke-width="1.5"/></svg>', hand: true },
  { id: 'yxa', key: '2', name: 'Yxa', icon: '🪓', hand: true },
  { id: 'fjader', key: '3', name: 'Fjäder', icon: '🪶', tip: 'Hoppa dubbelt så högt' },
  { id: 'inlines', key: '4', name: 'Inlines', icon: '🛼', tip: 'Spring dubbelt så snabbt' },
  { id: 'spo', key: '5', name: 'Fiskespö', icon: '🎣', hand: true, price: 500 }
];
const owns = id => !!(player && player.unlocked && player.unlocked.includes('gear:' + id));
const gearOn = new Set(player && Array.isArray(player.gearOn) ? player.gearOn.filter(owns) : []);
function saveGear() { if (player) Save.updatePlayer(player.id, p => { p.gearOn = [...gearOn]; }); }
function renderHotbar() {
  const bar = $('hotbar');
  bar.innerHTML = '';
  for (const g of GEAR) {
    const b = document.createElement('button');
    b.className = 'slot' + (owns(g.id) ? '' : ' locked') + (gearOn.has(g.id) ? ' on' : '');
    b.innerHTML = `<span class="k">${g.key}</span><span class="ic">${g.icon}</span><span class="nm">${g.name}</span>` + (owns(g.id) ? '' : '<span class="lock">🔒</span>');
    b.title = g.tip || g.name;
    b.onclick = () => toggleGear(g.id);
    bar.appendChild(b);
  }
}
let toastTm = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastTm); toastTm = setTimeout(() => el.classList.remove('show'), 2600); }
function toggleGear(id) {
  const g = GEAR.find(x => x.id === id);
  if (!owns(id)) { toast(`🔒 ${g.name} låser du upp under Ändra gubbe → Prylar (${g.price || 1000} 🪙)`); return; }
  if (gearOn.has(id)) { gearOn.delete(id); ch && ch.setGear(id, false); toast(`${g.name} av`); }
  else {
    if (g.hand) for (const o of GEAR) if (o.hand && gearOn.has(o.id)) { gearOn.delete(o.id); ch && ch.setGear(o.id, false); }
    gearOn.add(id); ch && ch.setGear(id, true);
    toast(`${g.name} på!` + (g.tip ? ' ' + g.tip + '!' : ''));
  }
  saveGear();
  renderHotbar();
}
renderHotbar();
addEventListener('keydown', e => {
  const g = GEAR.find(x => e.code === 'Digit' + x.key || e.code === 'Numpad' + x.key);
  if (g) toggleGear(g.id);
});

createCharacter(look, player ? player.gender : 'kille').then(c => {
  ch = c;
  scene.add(c.root);
  for (const id of gearOn) c.setGear(id, true);
  $('loading').classList.add('hide');
  showHelp();
  timeLeft = GAME_TIME;          // klockan startar när gubben är laddad
}).catch(e => {
  console.error(e);
  $('loading').innerHTML = '<div>😕 Kunde inte ladda gubben.<br>Ladda om sidan.</div>';
});

/* ---------- Kamera (TPP) ---------- */
let yaw = Math.PI, pitch = 0.32, dist = 6.5;
const camTarget = new THREE.Vector3();
const barnLight = new THREE.PointLight('#ffd9a0', 30, 14, 1.6);   // varm lampa inne i ladan
barnLight.intensity = 0;   // alltid med i scenen (annars laggar det när den tänds), bara släckt ute
scene.add(barnLight);

/* ---------- Tangentbord ---------- */
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); jump(); }
  if (e.code === 'KeyM') $('minimap').classList.toggle('hide');
  if (e.code === 'KeyH') $('help').classList.toggle('show');
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/* ---------- Mus: håll HÖGER musknapp för att titta runt ----------
   Annars följer kameran gubben bakifrån och A/D svänger. */
let dragging = false, lastX = 0, lastY = 0, hintShown = 0;
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (!dragging) return;
  if (document.pointerLockElement === canvas) turn(e.movementX, e.movementY);
  else { turn(e.clientX - lastX, e.clientY - lastY); lastX = e.clientX; lastY = e.clientY; }
});
canvas.addEventListener('mousedown', e => {
  if (e.button !== 2) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (_) {}
  $('lockHint').classList.add('hide');
});
addEventListener('mouseup', e => {
  if (e.button !== 2 || !dragging) return;
  dragging = false;
  if (document.pointerLockElement === canvas) document.exitPointerLock?.();
});
canvas.addEventListener('wheel', e => { dist = Math.min(12, Math.max(3, dist + e.deltaY * 0.004)); }, { passive: true });
function turn(dx, dy) {
  yaw -= dx * 0.0028;
  pitch = Math.min(1.25, Math.max(-0.15, pitch + dy * 0.0022));
}

/* ---------- Touch: joystick vänster, dra höger för kamera ---------- */
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
let lookId = null;
if (touch) document.body.classList.add('touch');
canvas.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && stick.id === null) {
      stick.id = t.identifier; stick.ox = t.clientX; stick.oy = t.clientY; stick.x = stick.y = 0;
      const j = $('joy'); j.style.left = t.clientX + 'px'; j.style.top = t.clientY + 'px'; j.classList.add('show');
    } else if (lookId === null) { lookId = t.identifier; lastX = t.clientX; lastY = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) {
      let dx = t.clientX - stick.ox, dy = t.clientY - stick.oy;
      const m = Math.hypot(dx, dy), max = 55;
      if (m > max) { dx *= max / m; dy *= max / m; }
      stick.x = dx / max; stick.y = dy / max;
      $('knob').style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (t.identifier === lookId) {
      turn((t.clientX - lastX) * 1.6, (t.clientY - lastY) * 1.6); lastX = t.clientX; lastY = t.clientY;
    }
  }
  e.preventDefault();
}, { passive: false });
const endTouch = e => {
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) { stick.id = null; stick.x = stick.y = 0; $('joy').classList.remove('show'); $('knob').style.transform = ''; }
    if (t.identifier === lookId) lookId = null;
  }
};
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);
$('jumpBtn').addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
$('jumpBtn').addEventListener('click', jump);

// Stenar, träd, höbalar och ladväggar. Väggarna körs sist och knuffar alltid tillbaka
// till den sida man kom ifrån, så att t.ex. en höbal aldrig kan trycka ut en genom väggen.
function collide(nx, nz, ox0, oz0) {
  for (let pass = 0; pass < 2; pass++) {
    for (const c of world.colliders) {
      if (c.box || c.active === false) continue;
      if (c.jump && P.y > c.jump) continue;                   // hoppar över staketet
      if (c.top && P.y > c.top - 0.05) continue;              // hoppar över höbal
      const dx = nx - c.x, dz = nz - c.z, rr = c.r + 0.35, dd = dx * dx + dz * dz;
      if (dd < rr * rr && dd > 0.0001) { const k = rr / Math.sqrt(dd); nx = c.x + dx * k; nz = c.z + dz * k; }
    }
    for (const c of world.colliders) {
      if (!c.box || c.active === false) continue;              // öppen ladudörr
      const ex = c.hw + 0.35, ez = c.hd + 0.35;
      const px = nx - c.x, pz = nz - c.z, ox = ex - Math.abs(px), oz = ez - Math.abs(pz);
      if (ox <= 0 || oz <= 0) continue;
      const qx = ox0 - c.x, qz = oz0 - c.z;                   // var man stod innan
      const wasOutX = Math.abs(qx) >= ex - 0.02, wasOutZ = Math.abs(qz) >= ez - 0.02;
      if (wasOutX && (!wasOutZ || ox < oz)) nx = c.x + Math.sign(qx) * ex;
      else if (wasOutZ) nz = c.z + Math.sign(qz) * ez;
      else if (ox < oz) nx += Math.sign(px || 1) * ox;
      else nz += Math.sign(pz || 1) * oz;
    }
  }
  return [nx, nz];
}
function barnAt(x, z) {
  return farms ? farms.barns.find(b => x > b.inner.minX - 0.15 && x < b.inner.maxX + 0.15 && z > b.inner.minZ - 0.15 && z < b.inner.maxZ + 0.15) : null;
}
function groundAt(x, z) { const b = barnAt(x, z); return b ? b.floorY : Math.max(heightAt(x, z), rockHeightAt(x, z), farms ? farms.platformAt(x, z) : -Infinity); }
let nearBarn = null;
let nearChest = null;
function useDoor() { if (nearChest) openChest(nearChest); else if (holdAct) return; else if (nearBarn) nearBarn.toggle(); }
let holdAct = null, holdT = 0;
const falling = [];
addEventListener('keydown', e => { if (e.code === 'KeyE' || e.code === 'Enter') useDoor(); });
// Knappen: tryck (dörr/kista) eller håll inne (hugga/gräva)
let promptHeld = false;
$('prompt').addEventListener('pointerdown', e => { e.preventDefault(); promptHeld = true; useDoor(); });
addEventListener('pointerup', () => { promptHeld = false; });
addEventListener('pointercancel', () => { promptHeld = false; });

function jump() {
  if (!ch || !P.grounded) return;
  P.y = Math.max(P.y, groundAt(P.x, P.z));
  P.vy = JUMP * (gearOn.has('fjader') ? Math.SQRT2 : 1); P.grounded = false;   // fjädern: dubbelt så högt
  ch.play('jump', 0.08);
}

/* ---------- Hjälpruta ---------- */
function showHelp() {
  $('help').classList.add('show');
  setTimeout(() => $('help').classList.remove('show'), 7000);
}
$('help').addEventListener('click', () => $('help').classList.remove('show'));
$('helpBtn').addEventListener('click', () => $('help').classList.toggle('show'));

/* ---------- Spelloop ---------- */
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
let wasMoving = false;

/* ---------- Speltid: 2 minuter, sen tillbaka till menyn (allt är redan sparat) ---------- */
const GAME_TIME = 120;
let timeLeft = null, timeUp = false;
function tickTimer(dt) {
  if (timeLeft === null || timeUp) return;
  timeLeft = Math.max(0, timeLeft - dt);
  const s = Math.ceil(timeLeft);
  $('timer').textContent = `⏱️ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('timer').classList.toggle('low', s <= 10);
  if (timeLeft <= 0) {
    timeUp = true;
    for (const k in keys) keys[k] = false;
    if (document.pointerLockElement) document.exitPointerLock?.();
    $('timeUp').classList.add('show');
    setTimeout(() => { location.href = 'index.html'; }, 3500);
  }
}
function update(dt) {
  tickTimer(dt);
  if (timeUp) dt = 0.0001;       // gubben står still när tiden är slut
  // Riktning från tangentbord eller joystick (i förhållande till kameran)
  let ix = 0, iz = 0;
  const followCam = !dragging && stick.id === null;          // kameran följer gubbens ansikte
  if (keys.KeyW || keys.ArrowUp) iz += 1;
  if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  let mag = Math.min(1, Math.hypot(ix, iz));
  if (stick.id !== null) { ix = stick.x; iz = -stick.y; mag = Math.min(1, Math.hypot(ix, iz)); }
  else if (followCam) {
    // A/D svänger gubben (och kameran följer med bakom)
    yaw += -ix * 2.6 * dt;
    if (ix && !iz) P.heading = yaw + Math.PI;                  // svänger på stället
    ix = 0; mag = Math.abs(iz);
  }
  const walking = keys.ShiftLeft || keys.ShiftRight || (stick.id !== null && mag < 0.55);

  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  move.set(0, 0, 0).addScaledVector(fwd, iz).addScaledVector(right, ix);
  const moving = mag > 0.08;
  const boost = gearOn.has('inlines') ? 2 : 1;                     // inlines: dubbelt så snabbt
  const target = moving ? (walking ? WALK : RUN) * boost : 0;
  P.speed += (target - P.speed) * Math.min(1, dt * 10);
  if (moving) {
    move.normalize();
    const want = Math.atan2(move.x, move.z);
    let d = want - P.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (followCam && iz < 0) P.heading = yaw + Math.PI;        // backa: titta framåt
    else P.heading += d * Math.min(1, dt * 12);
    // Joystick: kameran glider mjukt in bakom gubben när man springer
    if (stick.id !== null && lookId === null) {
      let dy = (P.heading + Math.PI) - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      yaw += dy * Math.min(1, dt * 1.6);
    }
    let nx = P.x + move.x * P.speed * dt, nz = P.z + move.z * P.speed * dt;
    // Inte för brant uppför (berg runt kanten)
    const climb = groundAt(nx, nz) - groundAt(P.x, P.z);
    if (P.grounded && climb > 0.45 && climb / Math.max(0.001, P.speed * dt) > 1.6) { nx = P.x; nz = P.z; }   // låga trösklar går bra
    if (!P.grounded && groundAt(nx, nz) > P.y + 0.35) { nx = P.x; nz = P.z; }   // i luften: studsa inte in i stenar
    // Kollision i små delsteg så man aldrig hoppar igenom en tunn vägg
    const steps = Math.max(1, Math.ceil(Math.hypot(nx - P.x, nz - P.z) / 0.15));
    let cx0 = P.x, cz0 = P.z;
    for (let i = 1; i <= steps; i++) {
      const r = collide(P.x + (nx - P.x) * i / steps, P.z + (nz - P.z) * i / steps, cx0, cz0);
      cx0 = r[0]; cz0 = r[1];
    }
    nx = cx0; nz = cz0;
    P.x = Math.max(-PLAY, Math.min(PLAY, nx));
    P.z = Math.max(-PLAY, Math.min(PLAY, nz));
  }

  // Hopp och mark (inne i en lada går man på trägolvet)
  const ground = groundAt(P.x, P.z);
  if (!P.grounded) {
    P.vy += GRAVITY * dt;
    P.y += P.vy * dt;
    if (P.y <= ground && P.vy <= 0) { P.y = ground; P.vy = 0; P.grounded = true; if (ch) ch.play(moving ? 'run' : 'idle', 0.15); }
    else if (P.y < ground) P.y = ground;           // uppåt i en backe: följ marken, men fortsätt hoppet
  } else if (ground < P.y - 0.6) {
    P.grounded = false; P.vy = 0;                  // gick över en kant – falla
  } else {
    P.y = ground;
  }

  // Animationer
  if (ch) {
    if (P.grounded) {
      if (moving && !wasMoving) ch.play('run', 0.15);
      if (!moving && wasMoving) ch.play('idle', 0.25);
    }
    ch.mixer.timeScale = moving && walking ? 0.55 : moving && gearOn.has('inlines') ? 1.35 : 1;
    wasMoving = moving;
    ch.root.position.set(P.x, P.y + (gearOn.has('inlines') ? 0.07 : 0), P.z);
    ch.root.rotation.y = P.heading;
    ch.update(dt);
  }

  // Kamera
  camTarget.set(P.x, P.y + 1.6, P.z);
  // Dra in kameran om något (vägg, sten) är i vägen
  let d = dist;
  const inBarn = barnAt(P.x, P.z);
  if (inBarn) d = Math.min(d, 4.2);
  const sx = Math.sin(yaw) * Math.cos(pitch), sz = Math.cos(yaw) * Math.cos(pitch), sy = Math.sin(pitch);
  for (let st = 0.6; st <= d; st += 0.35) {
    const tx = camTarget.x + sx * st, tz = camTarget.z + sz * st, ty = camTarget.y + sy * st;
    const hit = world.colliders.some(c => c.top && c.active !== false && ty < c.top + 0.3 && (c.box
      ? Math.abs(tx - c.x) < c.hw + 0.25 && Math.abs(tz - c.z) < c.hd + 0.25
      : (tx - c.x) ** 2 + (tz - c.z) ** 2 < (c.r + 0.4) ** 2));
    if (hit) { d = Math.max(0.7, st - 0.4); break; }
  }
  const cx = camTarget.x + Math.sin(yaw) * Math.cos(pitch) * d;
  const cz = camTarget.z + Math.cos(yaw) * Math.cos(pitch) * d;
  let cy = camTarget.y + Math.sin(pitch) * d;
  cy = Math.max(cy, Math.max(heightAt(cx, cz), rockHeightAt(cx, cz)) + 0.6);
  let ccx = cx, ccz = cz;
  if (inBarn) {   // inne i ladan: kameran stannar innanför väggarna och under taket
    const m = 0.5, I = inBarn.inner;
    ccx = Math.min(I.maxX - m, Math.max(I.minX + m, cx));
    ccz = Math.min(I.maxZ - m, Math.max(I.minZ + m, cz));
    cy = Math.min(cy, inBarn.roof);
    barnLight.position.set((I.minX + I.maxX) / 2, inBarn.roof + 0.05, (I.minZ + I.maxZ) / 2);
  }
  barnLight.intensity += ((inBarn ? 30 : 0) - barnLight.intensity) * Math.min(1, dt * 8);
  camera.position.lerp(new THREE.Vector3(ccx, cy, ccz), Math.min(1, dt * (inBarn ? 6 : 14)));
  camera.lookAt(camTarget);

  // Solens skuggor följer spelaren
  world.sun.position.set(P.x + 60, P.y + 90, P.z + 40);
  world.sun.target.position.set(P.x, P.y, P.z);

  // Ladudörrar i närheten
  nearBarn = null;
  if (farms) {
    let best = 4.2;
    for (const b of farms.barns) { const dd = Math.hypot(P.x - b.door.x, P.z - b.door.z); if (dd < best) { best = dd; nearBarn = b; } }
  }
  nearChest = null;
  { let best = 2.3; for (const c of chests) { if (c.open) continue; const dd = Math.hypot(P.x - c.x, P.z - c.z); if (dd < best && Math.abs(P.y - c.y) < 1.6) { best = dd; nearChest = c; } } }
  const now = performance.now() / 1000;
  updateChests(dt, now);
  if (animals) animals.update(dt, P, camera.position);

  // Hugga träd med yxan / gräva med spaden (håll E i några sekunder)
  let act = null;
  if (!nearChest && gearOn.has('yxa')) {
    let best = 2.1;
    for (const tr of world.trees.list) { if (!tr.alive) continue; const dd = Math.hypot(P.x - tr.x, P.z - tr.z); if (dd < best) { best = dd; act = { kind: 'tree', tr, time: 3 }; } }
  }
  let nearestDig = Infinity;
  if (!nearChest && !act && gearOn.has('spade')) {
    for (const d of digs) { if (d.dug) continue; const dd = Math.hypot(P.x - d.x, P.z - d.z); nearestDig = Math.min(nearestDig, dd); if (dd < 1.9 && !act) act = { kind: 'dig', d, time: 2 }; }
  }
  const actTarget = act && (act.tr || act.d);
  if (!holdAct || !act || (holdAct.tr || holdAct.d) !== actTarget) holdT = 0;
  holdAct = act;
  const holding = keys.KeyE || keys.Enter || keys.NumpadEnter || promptHeld;
  const working = act && holding && !timeUp;
  if (ch && ch.setWork) ch.setWork(working ? (act.kind === 'tree' ? 'hugga' : 'grava') : null);
  if (working) {
    holdT += dt;
    const tg = act.tr || act.d;
    P.heading = Math.atan2(tg.x - P.x, tg.z - P.z);                                              // vänd dig mot trädet/högen
    if (act.kind === 'tree') {
      const ph = (holdT * 1.6) % 1, hit = ph > 0.66 && ph < 0.9;                                   // skakar när yxan träffar
      world.trees.pose(act.tr, 0, 1, 0, hit ? Math.sin((ph - 0.66) * 60) * 0.045 * (0.9 - ph) / 0.24 : 0);
    }
    if (holdT >= act.time) {
      if (act.kind === 'tree') {
        act.tr.alive = false; act.tr.collider.active = false;
        const ax = P.z - act.tr.z, az = -(P.x - act.tr.x);                                           // faller bort från gubben
        falling.push({ tr: act.tr, ax, az, a: 0, t: 0 });
        giveCoins(10);
        toast('🪓 Timmer! +10 guldmynt');
      } else {
        act.d.dug = true; act.d.obj.visible = true;
      }
      holdT = 0; holdAct = null;
    }
  } else if (act && act.kind === 'tree' && holdT === 0) world.trees.pose(act.tr, 0, 1, 0);
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    f.t += dt;
    f.a = Math.min(Math.PI / 2 - 0.08, f.a + dt * (0.6 + f.t * 3.2));
    world.trees.pose(f.tr, -f.a, f.ax, f.az);
    if (f.t > 2.6) { world.trees.hide(f.tr); falling.splice(i, 1); }
  }
  // Varmt/kallt när man har spaden i handen
  const hint = $('hint');
  if (gearOn.has('spade') && digs.some(d => !d.dug)) {
    hint.textContent = nearestDig < 1.9 ? '🔥🔥 Gräv här!' : nearestDig < 8 ? '🔥 Varmt!' : nearestDig < 25 ? '🌤️ Ljummet' : nearestDig < 60 ? '❄️ Kallt' : '🧊 Iskallt';
    hint.classList.add('show');
  } else hint.classList.remove('show');

  const pr = $('prompt');
  pr.classList.toggle('hold', !!holdAct && !nearChest);
  if (nearChest) {
    pr.querySelector('span').textContent = 'öppna kistan';
    pr.querySelector('b').textContent = '💰'; pr.querySelector('i').textContent = 'Tryck';
    pr.classList.add('show');
  } else if (holdAct) {
    pr.querySelector('span').textContent = holdAct.kind === 'tree' ? 'hugga ner trädet' : 'gräva';
    pr.querySelector('b').textContent = holdAct.kind === 'tree' ? '🪓' : '🪏'; pr.querySelector('i').textContent = 'Håll';
    pr.querySelector('.bar u').style.width = Math.min(100, holdT / holdAct.time * 100) + '%';
    pr.classList.add('show');
  } else if (nearBarn) {
    pr.querySelector('span').textContent = nearBarn.open ? 'stänga dörren' : 'öppna dörren';
    pr.querySelector('b').textContent = '🚪'; pr.querySelector('i').textContent = 'Tryck';
    pr.classList.add('show');
  } else pr.classList.remove('show');

  // HUD
  drawMinimap(P.x, P.z, P.heading);
}

// Startplats: en av 30, gubben tittar in mot mitten av kartan
{
  const sp = world.spawns[Math.floor(Math.random() * world.spawns.length)];
  P.x = sp.x; P.z = sp.z; P.y = heightAt(sp.x, sp.z);
  if (Math.hypot(sp.x, sp.z) > 1) yaw = Math.atan2(sp.x, sp.z);
  P.heading = yaw + Math.PI;
}
camera.position.set(P.x - Math.sin(yaw) * -6, P.y + 4, P.z - Math.cos(yaw) * -6);
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  world.update(clock.elapsedTime);
  if (farms) farms.update(clock.elapsedTime, dt);
  renderer.render(scene, camera);
}
loop();

// För test: Jakt.teleport(x, z)
window.Jakt = { get animals() { return animals; }, P, chests, digs, openChest, world, get ch() { return ch; }, set timeLeft(v) { timeLeft = v; }, get timeLeft() { return timeLeft; }, step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { update(dt); if (farms) farms.update(0, dt); } }, get farms() { return farms; }, get cam() { return camera.position.toArray(); }, teleport(x, z) { P.x = x; P.z = z; P.y = groundAt(x, z); P.vy = 0; P.grounded = true; }, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; }, keys };
