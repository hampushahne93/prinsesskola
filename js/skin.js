/* =========================================================
   Multiskolan – målar gubbens textur (1024 x 1024)
   Kartan följer modellens UV-layout:
     Huvud      x 0–640,   y 0–490   (ansiktet i mitten, x≈322)
     Tröja      x 160–483, y 490–1024 (rygg upptill, halshål y≈745, framsida nedtill)
     Ärmar      x 0–640,   y 645–830 (handleder ytterst)
     Skor       x 639–824, y 134–524  (sulor: y 0–134)
     Händer     x 824–1024, y 134–764
     Byxor      x 611–1024, y 764–1024
   ========================================================= */

export const SIZE = 1024;

/* ---------- Färghjälp ---------- */
function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
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
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
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

/* =========================================================
   HÅR (målat på huvudet)
   F = lugg/hårfäste mitt, S = polisonger, N = nacke
   ========================================================= */
const HAIR = {
  kort:      { F: 150, S: 228, N: 300, ears: true },
  snaggad:   { F: 142, S: 215, N: 290, ears: true, buzz: true },
  lang:      { F: 146, S: 330, N: 476, ears: false },
  page:      { F: 186, S: 290, N: 430, ears: false, bangs: true },
  hastsvans: { F: 150, S: 232, N: 300, ears: true },
  tofsar:    { F: 152, S: 232, N: 300, ears: true },
  knut:      { F: 148, S: 228, N: 292, ears: true },
  lockigt:   { F: 146, S: 240, N: 320, ears: true, curls: true },
  lugg:      { F: 150, S: 232, N: 305, ears: true, swoop: true },
  flint:     { none: true, ears: true }
};

function paintHair(ctx, look) {
  const h = HAIR[look.hair] || HAIR.kort;
  if (h.none) return h;
  const col = h.buzz ? mix(look.hairColor, look.skin, 0.3) : look.hairColor;
  const { F, S, N } = h;
  const side = (s) => {        // s = -1 vänster, +1 höger (i bilden)
    const x = v => 322 + s * v;
    return [x(322), N, x(150), 240, x(84), S, x(80), F + 30];
  };
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

  if (h.bangs) {              // rak lugg
    roundRect(ctx, 236, 120, 172, F - 112, [0, 0, 18, 18], col);
  }
  if (h.swoop) {              // snedlugg
    ctx.beginPath(); ctx.moveTo(240, 150);
    ctx.quadraticCurveTo(300, 140, 405, 165);
    ctx.quadraticCurveTo(385, 205, 340, 196);
    ctx.quadraticCurveTo(290, 186, 240, 180);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  if (look.hair === 'kort') { // liten tofs fram
    ctx.beginPath(); ctx.moveTo(292, 140);
    ctx.quadraticCurveTo(335, 150, 362, 176);
    ctx.quadraticCurveTo(330, 170, 300, 162);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  if (h.curls) {               // lockar längs hårfästet
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, x = 236 + t * 172;
      const y = F + 8 + Math.sin(t * Math.PI) * -10;
      ellipse(ctx, x, y, 16, 15, col);
    }
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) ellipse(ctx, 322 + s * (84 + i * 2), 170 + i * 16, 14, 14, col);
  }
  // Glans
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
  // Ögonbryn
  ctx.strokeStyle = browCol; ctx.lineWidth = gender === 'tjej' ? 5 : 7; ctx.lineCap = 'round';
  for (const x of [287, 356]) { ctx.beginPath(); ctx.moveTo(x - 15, 203); ctx.quadraticCurveTo(x, 193, x + 15, 202); ctx.stroke(); }
  // Ögon
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
  // Näsa
  ellipse(ctx, 322, 244, 11, 5.5, dark);
  // Kinder / fräknar
  const extra = look.extra || 'kinder';
  if (extra === 'kinder' || extra === 'fraknar') {
    ctx.globalAlpha = 0.28;
    ellipse(ctx, 263, 250, 15, 10, '#ff5f7e'); ellipse(ctx, 381, 250, 15, 10, '#ff5f7e');
    ctx.globalAlpha = 1;
  }
  if (extra === 'fraknar') {
    const d = shade(sk, -0.28);
    for (const [x, y] of [[270, 244], [279, 250], [268, 255], [374, 244], [365, 250], [376, 255], [284, 241], [360, 241]]) ellipse(ctx, x, y, 2.4, 2.4, d);
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
    case 'liten':
      ellipse(ctx, 322, 266, 6, 7, '#6b1f2a');
      break;
    case 'tunga':
      ellipse(ctx, 325, 270, 7, 9, '#ff7b93');
      ctx.strokeStyle = lip; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(306, 262); ctx.quadraticCurveTo(322, 272, 338, 262); ctx.stroke();
      break;
    case 'neutral':
      ctx.strokeStyle = lip; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(310, 266); ctx.lineTo(334, 266); ctx.stroke();
      break;
    case 'glad':
    default:
      ctx.strokeStyle = lip; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(305, 261); ctx.quadraticCurveTo(322, 276, 339, 261); ctx.stroke();
  }
  // Glasögon
  if (extra === 'glasogon') {
    ctx.strokeStyle = look.glassesColor || '#2a2f45'; ctx.lineWidth = 4.5;
    for (const x of [287, 356]) { ctx.beginPath(); ctx.roundRect(x - 21, 205, 42, 33, 12); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(308, 216); ctx.quadraticCurveTo(322, 210, 335, 216); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(266, 214); ctx.lineTo(236, 210); ctx.moveTo(377, 214); ctx.lineTo(407, 210); ctx.stroke();
  }
}

/* =========================================================
   TRÖJA
   ========================================================= */
const TORSO = [160, 490, 323, 534];           // x, y, w, h
const NECK = [322, 745];

function sleeveRects(top) {
  if (top === 'linne') return [];
  if (top === 'langarm' || top === 'hoodie' || top === 'jacka') return [[0, 645, 640, 185]];
  return [[140, 645, 365, 185]];               // korta ärmar
}

function pattern(ctx, kind, c2) {
  ctx.fillStyle = c2;
  if (kind === 'randig') {
    for (let y = 490; y < 1024; y += 36) ctx.fillRect(0, y, 640, 16);
    for (let x = 6; x < 640; x += 36) ctx.fillRect(x, 645, 16, 185);
  } else if (kind === 'prickig') {
    for (let y = 500, r = 0; y < 1024; y += 38, r++) for (let x = (r % 2) * 19; x < 640; x += 38) ellipse(ctx, x, y, 8, 8, c2);
  } else if (kind === 'rutig') {
    ctx.globalAlpha = 0.45;
    for (let y = 490; y < 1024; y += 48) ctx.fillRect(0, y, 640, 18);
    for (let x = 0; x < 640; x += 48) ctx.fillRect(x, 490, 18, 534);
    ctx.globalAlpha = 1;
  } else if (kind === 'stjarnor') {
    for (let y = 510, r = 0; y < 1024; y += 64, r++) for (let x = 20 + (r % 2) * 32; x < 640; x += 64) star(ctx, x, y, 12, c2);
  } else if (kind === 'hjartan') {
    for (let y = 515, r = 0; y < 1024; y += 60, r++) for (let x = 20 + (r % 2) * 30; x < 640; x += 60) heart(ctx, x, y, 11, c2);
  }
}

const RAINBOW = ['#ff4d6d', '#ff9f40', '#ffd84a', '#5ee36a', '#3ec7ff', '#8a5cff'];
function printMotif(ctx, kind, x, y, col) {
  switch (kind) {
    case 'hjarta': heart(ctx, x, y, 34, col); break;
    case 'stjarna': star(ctx, x, y, 42, col); break;
    case 'blixt':
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 44); ctx.lineTo(x - 22, y + 6); ctx.lineTo(x - 2, y + 6);
      ctx.lineTo(x - 10, y + 44); ctx.lineTo(x + 22, y - 8); ctx.lineTo(x + 2, y - 8); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
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
    case 'blomma':
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ellipse(ctx, x + Math.cos(a) * 22, y + Math.sin(a) * 22, 15, 15, col); }
      ellipse(ctx, x, y, 14, 14, '#ffd84a');
      break;
    case 'raket':
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5);
      ellipse(ctx, 0, 0, 16, 36, '#f4f4f8');
      ctx.beginPath(); ctx.moveTo(-16, 14); ctx.lineTo(-28, 36); ctx.lineTo(-10, 30); ctx.closePath(); ctx.fillStyle = '#ff4d6d'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, 14); ctx.lineTo(28, 36); ctx.lineTo(10, 30); ctx.closePath(); ctx.fill();
      ellipse(ctx, 0, -6, 8, 8, '#3ec7ff');
      ellipse(ctx, 0, 44, 9, 14, '#ffb43a');
      ctx.restore();
      break;
    case 'planet':
      ellipse(ctx, x, y, 28, 28, col);
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(x, y, 50, 14, -0.3, 0, Math.PI * 2); ctx.stroke();
      ellipse(ctx, x, y, 28, 28, col);
      ctx.beginPath(); ctx.ellipse(x, y, 50, 14, -0.3, 0.05, Math.PI - 0.05); ctx.stroke();
      break;
  }
}

function paintTop(ctx, look) {
  const top = look.top || 'tshirt';
  const c1 = look.topColor, c2 = look.topColor2 || contrast(c1);
  const shapes = [TORSO, ...sleeveRects(top)];
  ctx.save();
  ctx.beginPath();
  shapes.forEach(([x, y, w, h]) => ctx.rect(x, y, w, h));
  ctx.clip();
  ctx.fillStyle = c1; ctx.fillRect(0, 490, 640, 534);
  if (look.pattern && look.pattern !== 'enfargad') pattern(ctx, look.pattern, c2);
  // Kanter på ärmar
  const edge = shade(c1, -0.18);
  if (top === 'tshirt' || top === 'klanning') { ctx.fillStyle = edge; ctx.fillRect(140, 645, 12, 185); ctx.fillRect(493, 645, 12, 185); }
  if (top === 'langarm' || top === 'hoodie' || top === 'jacka') { ctx.fillStyle = edge; ctx.fillRect(0, 645, 46, 185); ctx.fillRect(594, 645, 46, 185); }
  // Fåll i midjan (fram och bak)
  ctx.fillStyle = edge; ctx.fillRect(160, 1004, 323, 20); ctx.fillRect(160, 490, 323, 14);
  ctx.restore();

  const [nx, ny] = NECK;
  if (top === 'jacka') {
    // Öppen jacka: tröja under (färg 2) och dragkedja
    ctx.fillStyle = c2; ctx.fillRect(286, ny, 72, 1024 - ny);
    ctx.fillStyle = shade(c1, -0.28); ctx.fillRect(282, ny + 20, 6, 1024 - ny); ctx.fillRect(356, ny + 20, 6, 1024 - ny);
    ctx.beginPath(); ctx.moveTo(268, ny); ctx.lineTo(300, ny + 70); ctx.lineTo(288, ny + 4); ctx.closePath(); ctx.fillStyle = shade(c1, -0.12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(376, ny); ctx.lineTo(344, ny + 70); ctx.lineTo(356, ny + 4); ctx.closePath(); ctx.fill();
    ellipse(ctx, nx, ny + 20, 30, 26, look.skin);
    roundRect(ctx, 210, 900, 50, 10, 4, shade(c1, -0.25)); roundRect(ctx, 384, 900, 50, 10, 4, shade(c1, -0.25));
  } else if (top === 'linne') {
    ellipse(ctx, nx, ny + 22, 46, 52, look.skin);
    ctx.strokeStyle = edge; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(nx, ny + 22, 46, 52, 0, 0, Math.PI); ctx.stroke();
  } else {
    // Rund halsringning
    ellipse(ctx, nx, ny + 8, 34, 32, look.skin);
    ctx.strokeStyle = edge; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(nx, ny + 8, 34, 32, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (top === 'hoodie') {
    // Luva på ryggen, snören och magficka
    ctx.fillStyle = shade(c1, -0.15);
    ctx.beginPath(); ctx.ellipse(nx, ny - 30, 70, 62, 0, Math.PI, 0); ctx.lineTo(nx + 40, ny - 10);
    ctx.ellipse(nx, ny - 10, 40, 30, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const x of [nx - 14, nx + 14]) { ctx.beginPath(); ctx.moveTo(x, ny + 36); ctx.lineTo(x, ny + 90); ctx.stroke(); ellipse(ctx, x, ny + 92, 5, 5, '#ffffff'); }
    ctx.beginPath(); ctx.moveTo(250, 965); ctx.lineTo(270, 905); ctx.lineTo(374, 905); ctx.lineTo(394, 965); ctx.closePath();
    ctx.fillStyle = shade(c1, -0.12); ctx.fill();
  }
  if (top === 'klanning') {
    ctx.fillStyle = shade(c1, -0.15); ctx.fillRect(160, 940, 323, 14);
    if (look.print === 'ingen' || !look.print) for (const y of [960, 985]) ellipse(ctx, nx, y, 5, 5, '#ffffff');
  }
  // Tryck på bröstet
  if (look.print && look.print !== 'ingen') printMotif(ctx, look.print, nx, top === 'jacka' ? 870 : 862, look.printColor || (c2 === c1 ? contrast(c1) : c2));
}

/* =========================================================
   BYXOR
   ========================================================= */
function paintBottom(ctx, look) {
  const dress = look.top === 'klanning';
  const style = dress ? 'klanning' : (look.bottom || 'byxor');
  const col = dress ? look.topColor : look.bottomColor;
  const R = [611, 764, 413, 260];
  if (style === 'kjol' || style === 'klanning') {
    ctx.fillStyle = col; ctx.fillRect(611, 764, 413, 34);
    return;
  }
  const h = style === 'shorts' ? 130 : 260;
  ctx.fillStyle = col; ctx.fillRect(R[0], R[1], R[2], h);
  const dark = shade(col, -0.2);
  ctx.fillStyle = dark; ctx.fillRect(611, 764, 413, 20);              // linning
  if (style === 'shorts') { ctx.fillRect(611, 764 + h - 12, 413, 12); }
  else ctx.fillRect(611, 995, 413, 29);                              // fåll
  if (style === 'jeans') {
    ctx.strokeStyle = '#f2b45a'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
    for (const x of [640, 700, 760, 860, 920, 980]) { ctx.beginPath(); ctx.moveTo(x, 790); ctx.lineTo(x, 1000); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(611, 788); ctx.lineTo(1024, 788); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (style === 'byxor' || style === 'jeans') {
    for (const x of [660, 760, 870, 975]) ellipse(ctx, x, 890, 10, 4, shade(col, -0.1));
  }
}

function paintBelt(ctx, look) {
  const dress = look.top === 'klanning';
  if (dress || look.bottom === 'kjol' || look.top === 'jacka') return;
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
  const c = look.shoes;
  const boots = style === 'stovlar';
  ctx.fillStyle = boots ? shade(c, -0.1) : c;
  ctx.fillRect(639, 134, 185, 390);
  ctx.fillStyle = boots ? shade(c, -0.55) : '#eef0f6';
  ctx.fillRect(639, 0, 385, 134);                                      // sulor
  for (const oy of [0, 175]) {
    if (!boots) {
      ellipse(ctx, 727, 284 + oy, 42, 28, '#f6f6fa');                  // tåhätta
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(713, 214 + i * 11 + oy); ctx.lineTo(741, 214 + i * 11 + oy); ctx.stroke(); }
      roundRect(ctx, 691, 150 + oy, 78, 26, 10, shade(c, -0.25));        // fotöppning
    } else {
      ctx.fillStyle = shade(c, 0.15); ctx.fillRect(660, 178 + oy, 140, 10);
    }
    if (style === 'glitter') {
      for (let i = 0; i < 26; i++) {
        const x = 668 + ((i * 37) % 120), y = 170 + oy + ((i * 53) % 130);
        star(ctx, x, y, 4 + (i % 3), i % 2 ? '#ffffff' : '#ffe680', 4, 0.4);
      }
    }
  }
}

/* =========================================================
   Hela texturen
   ========================================================= */
export function paintSkin(look, gender, opts = {}) {
  const cv = opts.canvas || document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d');
  const sk = look.skin;
  ctx.fillStyle = sk; ctx.fillRect(0, 0, SIZE, SIZE);

  // Hals/haka – lite mörkare skugga
  roundRect(ctx, 232, 292, 180, 190, 40, shade(sk, -0.04));
  // Händer: lite rosa handflator
  ctx.fillStyle = shade(sk, -0.03); ctx.fillRect(824, 134, 200, 390);

  const h = paintHair(ctx, look);
  // Öron
  if (h.ears) for (const x of [190, 454]) {
    ellipse(ctx, x, 236, 16, 22, sk);
    ctx.strokeStyle = shade(sk, -0.15); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(x, 237, 8, 12, 0, -1.2, 1.9); ctx.stroke();
  }
  paintFace(ctx, look, gender, !!opts.blink);
  paintBottom(ctx, look);
  paintTop(ctx, look);
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
