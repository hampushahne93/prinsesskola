/* =========================================================
   Multiskolan – målar gubbens textur (1024 x 1024)
   Kartan följer modellens UV-layout:
     Huvud      x 0–640,   y 0–490   (ansiktet i mitten, x≈322)
     Tröja      x 160–483, y 490–1024 (rygg upptill, halshål y≈745, framsida nedtill)
     Ärmar      x 0–640,   y 645–830 (handleder ytterst)
     Skor       x 639–824, y 134–524  (sulor: y 0–134)
     Händer     x 824–1024, y 134–764
     Byxor      x 611–1024, y 764–1024 (framsida x 611–818, baksida x 826–1024)
   ========================================================= */

export const SIZE = 1024;

/* ---------- Exklusiva saker (glöd) – blir vanliga saker + glöd ---------- */
export const EXCLUSIVE = {
  hair: {
    guldhar: { hair: 'langlockar', hairColor: '#ffcf3a', glow: 'guld' },
    rosahar: { hair: 'langlockar', hairColor: '#ff5ccf', glow: 'rosa' }
  },
  top: {
    guldtroja: { top: 'tshirt', topColor: '#ffcf3a', pattern: 'stjarnor', topColor2: '#fff3b0', print: 'stjarna', printColor: '#ffffff', glow: 'guld' },
    rosatroja: { top: 'hoodie', topColor: '#ff5ccf', pattern: 'hjartan', topColor2: '#ffd1f0', print: 'ingen', glow: 'rosa' }
  },
  bottom: {
    guldbyxor: { bottom: 'byxor', bottomColor: '#ffcf3a', glow: 'guld' },
    rosakjol: { bottom: 'tutu', bottomColor: '#ff5ccf', glow: 'rosa' }
  },
  shoeStyle: {
    guldskor: { shoeStyle: 'glitter', shoes: '#ffcf3a', glow: 'guld' },
    rosaskor: { shoeStyle: 'glitter', shoes: '#ff5ccf', glow: 'rosa' }
  },
  hat: {
    guldkrona: { hat: 'krona', glow: 'guld' },
    rosatiara: { hat: 'tiara', hatColor: '#ff5ccf', glow: 'rosa' }
  }
};
export function resolveLook(look) {
  const r = { ...look };
  for (const [k, map] of Object.entries(EXCLUSIVE)) {
    const e = map[look[k]];
    if (e) Object.assign(r, e);
  }
  return r;
}

/* ---------- Färghjälp ---------- */
function hex2rgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function shade(c, k) {            // k < 0 mörkare, k > 0 ljusare
  const [r, g, b] = hex2rgb(c);
  return k < 0 ? rgb2hex([r * (1 + k), g * (1 + k), b * (1 + k)])
               : rgb2hex([r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k]);
}
export function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(A.map((v, i) => v + (B[i] - v) * t));
}
const lum = c => { const [r, g, b] = hex2rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export const contrast = c => lum(c) > 0.6 ? '#2a2f45' : '#ffffff';

/* ---------- Ritverktyg ---------- */
function ellipse(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
}
function poly(ctx, pts, fill) {
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function line(ctx, pts, col, w) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
}
function star(ctx, x, y, r, fill, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / points, rr = i % 2 ? r * inner : r;
    i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function heart(ctx, x, y, s, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.fillStyle = fill; ctx.fill();
}
function flower(ctx, x, y, r, petal, center = '#ffd84a') {
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ellipse(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.75, petal); }
  ellipse(ctx, x, y, r * 0.6, r * 0.6, center);
}
// enkel pseudoslump så att mönster ser likadana ut varje gång
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

/* =========================================================
   HÅR (målat på huvudet)
   F = lugg/hårfäste mitt, S = polisonger, N = nacke
   ========================================================= */
const HAIR = {
  kort:       { F: 150, S: 228, N: 300, ears: true },
  snaggad:    { F: 142, S: 215, N: 290, ears: true, buzz: true },
  lang:       { F: 146, S: 330, N: 476, ears: false },
  page:       { F: 186, S: 290, N: 430, ears: false, bangs: true },
  hastsvans:  { F: 150, S: 232, N: 300, ears: true },
  tofsar:     { F: 152, S: 232, N: 300, ears: true },
  knut:       { F: 148, S: 228, N: 292, ears: true },
  lockigt:    { F: 146, S: 240, N: 320, ears: true, curls: true },
  lugg:       { F: 150, S: 232, N: 305, ears: true, swoop: true },
  flint:      { none: true, ears: true },
  mohikan:    { F: 142, S: 210, N: 285, ears: true, buzz: true, stripe: true },
  afro:       { F: 140, S: 250, N: 330, ears: true, curls: true },
  flata:      { F: 150, S: 232, N: 300, ears: true },
  dubbelknut: { F: 150, S: 230, N: 300, ears: true },
  spikigt:    { F: 146, S: 225, N: 300, ears: true, spikes: true },
  langlockar: { F: 146, S: 330, N: 476, ears: false, curls: true }
};

function paintHair(ctx, look) {
  const h = HAIR[look.hair] || HAIR.kort;
  if (h.none) return h;
  const col = h.buzz ? mix(look.hairColor, look.skin, 0.3) : look.hairColor;
  const { F, S, N } = h;
  const side = (s) => { const x = v => 322 + s * v; return [x(322), N, x(150), 240, x(84), S, x(80), F + 30]; };
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(640, 0);
  const R = side(1), L = side(-1);
  ctx.lineTo(R[0], R[1]);
  ctx.quadraticCurveTo(560, N - 20, R[2], R[3]);
  ctx.quadraticCurveTo(R[4] + 30, R[3] - 10, R[4], R[5]);
  ctx.lineTo(R[6], R[7]);
  ctx.quadraticCurveTo(322, F - 18, L[6], L[7]);
  ctx.lineTo(L[4], L[5]);
  ctx.quadraticCurveTo(L[4] - 30, L[3] - 10, L[2], L[3]);
  ctx.quadraticCurveTo(80, N - 20, L[0], L[1]);
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();

  if (h.stripe) roundRect(ctx, 292, 0, 60, F + 6, [0, 0, 20, 20], look.hairColor);   // mohikan-rand
  if (h.bangs) roundRect(ctx, 236, 120, 172, F - 112, [0, 0, 18, 18], col);
  if (h.swoop) {
    ctx.beginPath(); ctx.moveTo(240, 150);
    ctx.quadraticCurveTo(300, 140, 405, 165);
    ctx.quadraticCurveTo(385, 205, 340, 196);
    ctx.quadraticCurveTo(290, 186, 240, 180);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  if (look.hair === 'kort' || look.hair === 'spikigt') {
    ctx.beginPath(); ctx.moveTo(292, 140);
    ctx.quadraticCurveTo(335, 150, 362, 176);
    ctx.quadraticCurveTo(330, 170, 300, 162);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  if (h.spikes) for (let i = 0; i < 5; i++) poly(ctx, [[250 + i * 30, F - 6], [265 + i * 30, F + 22], [280 + i * 30, F - 6]], col);
  if (h.curls) {
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, x = 236 + t * 172;
      ellipse(ctx, x, F + 8 - Math.sin(t * Math.PI) * 10, 16, 15, col);
    }
    const n = h.S > 300 ? 10 : 5;
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) ellipse(ctx, 322 + s * (84 + i * 2), 170 + i * 16, 14, 14, col);
  }
  if (!h.buzz) {
    ctx.strokeStyle = shade(col, 0.18); ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(250, 90); ctx.quadraticCurveTo(280, 70, 320, 70); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(340, 72); ctx.lineTo(360, 74); ctx.stroke();
  }
  return h;
}

/* ---------- Ansikte ---------- */
function paintFace(ctx, look, gender, blink) {
  const sk = look.skin, dark = shade(sk, -0.18);
  const browCol = look.hair === 'flint' ? shade(sk, -0.45) : shade(look.hairColor, -0.25);
  const extra = look.extra || 'kinder';
  ctx.strokeStyle = browCol; ctx.lineWidth = gender === 'tjej' ? 5 : 7; ctx.lineCap = 'round';
  for (const x of [287, 356]) { ctx.beginPath(); ctx.moveTo(x - 15, 203); ctx.quadraticCurveTo(x, 193, x + 15, 202); ctx.stroke(); }
  for (const [x, s] of [[287, -1], [356, 1]]) {
    if (blink) {
      ctx.strokeStyle = '#2a1414'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 9, 222); ctx.quadraticCurveTo(x, 229, x + 9, 222); ctx.stroke();
      continue;
    }
    ellipse(ctx, x, 221, 9.5, 11, '#22100f');
    ellipse(ctx, x, 222, 6.2, 7.2, look.eyes);
    ellipse(ctx, x, 223, 3.3, 3.8, '#120808');
    ellipse(ctx, x + 2.8, 217.5, 2.6, 2.6, '#ffffff');
    if (gender === 'tjej') {
      ctx.strokeStyle = '#22100f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + s * 8, 213); ctx.lineTo(x + s * 14, 208); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 4, 210); ctx.lineTo(x + s * 7, 204); ctx.stroke();
    }
  }
  ellipse(ctx, 322, 244, 11, 5.5, dark);
  if (extra === 'kinder' || extra === 'fraknar') {
    ctx.globalAlpha = 0.28;
    ellipse(ctx, 263, 250, 15, 10, '#ff5f7e'); ellipse(ctx, 381, 250, 15, 10, '#ff5f7e');
    ctx.globalAlpha = 1;
  }
  if (extra === 'fraknar') {
    const d = shade(sk, -0.28);
    for (const [x, y] of [[270, 244], [279, 250], [268, 255], [374, 244], [365, 250], [376, 255], [284, 241], [360, 241]]) ellipse(ctx, x, y, 2.4, 2.4, d);
  }
  if (extra === 'stjarnkinder') { star(ctx, 263, 250, 11, '#ffd84a'); star(ctx, 381, 250, 11, '#ffd84a'); }
  if (extra === 'morrhar') {
    poly(ctx, [[312, 238], [332, 238], [322, 250]], '#3a2020');
    for (const s of [-1, 1]) for (const dy of [-6, 2, 10]) line(ctx, [[322 + s * 22, 252 + dy * 0.4], [322 + s * 62, 246 + dy]], '#3a2020', 2.5);
  }
  // Mun
  const lip = mix(shade(sk, -0.35), '#c0394f', 0.45);
  ctx.lineCap = 'round';
  switch (look.mouth || 'glad') {
    case 'flin':
      ctx.beginPath(); ctx.moveTo(302, 259); ctx.quadraticCurveTo(322, 263, 342, 259);
      ctx.quadraticCurveTo(338, 284, 322, 285); ctx.quadraticCurveTo(306, 284, 302, 259);
      ctx.fillStyle = '#6b1f2a'; ctx.fill();
      ctx.save(); ctx.clip();
      roundRect(ctx, 304, 258, 36, 8, 3, '#ffffff');
      ellipse(ctx, 322, 285, 12, 8, '#ff7b93');
      ctx.restore();
      break;
    case 'liten': ellipse(ctx, 322, 266, 6, 7, '#6b1f2a'); break;
    case 'tunga':
      ellipse(ctx, 325, 270, 7, 9, '#ff7b93');
      line(ctx, [[306, 262], [322, 268], [338, 262]], lip, 5);
      break;
    case 'neutral': line(ctx, [[310, 266], [334, 266]], lip, 5); break;
    default:
      ctx.strokeStyle = lip; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(305, 261); ctx.quadraticCurveTo(322, 276, 339, 261); ctx.stroke();
  }
  if (extra === 'mustasch') {
    const mc = look.hair === 'flint' ? '#4a2c1a' : shade(look.hairColor, -0.2);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(322, 252);
      ctx.quadraticCurveTo(322 + s * 18, 248, 322 + s * 32, 258);
      ctx.quadraticCurveTo(322 + s * 40, 262, 322 + s * 44, 252);
      ctx.quadraticCurveTo(322 + s * 42, 266, 322 + s * 28, 264);
      ctx.quadraticCurveTo(322 + s * 14, 262, 322, 258); ctx.closePath();
      ctx.fillStyle = mc; ctx.fill();
    }
  }
  const frame = look.glassesColor || '#2a2f45';
  if (extra === 'glasogon' || extra === 'solglasogon') {
    const fc = extra === 'solglasogon' ? '#ff5ccf' : frame;
    for (const x of [287, 356]) {
      ctx.beginPath(); ctx.roundRect(x - 21, 205, 42, 33, 12);
      if (extra === 'solglasogon') { ctx.fillStyle = '#16162a'; ctx.fill(); }
      ctx.strokeStyle = fc; ctx.lineWidth = 4.5; ctx.stroke();
      if (extra === 'solglasogon') ellipse(ctx, x - 8, 213, 6, 3, 'rgba(255,255,255,.5)', -0.4);
    }
    line(ctx, [[308, 216], [322, 211], [335, 216]], fc, 4.5);
    line(ctx, [[266, 214], [236, 210]], fc, 4.5); line(ctx, [[377, 214], [407, 210]], fc, 4.5);
  }
  if (extra === 'hjartglasogon') {
    for (const x of [287, 356]) { heart(ctx, x, 222, 20, '#ff3d8b'); heart(ctx, x, 222, 14, '#ff8fc0'); }
    line(ctx, [[306, 216], [337, 216]], '#ff3d8b', 4);
    line(ctx, [[262, 214], [236, 210]], '#ff3d8b', 4); line(ctx, [[381, 214], [407, 210]], '#ff3d8b', 4);
  }
}

/* =========================================================
   TRÖJA
   ========================================================= */
const TORSO = [160, 490, 323, 534];
const NECK = [322, 745];
const LONG = ['langarm', 'hoodie', 'jacka', 'vast', 'regnjacka', 'kofta', 'smoking', 'superhjalte'];

function sleeveRects(top) {
  if (top === 'linne') return [];
  if (LONG.includes(top)) return [[0, 645, 640, 185]];
  return [[140, 645, 365, 185]];
}

/* ---------- Mönster ---------- */
const RAINBOW = ['#ff4d6d', '#ff9f40', '#ffd84a', '#5ee36a', '#3ec7ff', '#8a5cff'];
function dino(ctx, x, y, s, c) {
  ellipse(ctx, x, y, 16 * s, 11 * s, c);
  ellipse(ctx, x + 16 * s, y - 12 * s, 7 * s, 6 * s, c);
  ctx.fillStyle = c; ctx.fillRect(x + 10 * s, y - 14 * s, 6 * s, 12 * s);
  poly(ctx, [[x - 14 * s, y - 2 * s], [x - 32 * s, y + 6 * s], [x - 12 * s, y + 6 * s]], c);
  ctx.fillStyle = c; ctx.fillRect(x - 9 * s, y + 6 * s, 5 * s, 9 * s); ctx.fillRect(x + 5 * s, y + 6 * s, 5 * s, 9 * s);
  for (let i = 0; i < 4; i++) poly(ctx, [[x - 10 * s + i * 7 * s, y - 9 * s], [x - 6 * s + i * 7 * s, y - 17 * s], [x - 2 * s + i * 7 * s, y - 9 * s]], c);
}
function paw(ctx, x, y, s, c) {
  ellipse(ctx, x, y + 4 * s, 9 * s, 8 * s, c);
  for (const [dx, dy] of [[-10, -6], [-4, -12], [4, -12], [10, -6]]) ellipse(ctx, x + dx * s, y + dy * s, 3.6 * s, 4.4 * s, c);
}
function fish(ctx, x, y, s, c) {
  ellipse(ctx, x, y, 14 * s, 8 * s, c);
  poly(ctx, [[x - 12 * s, y], [x - 24 * s, y - 9 * s], [x - 24 * s, y + 9 * s]], c);
  ellipse(ctx, x + 7 * s, y - 2 * s, 2 * s, 2 * s, '#ffffff');
}
function pattern(ctx, kind, c1, c2) {
  const R = rng(7);
  ctx.fillStyle = c2;
  switch (kind) {
    case 'randig':
      for (let y = 490; y < 1024; y += 36) ctx.fillRect(0, y, 640, 16);
      for (let x = 6; x < 640; x += 36) ctx.fillRect(x, 645, 16, 185);
      break;
    case 'prickig':
      for (let y = 500, r = 0; y < 1024; y += 38, r++) for (let x = (r % 2) * 19; x < 640; x += 38) ellipse(ctx, x, y, 8, 8, c2);
      break;
    case 'rutig':
      ctx.globalAlpha = 0.45;
      for (let y = 490; y < 1024; y += 48) ctx.fillRect(0, y, 640, 18);
      for (let x = 0; x < 640; x += 48) ctx.fillRect(x, 490, 18, 534);
      ctx.globalAlpha = 1;
      break;
    case 'stjarnor':
      for (let y = 510, r = 0; y < 1024; y += 64, r++) for (let x = 20 + (r % 2) * 32; x < 640; x += 64) star(ctx, x, y, 12, c2);
      break;
    case 'hjartan':
      for (let y = 515, r = 0; y < 1024; y += 60, r++) for (let x = 20 + (r % 2) * 30; x < 640; x += 60) heart(ctx, x, y, 11, c2);
      break;
    case 'zebra':
      ctx.strokeStyle = c2; ctx.lineCap = 'round';
      for (let y = 470; y < 1040; y += 30) {
        ctx.lineWidth = 9 + R() * 8;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= 640; x += 40) ctx.quadraticCurveTo(x + 20, y + (R() - 0.5) * 30, x + 40, y + (R() - 0.5) * 10);
        ctx.stroke();
      }
      break;
    case 'leopard':
      for (let i = 0; i < 160; i++) {
        const x = R() * 640, y = 490 + R() * 534, r = 7 + R() * 7;
        ellipse(ctx, x, y, r * 0.55, r * 0.5, shade(c1, -0.22));
        ctx.strokeStyle = c2; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, r, R() * 2, R() * 2 + 4.6); ctx.stroke();
      }
      break;
    case 'kamo':
      for (let i = 0; i < 90; i++) {
        const cols = [shade(c1, -0.25), shade(c1, 0.2), c2];
        ellipse(ctx, R() * 640, 490 + R() * 534, 18 + R() * 26, 10 + R() * 16, cols[i % 3], R() * 3);
      }
      break;
    case 'regnbage':
      for (let y = 490, i = 0; y < 1024; y += 22, i++) { ctx.fillStyle = RAINBOW[i % 6]; ctx.fillRect(0, y, 640, 22); }
      for (let x = 0, i = 0; x < 640; x += 22, i++) { ctx.fillStyle = RAINBOW[i % 6]; ctx.fillRect(x, 645, 22, 185); }
      break;
    case 'batik':
      for (const [cx, cy] of [[322, 880], [322, 600], [80, 737], [560, 737]]) {
        for (let r = 220, i = 0; r > 10; r -= 18, i++) {
          ctx.globalAlpha = 0.55; ctx.fillStyle = i % 2 ? c2 : RAINBOW[i % 6];
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      break;
    case 'blommor':
      for (let y = 515, r = 0; y < 1024; y += 62, r++) for (let x = 22 + (r % 2) * 31; x < 640; x += 62) flower(ctx, x, y, 8, c2);
      break;
    case 'schack':
      for (let y = 490, r = 0; y < 1024; y += 32, r++) for (let x = (r % 2) * 32; x < 640; x += 64) ctx.fillRect(x, y, 32, 32);
      break;
    case 'dinos':
      for (let y = 530, r = 0; y < 1024; y += 70, r++) for (let x = 40 + (r % 2) * 40; x < 640; x += 80) dino(ctx, x, y, 0.9, c2);
      break;
    case 'tassar':
      for (let y = 520, r = 0; y < 1024; y += 56, r++) for (let x = 20 + (r % 2) * 28; x < 640; x += 56) paw(ctx, x, y, 1, c2);
      break;
    case 'fiskar':
      for (let y = 520, r = 0; y < 1024; y += 52, r++) for (let x = 30 + (r % 2) * 34; x < 640; x += 68) fish(ctx, x, y, 1, c2);
      break;
  }
}

/* ---------- Tryck på bröstet ---------- */
function animalFace(ctx, x, y, base) {
  ellipse(ctx, x, y, 34, 30, base);
  ellipse(ctx, x - 12, y - 4, 4.5, 5.5, '#22100f'); ellipse(ctx, x + 12, y - 4, 4.5, 5.5, '#22100f');
  ellipse(ctx, x - 10.5, y - 6, 1.6, 1.6, '#ffffff'); ellipse(ctx, x + 13.5, y - 6, 1.6, 1.6, '#ffffff');
}
function printMotif(ctx, kind, x, y, col) {
  switch (kind) {
    case 'hjarta': heart(ctx, x, y, 34, col); break;
    case 'stjarna': star(ctx, x, y, 42, col); break;
    case 'blixt':
      poly(ctx, [[x + 8, y - 44], [x - 22, y + 6], [x - 2, y + 6], [x - 10, y + 44], [x + 22, y - 8], [x + 2, y - 8]], col);
      break;
    case 'regnbage':
      ctx.lineCap = 'butt';
      RAINBOW.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y + 22, 46 - i * 8, Math.PI, 0); ctx.stroke(); });
      ellipse(ctx, x - 44, y + 26, 14, 9, '#ffffff'); ellipse(ctx, x + 44, y + 26, 14, 9, '#ffffff');
      break;
    case 'smiley':
      ellipse(ctx, x, y, 38, 38, '#ffd84a');
      ellipse(ctx, x - 12, y - 8, 4.5, 6.5, '#2a1f1f'); ellipse(ctx, x + 12, y - 8, 4.5, 6.5, '#2a1f1f');
      ctx.strokeStyle = '#2a1f1f'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y + 2, 20, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
      break;
    case 'blomma': flower(ctx, x, y, 22, col); break;
    case 'raket':
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5);
      ellipse(ctx, 0, 0, 16, 36, '#f4f4f8');
      poly(ctx, [[-16, 14], [-28, 36], [-10, 30]], '#ff4d6d'); poly(ctx, [[16, 14], [28, 36], [10, 30]], '#ff4d6d');
      ellipse(ctx, 0, -6, 8, 8, '#3ec7ff'); ellipse(ctx, 0, 44, 9, 14, '#ffb43a');
      ctx.restore();
      break;
    case 'planet':
      ellipse(ctx, x, y, 28, 28, col);
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(x, y, 50, 14, -0.3, 0, Math.PI * 2); ctx.stroke();
      ellipse(ctx, x, y, 28, 28, col);
      ctx.beginPath(); ctx.ellipse(x, y, 50, 14, -0.3, 0.05, Math.PI - 0.05); ctx.stroke();
      break;
    // ---- Djur ----
    case 'katt':
      poly(ctx, [[x - 32, y - 10], [x - 28, y - 44], [x - 8, y - 26]], col); poly(ctx, [[x + 32, y - 10], [x + 28, y - 44], [x + 8, y - 26]], col);
      animalFace(ctx, x, y, col);
      poly(ctx, [[x - 5, y + 5], [x + 5, y + 5], [x, y + 10]], '#ff7b93');
      for (const s of [-1, 1]) for (const d of [-3, 4]) line(ctx, [[x + s * 10, y + 10], [x + s * 38, y + 6 + d]], shade(col, -0.5), 2);
      break;
    case 'hund':
      ellipse(ctx, x - 32, y + 2, 11, 24, shade(col, -0.3), 0.25); ellipse(ctx, x + 32, y + 2, 11, 24, shade(col, -0.3), -0.25);
      animalFace(ctx, x, y, col);
      ellipse(ctx, x, y + 12, 14, 10, shade(col, 0.4)); ellipse(ctx, x, y + 7, 6, 4.5, '#22100f');
      ellipse(ctx, x + 4, y + 22, 5, 6, '#ff7b93');
      break;
    case 'enhorning':
      ellipse(ctx, x, y + 4, 30, 32, '#ffffff');
      poly(ctx, [[x - 6, y - 24], [x + 6, y - 24], [x + 2, y - 62]], '#ffd84a');
      ['#ff5ccf', '#8a5cff', '#3ec7ff'].forEach((c, i) => ellipse(ctx, x - 26 - i * 4, y - 14 + i * 14, 9, 12, c));
      ellipse(ctx, x - 11, y + 2, 4, 5, '#22100f'); ellipse(ctx, x + 11, y + 2, 4, 5, '#22100f');
      ellipse(ctx, x, y + 22, 14, 9, '#ffd1f0');
      break;
    case 'dino':
      ctx.save(); ctx.translate(x - 4, y + 6); ctx.scale(2.2, 2.2); dino(ctx, 0, 0, 1, col); ctx.restore();
      ellipse(ctx, x + 32, y - 22, 2.6, 2.6, '#ffffff');
      break;
    case 'panda':
      ellipse(ctx, x - 26, y - 24, 12, 12, '#1f1f2a'); ellipse(ctx, x + 26, y - 24, 12, 12, '#1f1f2a');
      ellipse(ctx, x, y, 34, 30, '#ffffff');
      ellipse(ctx, x - 13, y - 3, 9, 11, '#1f1f2a', 0.4); ellipse(ctx, x + 13, y - 3, 9, 11, '#1f1f2a', -0.4);
      ellipse(ctx, x - 12, y - 4, 3, 3, '#ffffff'); ellipse(ctx, x + 12, y - 4, 3, 3, '#ffffff');
      ellipse(ctx, x, y + 10, 6, 4.5, '#1f1f2a');
      break;
    case 'rav':
      poly(ctx, [[x - 30, y - 6], [x - 26, y - 42], [x - 6, y - 22]], '#ff7a3d'); poly(ctx, [[x + 30, y - 6], [x + 26, y - 42], [x + 6, y - 22]], '#ff7a3d');
      poly(ctx, [[x - 38, y - 18], [x + 38, y - 18], [x, y + 34]], '#ff7a3d');
      poly(ctx, [[x - 22, y + 2], [x + 22, y + 2], [x, y + 34]], '#ffffff');
      ellipse(ctx, x - 13, y - 6, 4, 5, '#22100f'); ellipse(ctx, x + 13, y - 6, 4, 5, '#22100f');
      ellipse(ctx, x, y + 30, 5, 4, '#22100f');
      break;
    case 'uggla':
      ellipse(ctx, x, y + 4, 32, 38, col);
      poly(ctx, [[x - 30, y - 22], [x - 22, y - 44], [x - 12, y - 26]], col); poly(ctx, [[x + 30, y - 22], [x + 22, y - 44], [x + 12, y - 26]], col);
      for (const s of [-1, 1]) { ellipse(ctx, x + s * 13, y - 6, 12, 12, '#ffffff'); ellipse(ctx, x + s * 13, y - 6, 5.5, 5.5, '#22100f'); }
      poly(ctx, [[x - 5, y + 6], [x + 5, y + 6], [x, y + 15]], '#ffb43a');
      ellipse(ctx, x, y + 26, 16, 10, shade(col, 0.35));
      break;
    case 'haj':
      ellipse(ctx, x, y, 44, 20, '#7d93b2');
      poly(ctx, [[x - 6, y - 16], [x + 10, y - 44], [x + 16, y - 14]], '#7d93b2');
      poly(ctx, [[x - 40, y], [x - 62, y - 22], [x - 56, y + 2], [x - 62, y + 24]], '#7d93b2');
      ellipse(ctx, x, y + 6, 34, 10, '#ffffff');
      ellipse(ctx, x + 24, y - 6, 3.5, 3.5, '#22100f');
      for (let i = 0; i < 4; i++) poly(ctx, [[x + 14 + i * 6, y + 4], [x + 17 + i * 6, y + 10], [x + 20 + i * 6, y + 4]], '#ffffff');
      break;
    case 'fjaril':
      ellipse(ctx, x - 22, y - 14, 22, 20, col, -0.4); ellipse(ctx, x + 22, y - 14, 22, 20, col, 0.4);
      ellipse(ctx, x - 18, y + 16, 15, 14, shade(col, 0.3), 0.4); ellipse(ctx, x + 18, y + 16, 15, 14, shade(col, 0.3), -0.4);
      for (const s of [-1, 1]) ellipse(ctx, x + s * 22, y - 14, 7, 7, '#ffffff');
      ellipse(ctx, x, y, 5, 26, '#2a1f1f');
      line(ctx, [[x - 2, y - 24], [x - 10, y - 40]], '#2a1f1f', 2.5); line(ctx, [[x + 2, y - 24], [x + 10, y - 40]], '#2a1f1f', 2.5);
      break;
    case 'kanin':
      ellipse(ctx, x - 13, y - 36, 9, 26, col); ellipse(ctx, x + 13, y - 36, 9, 26, col);
      ellipse(ctx, x - 13, y - 36, 4, 18, '#ffb3d0'); ellipse(ctx, x + 13, y - 36, 4, 18, '#ffb3d0');
      animalFace(ctx, x, y + 6, col);
      ellipse(ctx, x, y + 12, 4, 3, '#ff7b93');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y + 18, 4, 7); ctx.fillRect(x + 1, y + 18, 4, 7);
      break;
  }
}

function paintTop(ctx, look) {
  const top = look.top || 'tshirt';
  const c1 = look.topColor, c2 = look.topColor2 || contrast(c1);
  const sleeveCol = top === 'vast' ? c2 : c1;
  const edge = shade(c1, -0.18);
  const [nx, ny] = NECK;

  ctx.save();
  ctx.beginPath();
  [TORSO, ...sleeveRects(top)].forEach(([x, y, w, h]) => ctx.rect(x, y, w, h));
  ctx.clip();
  ctx.fillStyle = sleeveCol; ctx.fillRect(0, 645, 640, 185);
  ctx.fillStyle = c1; ctx.fillRect(TORSO[0], TORSO[1], TORSO[2], TORSO[3]);
  if (top === 'vast') { ctx.save(); ctx.beginPath(); ctx.rect(...TORSO); ctx.clip(); }
  if (look.pattern && look.pattern !== 'enfargad') pattern(ctx, look.pattern, c1, c2);
  if (top === 'vast') ctx.restore();
  const cuff = top === 'vast' ? shade(c2, -0.12) : edge;
  if (['tshirt', 'klanning', 'pike', 'fotboll'].includes(top)) { ctx.fillStyle = cuff; ctx.fillRect(140, 645, 12, 185); ctx.fillRect(493, 645, 12, 185); }
  if (LONG.includes(top)) { ctx.fillStyle = cuff; ctx.fillRect(0, 645, 46, 185); ctx.fillRect(594, 645, 46, 185); }
  if (top === 'fotboll') { ctx.fillStyle = c2; ctx.fillRect(158, 645, 16, 185); ctx.fillRect(471, 645, 16, 185); }
  if (top === 'kofta') { ctx.fillStyle = shade(c1, -0.1); for (let x = 0; x < 46; x += 9) { ctx.fillRect(x, 645, 4, 185); ctx.fillRect(594 + x, 645, 4, 185); } }
  ctx.fillStyle = edge; ctx.fillRect(160, 1004, 323, 20); ctx.fillRect(160, 490, 323, 14);
  ctx.restore();

  const roundNeck = () => {
    ellipse(ctx, nx, ny + 8, 34, 32, look.skin);
    ctx.strokeStyle = edge; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(nx, ny + 8, 34, 32, 0, 0, Math.PI * 2); ctx.stroke();
  };
  const openFront = (inner) => {
    ctx.fillStyle = inner; ctx.fillRect(286, ny, 72, 1024 - ny);
    ctx.fillStyle = shade(c1, -0.28); ctx.fillRect(282, ny + 20, 6, 1024 - ny); ctx.fillRect(356, ny + 20, 6, 1024 - ny);
    ellipse(ctx, nx, ny + 20, 30, 26, look.skin);
  };
  const buttons = (x, y0, n, gap, col) => { for (let i = 0; i < n; i++) ellipse(ctx, x, y0 + i * gap, 5, 5, col); };
  const hood = () => {
    ctx.fillStyle = shade(c1, -0.15);
    ctx.beginPath(); ctx.ellipse(nx, ny - 30, 70, 62, 0, Math.PI, 0); ctx.lineTo(nx + 40, ny - 10);
    ctx.ellipse(nx, ny - 10, 40, 30, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill();
  };

  switch (top) {
    case 'jacka':
      openFront(c2);
      poly(ctx, [[268, ny], [300, ny + 70], [288, ny + 4]], shade(c1, -0.12));
      poly(ctx, [[376, ny], [344, ny + 70], [356, ny + 4]], shade(c1, -0.12));
      roundRect(ctx, 210, 900, 50, 10, 4, shade(c1, -0.25)); roundRect(ctx, 384, 900, 50, 10, 4, shade(c1, -0.25));
      break;
    case 'kofta':
      openFront(c2);
      buttons(278, ny + 50, 5, 46, shade(c1, -0.35));
      ctx.fillStyle = shade(c1, -0.1); for (let x = 160; x < 483; x += 9) ctx.fillRect(x, 975, 4, 30);
      break;
    case 'smoking': {
      poly(ctx, [[nx - 34, ny], [nx + 34, ny], [nx + 14, 990], [nx - 14, 990]], c2 === c1 ? '#ffffff' : c2);
      poly(ctx, [[nx - 34, ny], [nx - 10, 900], [nx - 56, ny + 40]], shade(c1, 0.12));
      poly(ctx, [[nx + 34, ny], [nx + 10, 900], [nx + 56, ny + 40]], shade(c1, 0.12));
      ellipse(ctx, nx, ny + 12, 26, 22, look.skin);
      const bow = look.printColor && look.printColor !== '#ffffff' ? look.printColor : '#e23b4e';
      poly(ctx, [[nx, ny + 38], [nx - 24, ny + 26], [nx - 24, ny + 50]], bow); poly(ctx, [[nx, ny + 38], [nx + 24, ny + 26], [nx + 24, ny + 50]], bow);
      ellipse(ctx, nx, ny + 38, 6, 6, shade(bow, -0.2));
      buttons(nx, ny + 80, 3, 40, '#2a2f45');
      break;
    }
    case 'linne':
      ellipse(ctx, nx, ny + 22, 46, 52, look.skin);
      ctx.strokeStyle = edge; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(nx, ny + 22, 46, 52, 0, 0, Math.PI); ctx.stroke();
      break;
    case 'vast':
      poly(ctx, [[nx - 40, ny], [nx + 40, ny], [nx, 900]], c2);
      roundNeck();
      buttons(nx, 915, 3, 32, shade(c1, -0.35));
      break;
    case 'pike':
      roundNeck();
      poly(ctx, [[nx - 36, ny - 4], [nx - 4, ny + 30], [nx - 30, ny + 46]], shade(c1, 0.15));
      poly(ctx, [[nx + 36, ny - 4], [nx + 4, ny + 30], [nx + 30, ny + 46]], shade(c1, 0.15));
      roundRect(ctx, nx - 8, ny + 34, 16, 60, 4, shade(c1, -0.1));
      buttons(nx, ny + 46, 3, 18, '#ffffff');
      break;
    case 'fotboll':
      poly(ctx, [[nx - 34, ny], [nx + 34, ny], [nx, ny + 46]], look.skin);
      line(ctx, [[nx - 36, ny], [nx, ny + 48], [nx + 36, ny]], c2, 7);
      ctx.fillStyle = c2; ctx.font = 'bold 120px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save(); ctx.translate(nx, 610); ctx.rotate(Math.PI); ctx.fillText('10', 0, 0); ctx.restore();
      break;
    case 'regnjacka':
      roundNeck();
      buttons(nx, ny + 60, 5, 46, shade(c1, -0.35));
      roundRect(ctx, 210, 930, 54, 40, 6, shade(c1, -0.1)); roundRect(ctx, 380, 930, 54, 40, 6, shade(c1, -0.1));
      hood();
      break;
    case 'superhjalte':
      roundNeck();
      ctx.fillStyle = c2; ctx.fillRect(160, 990, 323, 18);
      break;
    default:
      roundNeck();
  }
  if (top === 'hoodie') {
    hood();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const x of [nx - 14, nx + 14]) { ctx.beginPath(); ctx.moveTo(x, ny + 36); ctx.lineTo(x, ny + 90); ctx.stroke(); ellipse(ctx, x, ny + 92, 5, 5, '#ffffff'); }
    poly(ctx, [[250, 965], [270, 905], [374, 905], [394, 965]], shade(c1, -0.12));
  }
  if (top === 'klanning') {
    ctx.fillStyle = shade(c1, -0.15); ctx.fillRect(160, 940, 323, 14);
    if (look.print === 'ingen' || !look.print) for (const y of [960, 985]) ellipse(ctx, nx, y, 5, 5, '#ffffff');
  }
  const pc = look.printColor || (c2 === c1 ? contrast(c1) : c2);
  const noPrint = !look.print || look.print === 'ingen';
  if (top === 'superhjalte') {
    poly(ctx, [[nx, 815], [nx + 52, 860], [nx, 918], [nx - 52, 860]], '#ffd84a');
    poly(ctx, [[nx, 825], [nx + 42, 860], [nx, 908], [nx - 42, 860]], c2);
    if (noPrint) printMotif(ctx, 'blixt', nx, 862, '#ffd84a');
  }
  if (top === 'fotboll' && noPrint) {
    ctx.fillStyle = c2; ctx.font = 'bold 54px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('10', nx + 70, 840);
  }
  if (!noPrint && top !== 'smoking') printMotif(ctx, look.print, nx, ['jacka', 'kofta'].includes(top) ? 870 : 862, pc);
}

/* =========================================================
   BYXOR
   ========================================================= */
const SKIRTS = ['kjol', 'tutu', 'veckkjol'];
export const isSkirt = look => look.top === 'klanning' || SKIRTS.includes(look.bottom);

function paintBottom(ctx, look) {
  const dress = look.top === 'klanning';
  const style = dress ? 'klanning' : (look.bottom || 'byxor');
  const col = dress ? look.topColor : look.bottomColor;
  if (style === 'klanning' || SKIRTS.includes(style)) {
    ctx.fillStyle = col; ctx.fillRect(611, 764, 413, 34);
    return;
  }
  const shorts = style === 'shorts' || style === 'jeansshorts';
  const h = shorts ? 130 : 260;
  ctx.fillStyle = col; ctx.fillRect(611, 764, 413, h);
  if (style === 'rutiga') {
    ctx.save(); ctx.beginPath(); ctx.rect(611, 764, 413, h); ctx.clip();
    ctx.globalAlpha = 0.35; ctx.fillStyle = shade(col, -0.45);
    for (let y = 764; y < 1024; y += 40) ctx.fillRect(611, y, 413, 14);
    for (let x = 611; x < 1024; x += 40) ctx.fillRect(x, 764, 14, 260);
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff';
    for (let y = 784; y < 1024; y += 40) ctx.fillRect(611, y, 413, 3);
    ctx.globalAlpha = 1; ctx.restore();
  }
  const dark = shade(col, -0.2);
  if (style !== 'leggings') { ctx.fillStyle = dark; ctx.fillRect(611, 764, 413, 20); }
  if (shorts) { ctx.fillStyle = dark; ctx.fillRect(611, 764 + h - 12, 413, 12); }
  else if (style === 'mjukis') { ctx.fillStyle = dark; ctx.fillRect(611, 985, 413, 39); }
  else if (style !== 'leggings') { ctx.fillStyle = dark; ctx.fillRect(611, 995, 413, 29); }
  if (style === 'jeansshorts') {
    ctx.fillStyle = '#e8eef8';
    for (let x = 611; x < 1024; x += 8) ctx.fillRect(x, 764 + h - 4, 4, 8 + ((x * 7) % 9));
  }
  if (style === 'jeans' || style === 'jeansshorts') {
    ctx.strokeStyle = '#f2b45a'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
    for (const x of [640, 700, 760, 860, 920, 980]) { ctx.beginPath(); ctx.moveTo(x, 790); ctx.lineTo(x, 764 + h - 14); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(611, 788); ctx.lineTo(1024, 788); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (['byxor', 'jeans', 'kostym'].includes(style)) for (const x of [660, 760, 870, 975]) ellipse(ctx, x, 890, 10, 4, shade(col, -0.1));
  if (style === 'kostym') { ctx.fillStyle = shade(col, -0.12); for (const x of [670, 780, 880, 965]) ctx.fillRect(x, 800, 3, 195); }
  if (style === 'mjukis' || style === 'leggings') {
    ctx.fillStyle = style === 'mjukis' ? '#ffffff' : shade(col, 0.25);
    for (const x of [635, 808, 826, 999]) ctx.fillRect(x, 790, 10, style === 'mjukis' ? 195 : 234);
  }
  if (style === 'cargo') {
    for (const x of [640, 768, 830, 958]) {
      roundRect(ctx, x, 850, 44, 52, 6, shade(col, -0.12));
      roundRect(ctx, x - 2, 846, 48, 16, 4, shade(col, -0.22));
      ellipse(ctx, x + 22, 855, 3.5, 3.5, '#d8d8e8');
    }
  }
}

function paintOverlays(ctx, look) {
  // Snickarbyxor: bröstlapp och hängslen ovanpå tröjan
  if (look.bottom === 'snickarbyxor' && look.top !== 'klanning') {
    const c = look.bottomColor, d = shade(c, -0.2);
    roundRect(ctx, 262, 872, 120, 140, 10, c);
    roundRect(ctx, 290, 900, 64, 40, 6, d);
    ctx.fillStyle = c; ctx.fillRect(266, 500, 22, 380); ctx.fillRect(356, 500, 22, 380);
    for (const x of [277, 367]) ellipse(ctx, x, 880, 8, 8, '#d8d8e8');
  }
}

function paintBelt(ctx, look) {
  if (isSkirt(look) || ['jacka', 'kofta', 'smoking', 'regnjacka'].includes(look.top) || ['mjukis', 'leggings', 'snickarbyxor'].includes(look.bottom)) return;
  ctx.fillStyle = '#2a2135';
  ctx.fillRect(160, 1006, 323, 18); ctx.fillRect(160, 490, 323, 12);
  roundRect(ctx, 305, 1004, 34, 20, 4, '#d8d8e8');
  roundRect(ctx, 311, 1009, 22, 10, 2, '#2a2135');
}

/* =========================================================
   SKOR
   ========================================================= */
function paintShoes(ctx, look) {
  const style = look.shoeStyle || 'sneakers';
  const c = look.shoes, sk = look.skin;
  const SH = [639, 134, 185, 390];
  const sole = (col) => { ctx.fillStyle = col; ctx.fillRect(639, 0, 385, 134); };
  const toes = [284, 459], tops = [150, 325];
  const laces = (col) => { ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (const t of tops) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(713, t + 64 + i * 11); ctx.lineTo(741, t + 64 + i * 11); ctx.stroke(); } };
  ctx.fillStyle = c; ctx.fillRect(...SH);
  switch (style) {
    case 'stovlar':
      ctx.fillStyle = shade(c, -0.1); ctx.fillRect(...SH); sole(shade(c, -0.55));
      for (const t of tops) { ctx.fillStyle = shade(c, 0.15); ctx.fillRect(660, t + 28, 140, 10); }
      break;
    case 'gummistovlar':
      sole(shade(c, -0.5));
      for (const t of tops) { ctx.fillStyle = shade(c, 0.35); ctx.fillRect(670, t + 40, 14, 120); ctx.fillStyle = shade(c, -0.2); ctx.fillRect(660, t + 4, 140, 16); }
      break;
    case 'kangor':
      ctx.fillStyle = shade(c, -0.05); ctx.fillRect(...SH); sole('#3a2a20');
      for (const y of toes) ellipse(ctx, 727, y, 44, 30, shade(c, -0.25));
      laces('#f2d18a');
      for (const t of tops) for (let i = 0; i < 4; i++) { ellipse(ctx, 708, t + 58 + i * 12, 3, 3, '#d8d8e8'); ellipse(ctx, 746, t + 58 + i * 12, 3, 3, '#d8d8e8'); }
      break;
    case 'tofflor': {
      sole(shade(c, -0.3));
      const R = rng(3);
      for (let i = 0; i < 260; i++) ellipse(ctx, 640 + R() * 184, 134 + R() * 390, 3, 3, shade(c, R() > 0.5 ? 0.25 : -0.1));
      for (const t of tops) roundRect(ctx, 691, t, 78, 30, 12, shade(c, 0.4));
      break;
    }
    case 'sandaler':
      ctx.fillStyle = sk; ctx.fillRect(...SH); sole('#8a5a2b');
      for (const t of tops) { ctx.fillStyle = c; ctx.fillRect(650, t + 60, 160, 22); ctx.fillRect(650, t + 120, 160, 22); }
      break;
    case 'ballerina':
      sole(shade(c, -0.4));
      for (const t of tops) {
        ellipse(ctx, 730, t + 60, 50, 52, sk);
        ellipse(ctx, 718, t + 122, 10, 7, shade(c, -0.2)); ellipse(ctx, 738, t + 122, 10, 7, shade(c, -0.2)); ellipse(ctx, 728, t + 122, 5, 5, shade(c, 0.2));
      }
      break;
    case 'fotbollsskor':
      sole('#2a2f45');
      for (const t of tops) for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(690 + i * 22, t + 120); ctx.rotate(-0.5); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 10, 60); ctx.restore(); }
      laces('#ffffff');
      for (let x = 670; x < 1000; x += 40) for (const y of [40, 90]) ellipse(ctx, x, y, 8, 8, '#d8d8e8');
      break;
    case 'foppa':
      sole(shade(c, -0.2));
      for (const t of tops) for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) ellipse(ctx, 690 + i * 24 + (r % 2) * 12, t + 90 + r * 30, 6, 6, shade(c, -0.3));
      break;
    case 'vinterkangor':
      sole('#3a3a4a');
      for (const t of tops) { roundRect(ctx, 670, t, 120, 46, 18, '#ffffff'); const R = rng(t); for (let i = 0; i < 30; i++) ellipse(ctx, 676 + R() * 110, t + 6 + R() * 36, 4, 4, '#e6ebf5'); }
      for (const y of toes) ellipse(ctx, 727, y, 40, 24, shade(c, -0.2));
      break;
    default:   // sneakers, glitter, rullskridskor
      sole('#eef0f6');
      for (const y of toes) ellipse(ctx, 727, y, 42, 28, '#f6f6fa');
      laces('#ffffff');
      for (const t of tops) roundRect(ctx, 691, t, 78, 26, 10, shade(c, -0.25));
      if (style === 'glitter') {
        for (const t of tops) for (let i = 0; i < 26; i++) {
          const x = 668 + ((i * 37) % 120), y = t + 20 + ((i * 53) % 130);
          star(ctx, x, y, 4 + (i % 3), i % 2 ? '#ffffff' : '#ffe680', 4, 0.4);
        }
      }
  }
}

/* =========================================================
   Hela texturen
   ========================================================= */
export function paintSkin(lookIn, gender, opts = {}) {
  const look = resolveLook(lookIn);
  const cv = opts.canvas || document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d');
  const sk = look.skin;
  ctx.fillStyle = sk; ctx.fillRect(0, 0, SIZE, SIZE);
  roundRect(ctx, 232, 292, 180, 190, 40, shade(sk, -0.04));
  ctx.fillStyle = shade(sk, -0.03); ctx.fillRect(824, 134, 200, 390);

  const h = paintHair(ctx, look);
  if (h.ears) for (const x of [190, 454]) {
    ellipse(ctx, x, 236, 16, 22, sk);
    ctx.strokeStyle = shade(sk, -0.15); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(x, 237, 8, 12, 0, -1.2, 1.9); ctx.stroke();
  }
  paintFace(ctx, look, gender, !!opts.blink);
  paintBottom(ctx, look);
  paintTop(ctx, look);
  paintOverlays(ctx, look);
  paintBelt(ctx, look);
  paintShoes(ctx, look);
  return cv;
}

/* ---------- Färdiga dräkter (SVG) ---------- */
const presetCache = {};
export function loadPreset(name) {
  if (!presetCache[name]) {
    presetCache[name] = fetch(new URL(`../assets/skins/${name}.svg`, import.meta.url))
      .then(r => r.text())
      .then(txt => new Promise((res, rej) => {
        const fixed = txt.replace('<svg ', '<svg width="1024" height="1024" viewBox="0 0 1024 1024" ');
        const url = URL.createObjectURL(new Blob([fixed], { type: 'image/svg+xml' }));
        const img = new Image();
        img.onload = () => {
          const cv = document.createElement('canvas');
          cv.width = cv.height = SIZE;
          cv.getContext('2d').drawImage(img, 0, 0, SIZE, SIZE);
          URL.revokeObjectURL(url);
          res(cv);
        };
        img.onerror = rej;
        img.src = url;
      }));
  }
  return presetCache[name];
}
