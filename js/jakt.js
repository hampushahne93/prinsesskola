/* =========================================================
   Guldmyntsjakten – spelet (tredjepersonsvy)
   ========================================================= */
import * as THREE from 'three';
import { createCharacter } from './avatar.js';
import { buildWorld, heightAt, rockHeightAt, HALF, PLAY, WATER, FARMS, loadFarms } from './world.js';

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
loadFarms(scene, world.colliders).then(f => { farms = f; }).catch(e => console.error('Gårdar', e));

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
  for (const f of FARMS) {   // gårdar och stora lador
    const fx = ((f.x + HALF) / (HALF * 2)) * s, fz = ((f.z + HALF) / (HALF * 2)) * s, r = f.kind === 'big' ? 6 : 4;
    mctx.fillStyle = f.kind === 'big' ? '#8a1f2a' : '#c94a3c'; mctx.strokeStyle = '#ffffff'; mctx.lineWidth = 1.5;
    mctx.fillRect(fx - r, fz - r, r * 2, r * 2); mctx.strokeRect(fx - r, fz - r, r * 2, r * 2);
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
  { id: 'inlines', key: '4', name: 'Inlines', icon: '🛼', tip: 'Spring dubbelt så snabbt' }
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
  if (!owns(id)) { toast(`🔒 ${g.name} låser du upp under Ändra gubbe → Prylar (1000 🪙)`); return; }
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
function groundAt(x, z) { const b = barnAt(x, z); return b ? b.floorY : Math.max(heightAt(x, z), rockHeightAt(x, z)); }
let nearBarn = null;
function useDoor() { if (nearBarn) nearBarn.toggle(); }
addEventListener('keydown', e => { if (e.code === 'KeyE' || e.code === 'Enter') useDoor(); });
$('prompt').addEventListener('click', useDoor);
$('prompt').addEventListener('touchstart', e => { e.preventDefault(); useDoor(); }, { passive: false });

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
  const pr = $('prompt');
  if (nearBarn) {
    pr.querySelector('span').textContent = nearBarn.open ? 'stänga dörren' : 'öppna dörren';
    pr.classList.add('show');
  } else pr.classList.remove('show');

  // HUD
  drawMinimap(P.x, P.z, P.heading);
}

camera.position.set(0, heightAt(0, 0) + 4, 7);
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
window.Jakt = { P, set timeLeft(v) { timeLeft = v; }, get timeLeft() { return timeLeft; }, step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { update(dt); if (farms) farms.update(0, dt); } }, get farms() { return farms; }, get cam() { return camera.position.toArray(); }, teleport(x, z) { P.x = x; P.z = z; P.y = groundAt(x, z); P.vy = 0; P.grounded = true; }, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; }, keys };
