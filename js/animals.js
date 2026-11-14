/* Djur i Guldmyntsjakten: bondgårdsdjur i hagar och vid gårdarna, vilda djur i skogen. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { heightAt, FARMS, TOWN, WATER, PLAY } from './world.js';

// Ungefärlig höjd i meter för varje djur
const HEIGHT = { Cow: 1.5, Bull: 1.6, Donkey: 1.35, Alpaca: 1.9, Horse: 1.8, Horse_White: 1.8, Husky: 0.8, ShibaInu: 0.65, Deer: 1.7, Stag: 2.2, Fox: 0.6, Wolf: 0.95 };
const WILD = { Deer: { flee: 9, run: 6.5 }, Stag: { flee: 10, run: 6.5 }, Fox: { flee: 7, run: 6 }, Wolf: { flee: 11, run: 7 } };   // alla vilda djur är skygga
const PEN_HW = 14.7, PEN_HD = 11.8;   // samma storlek som hagen i world.js

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

export async function spawnAnimals(scene, world) {
  const loader = new GLTFLoader();
  const kinds = [...new Set(Object.keys(HEIGHT))];
  const src = {};
  await Promise.all(kinds.map(async k => {
    const g = await loader.loadAsync(new URL(`../assets/animals/${k}.glb`, import.meta.url).href);
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.frustumCulled = false;
      // Samma sorts ljussättning som resten av världen (annars blir djuren för mörka)
      const conv = m => new THREE.MeshLambertMaterial({ color: m.color.clone().multiplyScalar(1.25), flatShading: true });
      o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    });
    const box = new THREE.Box3().setFromObject(g.scene, true);
    src[k] = { scene: g.scene, clips: g.animations, scale: HEIGHT[k] / Math.max(0.01, box.max.y - box.min.y) };
  }));

  const colliders = world.colliders;
  const blocked = (x, z, r) => {
    if (Math.abs(x) > PLAY - 4 || Math.abs(z) > PLAY - 4) return true;
    if (heightAt(x, z) < WATER + 0.3) return true;
    for (const c of colliders) {
      if (c.animal || c.active === false) continue;
      if (c.box) { if (Math.abs(x - c.x) < c.hw + r && Math.abs(z - c.z) < c.hd + r) return true; }
      else if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true;
    }
    return false;
  };
  // Områden: hage (rektangel) eller cirkel
  const randomIn = (a, R) => {
    for (let k = 0; k < 20; k++) {
      let x, z;
      if (a.rect) {
        const lx = (R() * 2 - 1) * (a.hw - 2.2), lz = (R() * 2 - 1) * (a.hd - 2.2), s = Math.sin(a.yaw), c = Math.cos(a.yaw);
        x = a.x + lx * c + lz * s; z = a.z - lx * s + lz * c;
      } else {
        const ang = R() * Math.PI * 2, d = Math.sqrt(R()) * a.r;
        x = a.x + Math.cos(ang) * d; z = a.z + Math.sin(ang) * d;
      }
      if (!blocked(x, z, 1.6)) return [x, z];
    }
    return null;
  };

  const R = rng(9001), animals = [];
  function add(kind, area) {
    const S = src[kind], p = randomIn(area, R);
    if (!S || !p) return;
    const obj = SkeletonUtils.clone(S.scene);
    obj.scale.setScalar(S.scale);
    obj.position.set(p[0], heightAt(p[0], p[1]), p[1]);
    scene.add(obj);
    const mixer = new THREE.AnimationMixer(obj), acts = {};
    for (const c of S.clips) acts[c.name] = mixer.clipAction(c);
    const radius = Math.max(0.3, HEIGHT[kind] * 0.32);
    const col = { x: p[0], z: p[1], r: radius, animal: true };
    colliders.push(col);
    const a = { kind, obj, mixer, acts, cur: null, area, x: p[0], z: p[1], heading: R() * 6.28, mode: 'idle', t: R() * 4,
      target: null, col, radius, len: HEIGHT[kind] * 0.62, wild: WILD[kind], speed: ['Husky', 'Fox', 'ShibaInu', 'Wolf'].includes(kind) ? 1.6 : 1.1 };
    play(a, R() < 0.5 ? 'Eating' : 'Idle');
    a.mixer.setTime(R() * 3);
    animals.push(a);
  }
  function play(a, name) {
    const next = a.acts[name];
    if (!next || a.cur === next) return;
    next.reset().play();
    if (a.cur) a.cur.crossFadeTo(next, 0.3, false);
    a.cur = next;
  }

  // Bondgårdsdjur: i hagarna och runt de stora ladorna
  const penSets = [['Cow', 'Cow', 'Bull'], ['Horse', 'Horse_White', 'Horse'], ['Cow', 'Donkey', 'Alpaca'], ['Horse_White', 'Alpaca', 'Cow']];
  const yardSets = [['Donkey', 'Alpaca', 'Husky'], ['Horse', 'Cow', 'ShibaInu']];
  let pi = 0, yi = 0;
  for (const f of FARMS) {
    if (f.kind === 'big') for (const k of yardSets[yi++ % yardSets.length]) add(k, { x: f.x, z: f.z, r: 13 });
    else for (const k of penSets[pi++ % penSets.length]) add(k, { rect: true, x: f.x, z: f.z, yaw: f.yaw, hw: PEN_HW, hd: PEN_HD });
  }
  // Husky i staden också
  add('ShibaInu', { x: TOWN.x, z: TOWN.streetsZ[0], r: 20 });
  add('Husky', { x: TOWN.x, z: TOWN.streetsZ[1], r: 20 });

  // Vilda djur: hjortar och rävar där det växer träd, långt från gårdar och stad
  const homes = [], trees = world.trees.list.slice();
  for (let k = 0; k < 600 && homes.length < 16; k++) {
    const t = trees[Math.floor(R() * trees.length)];
    if (!t) break;
    if (Math.abs(t.x) > PLAY - 24 || Math.abs(t.z) > PLAY - 24) continue;
    if (FARMS.some(f => Math.hypot(t.x - f.x, t.z - f.z) < 34)) continue;
    if (Math.abs(t.x - TOWN.x) < TOWN.hw + 12 && Math.abs(t.z - TOWN.z) < TOWN.hd + 12) continue;
    if (homes.some(h => Math.hypot(h.x - t.x, h.z - t.z) < 22)) continue;
    homes.push({ x: t.x + 3, z: t.z + 3, r: 16 });
  }
  const WILD_LIST = ['Deer', 'Stag', 'Fox', 'Deer', 'Wolf', 'Deer', 'Fox', 'Stag'];
  homes.forEach((h, i) => add(WILD_LIST[i % WILD_LIST.length], h));

  const tmp = new THREE.Vector3();
  return {
    animals,
    update(dt, P, camPos) {
      for (const a of animals) {
        const near = Math.hypot(a.x - camPos.x, a.z - camPos.z) < 90;
        a.t -= dt;
        // Vilda djur springer iväg när man kommer nära
        const dp = Math.hypot(P.x - a.x, P.z - a.z);
        if (a.wild && dp < a.wild.flee && a.mode !== 'flee') { a.mode = 'flee'; a.t = 2.5 + R(); }
        let speed = 0, dirX = 0, dirZ = 0;
        if (a.mode === 'flee') {
          dirX = a.x - P.x; dirZ = a.z - P.z; speed = a.wild.run;
          if (a.t <= 0) { a.mode = 'idle'; a.t = 1 + R() * 2; }
        } else if (a.mode === 'walk') {
          dirX = a.target[0] - a.x; dirZ = a.target[1] - a.z; speed = a.speed;
          if (Math.hypot(dirX, dirZ) < 0.6 || a.t <= 0) { a.mode = 'idle'; a.t = 2 + R() * 5; play(a, R() < 0.55 ? 'Eating' : 'Idle'); speed = 0; }
        } else if (a.t <= 0) {
          // Gå hem om ett vilt djur sprungit långt bort, annars en ny plats i området
          a.target = randomIn(a.area, R);
          if (a.target) { a.mode = 'walk'; a.t = 14; } else a.t = 2;
        }
        if (speed > 0) {
          const d = Math.hypot(dirX, dirZ) || 1;
          const want = Math.atan2(dirX / d, dirZ / d);
          let dh = want - a.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
          const oldHeading = a.heading;
          a.heading += dh * Math.min(1, dt * (a.mode === 'flee' ? 6 : 3));
          const nx = a.x + Math.sin(a.heading) * speed * dt, nz = a.z + Math.cos(a.heading) * speed * dt;
          // Känn efter vid nosen och baken också (djuren är långa)
          const fx = Math.sin(a.heading) * a.len, fz = Math.cos(a.heading) * a.len;
          if (blocked(nx, nz, a.radius) || blocked(nx + fx, nz + fz, a.radius * 0.6) || blocked(nx - fx * 0.8, nz - fz * 0.8, a.radius * 0.6)
              || Math.hypot(nx - P.x, nz - P.z) < a.radius + 0.5 || Math.hypot(nx + fx - P.x, nz + fz - P.z) < 0.6) {
            a.heading = oldHeading;                                  // vrid inte in nosen i väggen
            if (a.mode === 'flee') { a.heading += 0.8; if (blocked(a.x + Math.sin(a.heading) * a.len, a.z + Math.cos(a.heading) * a.len, a.radius * 0.6)) a.heading = oldHeading; }
            else { a.mode = 'idle'; a.t = 0.6 + R(); play(a, 'Idle'); }   // stanna, nästa mål väljs snart
          } else { a.x = nx; a.z = nz; }
          play(a, a.mode === 'flee' ? 'Gallop' : 'Walk');
        }
        a.obj.position.set(a.x, heightAt(a.x, a.z), a.z);
        a.obj.rotation.y = a.heading;
        a.col.x = a.x; a.col.z = a.z;
        a.obj.visible = near;
        if (near) a.mixer.update(dt);
      }
    }
  };
}
