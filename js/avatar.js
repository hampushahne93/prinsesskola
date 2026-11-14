/* =========================================================
   Multiskolan – 3D-gubbe (Three.js)
   createStage(canvas) -> { setLook, focus, bounce, wave, dispose }
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const HEAD_R = 0.112;
const UNIT_SPHERE = new THREE.SphereGeometry(1, 24, 16);

/* ---------- Hjälpfunktioner ---------- */
function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function blob(parent, mat, sx, sy, sz, x = 0, y = 0, z = 0) {
  const m = add(parent, UNIT_SPHERE, mat, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function interp(pts, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i], [r1, y1] = pts[i + 1];
    if (y >= y0 && y <= y1) return r0 + (r1 - r0) * ((y - y0) / (y1 - y0 || 1));
  }
  return pts[pts.length - 1][0];
}
function lathe(pts, segs = 48) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

/* Huvudform: smalare käke, lite längre än bred */
function deformPoint(v, R) {
  const t = Math.max(0, -v.y / R);
  const k = 1 - 0.32 * t * t;
  v.x *= 0.93 * k;
  v.z *= v.z > 0 ? (1 - 0.12 * t * t) : 1.04 * k;
  v.y *= 1.1;
  return v;
}
function headGeo(R, w = 64, h = 48) {
  const g = new THREE.SphereGeometry(R, w, h);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    deformPoint(v, R);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
/* Hårlinje: framme (front) och bak (back) i y-led, linjärt däremellan */
function hairOk(y, z, R, front, back) {
  const f = Math.sqrt(Math.min(1, Math.max(0, (1 - z / R) / 2)));   // tinningarna täcks tidigare
  return y > front + (back - front) * f;
}
function hairShell(scale, front, back, mat) {
  // Byggs rad för rad ner till hårlinjen, så kanten blir mjuk (inga trappsteg)
  const R = HEAD_R * scale, W = 112, Hn = 44;
  const pos = [], idx = [], v = new THREE.Vector3();
  const pt = (th, ph) => {
    v.set(R * Math.sin(th) * Math.sin(ph), R * Math.cos(th), R * Math.sin(th) * Math.cos(ph));
    return deformPoint(v, R);
  };
  for (let i = 0; i <= W; i++) {
    const ph = Math.PI + (i / W) * Math.PI * 2;      // sömmen hamnar i nacken
    let lo = 0, hi = Math.PI;
    for (let k = 0; k < 28; k++) {
      const mid = (lo + hi) / 2, p = pt(mid, ph);
      if (hairOk(p.y, p.z, R, front, back)) lo = mid; else hi = mid;
    }
    for (let j = 0; j <= Hn; j++) {
      const p = pt(lo * j / Hn, ph);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < W; i++) for (let j = 0; j < Hn; j++) {
    const a = i * (Hn + 1) + j, b = (i + 1) * (Hn + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}
function drape(parent, mat, rTop, rBot, h, yTop, gap) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, 48, 6, true, gap, Math.PI * 2 - gap * 2);
  const m = add(parent, g, mat, 0, yTop - h / 2, -0.012);
  m.scale.z = 0.97;
  return m;
}
function chain(parent, mat, pts, r0, r1) {
  // Avsmalnande "rör" längs en kurva (hästsvans, tofsar)
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const TS = 40, RS = 16;
  const g = new THREE.TubeGeometry(curve, TS, 1, RS, false);
  const pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= TS; i++) {
    const t = i / TS;
    curve.getPointAt(t, c);
    const r = (r0 + (r1 - r0) * t) * (1 - 0.25 * Math.pow(t, 6)) * (0.85 + 0.15 * Math.sin(Math.min(1, t * 4) * Math.PI / 2));
    for (let j = 0; j <= RS; j++) {
      const k = i * (RS + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).normalize().multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  add(parent, g, mat);
  const end = curve.getPointAt(1);
  blob(parent, mat, r1 * 0.75, r1 * 0.75, r1 * 0.75, end.x, end.y, end.z);
  const st = curve.getPointAt(0);
  blob(parent, mat, r0, r0, r0, st.x, st.y, st.z);
  return curve;
}
function band(parent, color, x, y, z, r = 0.03) {
  const m = add(parent, new THREE.TorusGeometry(r, 0.008, 8, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 }), x, y, z);
  return m;
}

/* ---------- Frisyrer ---------- */
function buildHair(head, style, mat, accent) {
  const R = HEAD_R;
  switch (style) {
    case 'snaggad':
      head.add(hairShell(1.02, 0.058, -0.075, mat));
      break;
    case 'lang':
      head.add(hairShell(1.07, 0.056, -0.04, mat));
      drape(head, mat, 0.106, 0.15, 0.42, 0.03, 0.95);
      break;
    case 'page':
      head.add(hairShell(1.07, 0.046, -0.05, mat));
      drape(head, mat, 0.106, 0.122, 0.15, 0.03, 0.95);
      break;
    case 'hastsvans': {
      head.add(hairShell(1.04, 0.058, -0.03, mat));
      chain(head, mat, [[0, 0.06, -0.112], [0, 0.03, -0.165], [0, -0.07, -0.19], [0, -0.19, -0.165], [0, -0.28, -0.135]], 0.042, 0.016);
      const b = band(head, accent, 0, 0.06, -0.118, 0.026);
      b.rotation.x = 0.4;
      break;
    }
    case 'tofsar':
      head.add(hairShell(1.04, 0.056, -0.03, mat));
      for (const s of [-1, 1]) {
        chain(head, mat, [[s * 0.098, 0.035, -0.045], [s * 0.15, 0.0, -0.05], [s * 0.165, -0.1, -0.04], [s * 0.15, -0.2, -0.03]], 0.036, 0.016);
        const b = band(head, accent, s * 0.104, 0.034, -0.046, 0.022);
        b.rotation.y = Math.PI / 2;
      }
      break;
    case 'knut':
      head.add(hairShell(1.04, 0.058, -0.035, mat));
      blob(head, mat, 0.056, 0.05, 0.056, 0, 0.125, -0.06);
      band(head, accent, 0, 0.1, -0.055, 0.04).rotation.x = Math.PI / 2 - 0.5;
      break;
    case 'lockigt': {
      head.add(hairShell(1.05, 0.062, -0.06, mat));
      const Rs = R * 1.08, v = new THREE.Vector3();
      for (let lat = 0; lat < 9; lat++) {
        const th = 0.12 + lat * 0.2;
        const count = Math.max(4, Math.round(Math.sin(th) * 22));
        for (let i = 0; i < count; i++) {
          const ph = (i / count) * Math.PI * 2 + lat * 0.37;
          v.set(Rs * Math.sin(th) * Math.sin(ph), Rs * Math.cos(th), Rs * Math.sin(th) * Math.cos(ph));
          deformPoint(v, Rs);
          if (!hairOk(v.y, v.z, Rs, 0.068, -0.055)) continue;
          const r = 0.024 + ((lat * 7 + i * 13) % 5) * 0.002;
          blob(head, mat, r, r, r, v.x, v.y, v.z);
        }
      }
      break;
    }
    case 'kort':
    default:
      head.add(hairShell(1.06, 0.06, -0.07, mat));
      for (const x of [-0.045, -0.012, 0.022]) {
        const t = blob(head, mat, 0.034, 0.016, 0.026, x, 0.076, 0.098);
        t.rotation.z = -0.35;
      }
      break;
  }
}

/* ---------- Bygg hela gubben ---------- */
function buildAvatar(look, gender) {
  const girl = gender === 'tjej';
  const P = girl
    ? { hip: 0.158, waist: 0.122, chest: 0.148, shoulder: 0.152, depth: 0.68, sx: 0.172, armR: 0.044, foreR: 0.037, thighR: 0.084, shinR: 0.058, legX: 0.088 }
    : { hip: 0.15, waist: 0.138, chest: 0.168, shoulder: 0.176, depth: 0.7, sx: 0.198, armR: 0.05, foreR: 0.042, thighR: 0.088, shinR: 0.062, legX: 0.093 };

  /* Material */
  const col = c => new THREE.Color(c);
  const skin = new THREE.MeshPhysicalMaterial({ color: look.skin, roughness: 0.55, sheen: 0.5, sheenRoughness: 0.6, sheenColor: col('#ffb6a3') });
  const fabric = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85, sheen: 1, sheenRoughness: 0.7, sheenColor: col(c).lerp(col('#ffffff'), 0.45), side: THREE.DoubleSide });
  const hairMat = new THREE.MeshPhysicalMaterial({ color: look.hairColor, roughness: 0.45, sheen: 1, sheenRoughness: 0.35, sheenColor: col(look.hairColor).lerp(col('#ffffff'), 0.4), side: THREE.DoubleSide });
  const dress = look.top === 'klanning';
  const topMat = fabric(look.topColor);
  const botMat = dress ? topMat : fabric(look.bottomColor);
  const shoeMat = new THREE.MeshStandardMaterial({ color: look.shoes, roughness: 0.4 });
  const soleMat = new THREE.MeshStandardMaterial({ color: '#f4f4f8', roughness: 0.6 });
  const lipMat = new THREE.MeshStandardMaterial({ color: col(look.skin).lerp(col('#c2475a'), 0.45), roughness: 0.4 });
  const browMat = new THREE.MeshStandardMaterial({ color: col(look.hairColor).lerp(col('#1a1010'), 0.35), roughness: 0.8 });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  /* Bål */
  const lowerPts = [[0.001, 0.79], [P.hip * 0.8, 0.8], [P.hip * 0.97, 0.835], [P.hip, 0.88], [(P.hip + P.waist) / 2, 0.96], [P.waist, 1.03], [P.waist, 1.08]];
  const off = 0.006;
  const upperPts = [
    [interp(lowerPts, 0.925) + off, 0.925], [interp(lowerPts, 0.96) + off, 0.96], [P.waist + off, 1.03],
    [(P.waist + P.chest) / 2 + off, 1.12], [P.chest + off, 1.21], [P.chest * 0.99 + off, 1.27],
    [P.shoulder, 1.32], [P.shoulder * 0.84, 1.365], [0.085, 1.395], [0.058, 1.415], [0.001, 1.42]
  ];
  const lower = add(body, lathe(lowerPts), botMat);
  lower.scale.z = P.depth;
  const upper = add(body, lathe(upperPts), topMat);
  upper.scale.z = P.depth;
  const frontZ = y => interp(upperPts, y) * P.depth;

  /* Kläddetaljer */
  if (look.top !== 'hoodie') {
    const collar = add(body, new THREE.TorusGeometry(0.056, 0.009, 10, 40), fabric(col(look.topColor).multiplyScalar(0.8)), 0, 1.402, 0);
    collar.rotation.x = Math.PI / 2;
    collar.scale.y = 0.8;
  } else {
    const hg = new THREE.TorusGeometry(0.085, 0.034, 14, 40, Math.PI * 1.2);
    hg.rotateZ(Math.PI * 0.9);
    hg.rotateX(Math.PI / 2);
    const hood = add(body, hg, topMat, 0, 1.405, -0.01);
    hood.scale.set(1, 1.2, 0.85);
    const strMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
    for (const s of [-1, 1]) add(body, new THREE.CylinderGeometry(0.004, 0.004, 0.11, 8), strMat, s * 0.028, 1.32, frontZ(1.32) + 0.004);
    const pocket = add(body, new THREE.BoxGeometry(0.17, 0.075, 0.012), fabric(col(look.topColor).multiplyScalar(0.85)), 0, 1.0, frontZ(1.0) + 0.002);
    pocket.rotation.x = -0.05;
  }
  if (look.bottom === 'kjol' && !dress) {
    const sk = add(body, new THREE.CylinderGeometry(interp(lowerPts, 1.0) + 0.01, P.hip * 1.6, 0.34, 48, 4, true), botMat, 0, 0.83, 0);
    sk.scale.z = 0.8;
  }
  if (dress) {
    const sk = add(body, new THREE.CylinderGeometry(interp(lowerPts, 1.03) + off + 0.002, P.hip * 1.75, 0.46, 48, 4, true), topMat, 0, 0.8, 0);
    sk.scale.z = 0.8;
  }
  if (look.bottom !== 'kjol' && !dress) {
    const belt = add(body, new THREE.TorusGeometry(interp(lowerPts, 0.95) + 0.004, 0.008, 8, 48), new THREE.MeshStandardMaterial({ color: '#2a2135', roughness: 0.5 }), 0, 0.95, 0);
    belt.rotation.x = Math.PI / 2;
    belt.scale.y = P.depth;
  }

  /* Hals + huvud */
  const neckPivot = new THREE.Group();
  neckPivot.position.y = 1.4;
  body.add(neckPivot);
  add(neckPivot, new THREE.CylinderGeometry(0.05, 0.058, 0.12, 24), skin, 0, 0.05, -0.004);
  const head = new THREE.Group();
  head.position.set(0, 0.158, 0.006);
  head.scale.setScalar(1.12);
  neckPivot.add(head);
  add(head, headGeo(HEAD_R), skin);

  // Öron
  for (const s of [-1, 1]) blob(head, skin, 0.013, 0.028, 0.021, s * 0.104, -0.004, -0.006);

  // Ögon
  const eyeWhite = new THREE.MeshStandardMaterial({ color: '#fbfbff', roughness: 0.15 });
  const irisMat = new THREE.MeshStandardMaterial({ color: look.eyes, roughness: 0.25 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: '#0b0b12', roughness: 0.1 });
  const shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * 0.038, 0.012, 0.088);
    head.add(e);
    blob(e, eyeWhite, 0.021, 0.019, 0.016);
    blob(e, irisMat, 0.0115, 0.0115, 0.004, 0, 0, 0.0145);
    blob(e, pupilMat, 0.0055, 0.0055, 0.002, 0, 0, 0.0178);
    blob(e, shineMat, 0.0022, 0.0022, 0.001, 0.004, 0.004, 0.0188);
    // Övre ögonlock (hudfärgad kant)
    const lid = add(e, new THREE.TorusGeometry(0.019, 0.004, 8, 24, Math.PI), skin, 0, 0.002, 0.008);
    lid.scale.set(1.05, 0.75, 1);
    if (girl) {
      const lash = add(e, new THREE.TorusGeometry(0.02, 0.0025, 6, 20, Math.PI * 0.75), pupilMat, 0, 0.003, 0.011);
      lash.rotation.z = Math.PI * 0.125;
      lash.scale.set(1.05, 0.8, 1);
    }
    eyes.push(e);
    // Ögonbryn
    const brow = add(head, new THREE.TorusGeometry(0.022, girl ? 0.003 : 0.0042, 8, 20, Math.PI * 0.55), browMat, s * 0.039, 0.036, 0.101);
    brow.rotation.z = Math.PI / 2 - Math.PI * 0.275 + s * 0.06;
    brow.scale.y = 0.5;
  }

  // Näsa
  const bridge = blob(head, skin, 0.008, 0.022, 0.01, 0, -0.01, 0.104);
  bridge.rotation.x = -0.3;
  blob(head, skin, 0.0095, 0.008, 0.0085, 0, -0.029, 0.111);
  for (const s of [-1, 1]) blob(head, skin, 0.006, 0.005, 0.006, s * 0.0085, -0.031, 0.106);

  // Mun (leende)
  const mouth = add(head, new THREE.TorusGeometry(0.021, 0.0055, 10, 24, Math.PI * 0.7), lipMat, 0, -0.054, 0.097);
  mouth.rotation.z = -Math.PI / 2 - Math.PI * 0.35;
  mouth.scale.set(1, 0.55, 0.8);

  // Kinder
  const blush = new THREE.MeshStandardMaterial({ color: '#ff7f9a', roughness: 0.6, transparent: true, opacity: 0.22, depthWrite: false });
  for (const s of [-1, 1]) blob(head, blush, 0.02, 0.012, 0.006, s * 0.058, -0.028, 0.094);

  // Hår
  const accent = look.topColor;
  buildHair(head, look.hair, hairMat, accent);

  /* Armar */
  const sleeves = { tshirt: 'kort', klanning: 'kort', langarm: 'lang', hoodie: 'lang', linne: 'ingen' }[look.top] || 'kort';
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * P.sx, 1.33, -0.004);
    body.add(pivot);
    const longS = sleeves === 'lang';
    add(pivot, UNIT_SPHERE, sleeves === 'ingen' ? skin : topMat).scale.setScalar(P.armR * (longS ? 1.2 : 1.25));
    add(pivot, new THREE.CylinderGeometry(P.armR * (longS ? 1.15 : 1), P.armR * (longS ? 1.0 : 0.86), 0.28, 20), longS ? topMat : skin, 0, -0.14, 0);
    if (sleeves === 'kort') add(pivot, new THREE.CylinderGeometry(P.armR * 1.3, P.armR * 1.2, 0.13, 20, 1, true), topMat, 0, -0.06, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.28;
    pivot.add(elbow);
    add(elbow, UNIT_SPHERE, longS ? topMat : skin).scale.setScalar(P.armR * (longS ? 1.02 : 0.88));
    add(elbow, new THREE.CylinderGeometry(P.foreR * (longS ? 1.25 : 1.1), P.foreR * (longS ? 1.05 : 0.78), 0.24, 20), longS ? topMat : skin, 0, -0.12, 0);
    if (longS) add(elbow, new THREE.CylinderGeometry(P.foreR * 1.12, P.foreR * 1.12, 0.03, 20), fabric(col(look.topColor).multiplyScalar(0.85)), 0, -0.225, 0);
    // Hand
    const hand = new THREE.Group();
    hand.position.y = -0.245;
    elbow.add(hand);
    blob(hand, skin, 0.02, 0.055, 0.036, 0, -0.045, 0.002);
    const thumb = blob(hand, skin, 0.009, 0.024, 0.009, -s * 0.004, -0.028, 0.03);
    thumb.rotation.x = 0.5;
    arms.push({ pivot, elbow, s });
  }

  /* Ben */
  const pants = !dress && look.bottom === 'byxor';
  const shorts = !dress && look.bottom === 'shorts';
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * P.legX, 0.86, 0);
    leg.rotation.z = s * 0.025;
    body.add(leg);
    const thighMat = (pants || shorts) ? botMat : skin;
    add(leg, UNIT_SPHERE, thighMat).scale.setScalar(P.thighR * (pants || shorts ? 1.06 : 1));
    add(leg, new THREE.CylinderGeometry(P.thighR * (pants || shorts ? 1.1 : 1), P.thighR * (pants ? 0.82 : 0.72), 0.4, 20), thighMat, 0, -0.2, 0);
    if (shorts) add(leg, new THREE.CylinderGeometry(P.thighR * 1.14, P.thighR * 1.0, 0.2, 20, 1, true), botMat, 0, -0.1, 0);
    add(leg, UNIT_SPHERE, pants ? botMat : skin, 0, -0.4, 0).scale.setScalar(P.shinR * (pants ? 1.2 : 1.05));
    add(leg, new THREE.CylinderGeometry(P.shinR * (pants ? 1.18 : 1.02), P.shinR * (pants ? 1.08 : 0.62), 0.38, 20), pants ? botMat : skin, 0, -0.59, 0);
    // Sko
    const foot = new THREE.Group();
    foot.position.y = -0.78;
    leg.add(foot);
    add(foot, new THREE.CylinderGeometry(0.043, 0.048, 0.06, 20), shoeMat, 0, -0.012, 0);
    blob(foot, shoeMat, 0.048, 0.044, 0.112, 0, -0.04, 0.036);
    blob(foot, soleMat, 0.051, 0.013, 0.117, 0, -0.068, 0.036);
    const lace = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
    for (let i = 0; i < 3; i++) add(foot, new THREE.BoxGeometry(0.03, 0.004, 0.006), lace, 0, -0.012 - i * 0.008, 0.05 + i * 0.022).rotation.x = -0.5;
  }

  return { root, body, upper, upperDepth: P.depth, neckPivot, head, eyes, arms };
}

function disposeTree(obj) {
  obj.traverse(o => {
    if (o.isMesh) {
      if (o.geometry !== UNIT_SPHERE) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    }
  });
}

/* ---------- Scen med podium, ljus och kamera ---------- */
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  camera.position.set(0, 1.3, 4.4);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.95, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.9;
  controls.maxDistance = 5.5;
  controls.minPolarAngle = Math.PI * 0.28;
  controls.maxPolarAngle = Math.PI * 0.6;
  controls.rotateSpeed = 0.7;

  // Ljus
  scene.add(new THREE.HemisphereLight(0xe6ecff, 0x2a1f6b, 0.7));
  const key = new THREE.DirectionalLight(0xfff4ea, 2.4);
  key.position.set(1.8, 3.8, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2.2, bottom: -0.3, near: 0.5, far: 10 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9d6ff, 0.6);
  fill.position.set(-2.5, 2, 2.5);
  scene.add(fill);
  const rimPink = new THREE.DirectionalLight(0xff5ccf, 1.6);
  rimPink.position.set(-3, 2.5, -2.5);
  scene.add(rimPink);
  const rimCyan = new THREE.DirectionalLight(0x3ee8ff, 1.6);
  rimCyan.position.set(3, 2.5, -2.5);
  scene.add(rimCyan);

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
  // Glöd på golvet
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

  // Gnistor som stiger upp runt podiet
  const N = 70, pos = new Float32Array(N * 3), speeds = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.55 + Math.random() * 0.3;
    pos.set([Math.cos(a) * r, Math.random() * 1.9, Math.sin(a) * r], i * 3);
    speeds.push(0.08 + Math.random() * 0.15);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xbff8ff, size: 0.022, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(sparks);

  // Gubben
  let av = null;
  const holder = new THREE.Group();
  scene.add(holder);

  // Kamerafokus
  const FOCUS = {
    body: { t: [0, 0.95, 0], d: 4.4 },
    head: { t: [0, 1.58, 0], d: 1.35 },
    eyes: { t: [0, 1.59, 0], d: 0.95 },
    top: { t: [0, 1.15, 0], d: 2.5 },
    bottom: { t: [0, 0.6, 0], d: 2.7 },
    shoes: { t: [0, 0.18, 0], d: 1.9 }
  };
  const desiredTarget = new THREE.Vector3(0, 0.95, 0);
  let desiredDist = 4.4, tween = 0;

  // Animationstillstånd
  let look = { x: 0, y: 0 }, lookNow = { x: 0, y: 0 };
  let bounceT = 0, waveT = 0, nextBlink = 2, blinkT = -1;
  const onMove = e => {
    const r = canvas.getBoundingClientRect();
    look.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    look.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.35) * 2));
  };
  window.addEventListener('pointermove', onMove);

  // Storlek
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

  function animate() {
    if (!alive) return;
    raf = requestAnimationFrame(animate);
    if (canvas.offsetParent === null) return;   // dold: rita inte
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

    // Kameraövergång
    if (tween > 0) {
      tween -= dt;
      const k = 1 - Math.pow(0.004, dt);
      controls.target.lerp(desiredTarget, k);
      tmp.subVectors(camera.position, controls.target);
      const len = tmp.length() + (desiredDist - tmp.length()) * k;
      camera.position.copy(controls.target).add(tmp.setLength(len));
    }
    controls.update();

    // Gnistor
    const pa = pGeo.attributes.position;
    for (let i = 0; i < N; i++) {
      let y = pa.getY(i) + speeds[i] * dt;
      if (y > 1.9) y = 0;
      pa.setY(i, y);
    }
    pa.needsUpdate = true;
    ring.material.color.setHSL(0.52 + Math.sin(t * 0.8) * 0.03, 1, 0.62);

    if (av) {
      const breath = Math.sin(t * 1.7);
      av.upper.scale.set(1 + 0.007 * breath, 1, av.upperDepth * (1 + 0.012 * breath));
      av.body.rotation.z = Math.sin(t * 0.7) * 0.012;
      av.body.position.x = Math.sin(t * 0.7) * 0.008;

      // Huvudet följer pekaren
      lookNow.x += (look.x - lookNow.x) * 0.06;
      lookNow.y += (look.y - lookNow.y) * 0.06;
      av.neckPivot.rotation.y = lookNow.x * 0.45 + Math.sin(t * 0.5) * 0.05;
      av.neckPivot.rotation.x = lookNow.y * 0.2;
      av.neckPivot.rotation.z = Math.sin(t * 0.6) * 0.02;

      // Armar
      for (const a of av.arms) {
        let rz = a.s * (0.11 + 0.012 * breath), rx = Math.sin(t * 0.7 + a.s) * 0.04, ez = 0, ex = -0.18;
        if (waveT > 0 && a.s === 1) {
          rz = 2.55; rx = 0.1; ex = -0.1;
          ez = Math.sin(t * 11) * 0.45 + 0.3;
        }
        a.pivot.rotation.z += (rz - a.pivot.rotation.z) * 0.15;
        a.pivot.rotation.x += (rx - a.pivot.rotation.x) * 0.15;
        a.elbow.rotation.z += (ez - a.elbow.rotation.z) * 0.2;
        a.elbow.rotation.x += (ex - a.elbow.rotation.x) * 0.15;
      }
      if (waveT > 0) waveT -= dt;

      // Blinka
      if (t > nextBlink && blinkT < 0) blinkT = 0;
      if (blinkT >= 0) {
        blinkT += dt;
        const k = Math.sin(Math.min(1, blinkT / 0.16) * Math.PI);
        av.eyes.forEach(e => e.scale.y = 1 - k * 0.9);
        if (blinkT > 0.16) { blinkT = -1; nextBlink = t + 2 + Math.random() * 3; av.eyes.forEach(e => e.scale.y = 1); }
      }

      // Studs
      if (bounceT > 0) {
        bounceT -= dt;
        const p = 1 - Math.max(0, bounceT) / 0.45;
        av.root.position.y = Math.sin(p * Math.PI) * 0.06;
        av.root.scale.set(1 + Math.sin(p * Math.PI * 2) * 0.02, 1 - Math.sin(p * Math.PI * 2) * 0.02, 1);
      } else {
        av.root.position.y = 0;
        av.root.scale.set(1, 1, 1);
      }
    }
    renderer.render(scene, camera);
  }
  animate();

  return {
    setLook(lookData, gender) {
      if (av) { holder.remove(av.root); disposeTree(av.root); }
      av = buildAvatar(lookData, gender);
      holder.add(av.root);
    },
    focus(name) {
      const f = FOCUS[name] || FOCUS.body;
      desiredTarget.set(...f.t);
      desiredDist = f.d;
      tween = 1.4;
    },
    bounce() { bounceT = 0.45; },
    wave(sec = 2) { waveT = sec; },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      if (av) disposeTree(av.root);
      controls.dispose();
      renderer.dispose();
    }
  };
}
