/* =========================================================
   Guldmyntsjakten – spelet (tredjepersonsvy)
   ========================================================= */
import * as THREE from 'three';
import { createCharacter } from './avatar.js';
import { buildWorld, heightAt, HALF, PLAY, WATER, FARMS, loadFarms } from './world.js';

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
  for (const f of FARMS) {   // gårdar
    const fx = ((f.x + HALF) / (HALF * 2)) * s, fz = ((f.z + HALF) / (HALF * 2)) * s;
    mctx.fillStyle = '#c94a3c'; mctx.strokeStyle = '#ffffff'; mctx.lineWidth = 1.5;
    mctx.fillRect(fx - 4, fz - 4, 8, 8); mctx.strokeRect(fx - 4, fz - 4, 8, 8);
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
const GRAVITY = -22, JUMP = 8;
let ch = null;
createCharacter(look, player ? player.gender : 'kille').then(c => {
  ch = c;
  scene.add(c.root);
  $('loading').classList.add('hide');
  showHelp();
}).catch(e => {
  console.error(e);
  $('loading').innerHTML = '<div>😕 Kunde inte ladda gubben.<br>Ladda om sidan.</div>';
});

/* ---------- Kamera (TPP) ---------- */
let yaw = Math.PI, pitch = 0.32, dist = 6.5;
const camTarget = new THREE.Vector3();

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

/* ---------- Mus: klicka för att styra kameran (pointer lock), eller dra ---------- */
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('click', () => { if (!touch && document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); });
document.addEventListener('pointerlockchange', () => { $('lockHint').classList.toggle('hide', document.pointerLockElement === canvas); });
addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas) turn(e.movementX, e.movementY);
  else if (dragging) { turn(e.clientX - lastX, e.clientY - lastY); lastX = e.clientX; lastY = e.clientY; }
});
canvas.addEventListener('mousedown', e => { if (document.pointerLockElement !== canvas) { dragging = true; lastX = e.clientX; lastY = e.clientY; } });
addEventListener('mouseup', () => { dragging = false; });
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

function jump() {
  if (!ch || !P.grounded) return;
  P.vy = JUMP; P.grounded = false;
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

function update(dt) {
  // Riktning från tangentbord eller joystick (i förhållande till kameran)
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz += 1;
  if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  let mag = Math.min(1, Math.hypot(ix, iz));
  if (stick.id !== null) { ix = stick.x; iz = -stick.y; mag = Math.min(1, Math.hypot(ix, iz)); }
  const walking = keys.ShiftLeft || keys.ShiftRight || (stick.id !== null && mag < 0.55);

  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  move.set(0, 0, 0).addScaledVector(fwd, iz).addScaledVector(right, ix);
  const moving = mag > 0.08;
  const target = moving ? (walking ? WALK : RUN) : 0;
  P.speed += (target - P.speed) * Math.min(1, dt * 10);
  if (moving) {
    move.normalize();
    const want = Math.atan2(move.x, move.z);
    let d = want - P.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    P.heading += d * Math.min(1, dt * 12);
    let nx = P.x + move.x * P.speed * dt, nz = P.z + move.z * P.speed * dt;
    // Inte för brant uppför (berg runt kanten)
    const climb = heightAt(nx, nz) - heightAt(P.x, P.z);
    if (P.grounded && climb / Math.max(0.001, P.speed * dt) > 1.6) { nx = P.x; nz = P.z; }
    // Stenar, träd och kristaller
    for (const c of world.colliders) {
      if (c.box) {
        const px = nx - c.x, pz = nz - c.z, ox = c.hw + 0.35 - Math.abs(px), oz = c.hd + 0.35 - Math.abs(pz);
        if (ox > 0 && oz > 0) { if (ox < oz) nx += Math.sign(px || 1) * ox; else nz += Math.sign(pz || 1) * oz; }
        continue;
      }
      const dx = nx - c.x, dz = nz - c.z, rr = c.r + 0.35, dd = dx * dx + dz * dz;
      if (dd < rr * rr && dd > 0.0001) { const k = rr / Math.sqrt(dd); nx = c.x + dx * k; nz = c.z + dz * k; }
    }
    P.x = Math.max(-PLAY, Math.min(PLAY, nx));
    P.z = Math.max(-PLAY, Math.min(PLAY, nz));
  }

  // Hopp och mark
  const ground = heightAt(P.x, P.z);
  if (!P.grounded) {
    P.vy += GRAVITY * dt;
    P.y += P.vy * dt;
    if (P.y <= ground) { P.y = ground; P.vy = 0; P.grounded = true; if (ch) ch.play(moving ? 'run' : 'idle', 0.15); }
  } else {
    P.y += (ground - P.y) * Math.min(1, dt * 20);
  }

  // Animationer
  if (ch) {
    if (P.grounded) {
      if (moving && !wasMoving) ch.play('run', 0.15);
      if (!moving && wasMoving) ch.play('idle', 0.25);
    }
    ch.mixer.timeScale = moving && walking ? 0.55 : 1;
    wasMoving = moving;
    ch.root.position.set(P.x, P.y - (P.y < WATER ? 0 : 0), P.z);
    ch.root.rotation.y = P.heading;
    ch.update(dt);
  }

  // Kamera
  camTarget.set(P.x, P.y + 1.6, P.z);
  // Dra in kameran om den hamnar inne i en stor sten
  let d = dist;
  for (let tries = 0; tries < 10; tries++) {
    const tx = camTarget.x + Math.sin(yaw) * Math.cos(pitch) * d, tz = camTarget.z + Math.cos(yaw) * Math.cos(pitch) * d, ty = camTarget.y + Math.sin(pitch) * d;
    const hit = world.colliders.some(c => c.top && ty < c.top + 0.4 && (c.box
      ? Math.abs(tx - c.x) < c.hw + 0.5 && Math.abs(tz - c.z) < c.hd + 0.5
      : (tx - c.x) ** 2 + (tz - c.z) ** 2 < (c.r + 0.5) ** 2));
    if (!hit) break;
    d *= 0.82;
  }
  const cx = camTarget.x + Math.sin(yaw) * Math.cos(pitch) * d;
  const cz = camTarget.z + Math.cos(yaw) * Math.cos(pitch) * d;
  let cy = camTarget.y + Math.sin(pitch) * d;
  cy = Math.max(cy, heightAt(cx, cz) + 0.6);
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 14));
  camera.lookAt(camTarget);

  // Solens skuggor följer spelaren
  world.sun.position.set(P.x + 60, P.y + 90, P.z + 40);
  world.sun.target.position.set(P.x, P.y, P.z);

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
window.Jakt = { P, teleport(x, z) { P.x = x; P.z = z; P.y = heightAt(x, z); }, get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; }, keys };
