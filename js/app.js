/* =========================================================
   Multiskolan – meny + "skapa din gubbe"
   ========================================================= */
(function () {
  const data = Save.load();
  const $ = id => document.getElementById(id);

  /* ---------- Val i designern ---------- */
  const OPT = {
    skin: ['#fcd9c4', '#f6b694', '#f59a78', '#d4875e', '#a5623c', '#6b3e26'],
    hair: [
      { id: 'kort', label: 'Kort', ic: '✂️' },
      { id: 'snaggad', label: 'Snaggad', ic: '🪒' },
      { id: 'lugg', label: 'Lugg', ic: '💇' },
      { id: 'lang', label: 'Långt', ic: '👸' },
      { id: 'page', label: 'Page', ic: '💁' },
      { id: 'hastsvans', label: 'Hästsvans', ic: '🐴' },
      { id: 'tofsar', label: 'Tofsar', ic: '🎀' },
      { id: 'knut', label: 'Knut', ic: '🍩' },
      { id: 'lockigt', label: 'Lockigt', ic: '🌀' },
      { id: 'flint', label: 'Flint', ic: '🥚' },
      { id: 'mohikan', label: 'Mohikan', ic: '🦔', price: 100 },
      { id: 'afro', label: 'Afro', ic: '☁️', price: 100 },
      { id: 'flata', label: 'Fläta', ic: '🥨', price: 100 },
      { id: 'dubbelknut', label: 'Dubbelknut', ic: '🐭', price: 100 },
      { id: 'spikigt', label: 'Spikigt', ic: '⚡', price: 100 },
      { id: 'langlockar', label: 'Långa lockar', ic: '🌊', price: 100 },
      { id: 'guldhar', label: 'Guldglöd-hår', ic: '✨', soon: 'guld' },
      { id: 'rosahar', label: 'Rosa glöd-hår', ic: '💖', soon: 'rosa' }
    ],
    hairColor: ['#1b1310', '#3b2316', '#6a4026', '#a8733f', '#e3c27a', '#b3471f', '#ff5ccf', '#3ee8ff', '#8a5cff'],
    eyes: ['#5b3a1e', '#8a5a2b', '#2f6db5', '#3f8a4a', '#7a8a99'],
    mouth: [
      { id: 'glad', label: 'Glad', ic: '🙂' },
      { id: 'flin', label: 'Flin', ic: '😁' },
      { id: 'liten', label: 'Oj!', ic: '😮' },
      { id: 'tunga', label: 'Tunga', ic: '😛' },
      { id: 'neutral', label: 'Lugn', ic: '😐' }
    ],
    extra: [
      { id: 'inga', label: 'Inget', ic: '➖' },
      { id: 'kinder', label: 'Rosa kinder', ic: '☺️' },
      { id: 'fraknar', label: 'Fräknar', ic: '🌟' },
      { id: 'glasogon', label: 'Glasögon', ic: '👓' },
      { id: 'solglasogon', label: 'Solglasögon', ic: '😎', price: 100 },
      { id: 'hjartglasogon', label: 'Hjärtglasögon', ic: '😍', price: 100 },
      { id: 'morrhar', label: 'Morrhår', ic: '🐱', price: 100 },
      { id: 'stjarnkinder', label: 'Stjärnkinder', ic: '⭐', price: 100 },
      { id: 'mustasch', label: 'Mustasch', ic: '🥸', price: 100 }
    ],
    top: [
      { id: 'tshirt', label: 'T-shirt', ic: '👕' },
      { id: 'langarm', label: 'Långärmad', ic: '👚' },
      { id: 'hoodie', label: 'Hoodie', ic: '🏂' },
      { id: 'jacka', label: 'Jacka', ic: '🧥' },
      { id: 'linne', label: 'Linne', ic: '🎽' },
      { id: 'klanning', label: 'Klänning', ic: '👗' },
      { id: 'pike', label: 'Piké', ic: '🎾', price: 100 },
      { id: 'vast', label: 'Väst', ic: '🦺', price: 100 },
      { id: 'fotboll', label: 'Fotbollströja', ic: '⚽', price: 100 },
      { id: 'superhjalte', label: 'Superhjälte', ic: '🦸', price: 100 },
      { id: 'regnjacka', label: 'Regnjacka', ic: '☔', price: 100 },
      { id: 'kofta', label: 'Kofta', ic: '🧶', price: 100 },
      { id: 'smoking', label: 'Smoking', ic: '🤵', price: 100 },
      { id: 'guldtroja', label: 'Guldglöd-tröja', ic: '✨', soon: 'guld' },
      { id: 'rosatroja', label: 'Rosa glöd-hoodie', ic: '💖', soon: 'rosa' }
    ],
    pattern: [
      { id: 'enfargad', label: 'Enfärgad', ic: '⬜' },
      { id: 'randig', label: 'Randig', ic: '〰️' },
      { id: 'prickig', label: 'Prickig', ic: '🔵' },
      { id: 'rutig', label: 'Rutig', ic: '🏁' },
      { id: 'stjarnor', label: 'Stjärnor', ic: '⭐' },
      { id: 'hjartan', label: 'Hjärtan', ic: '💗' },
      { id: 'zebra', label: 'Zebra', ic: '🦓', price: 100 },
      { id: 'leopard', label: 'Leopard', ic: '🐆', price: 100 },
      { id: 'kamo', label: 'Kamouflage', ic: '🪖', price: 100 },
      { id: 'regnbage', label: 'Regnbåge', ic: '🌈', price: 100 },
      { id: 'batik', label: 'Batik', ic: '🌀', price: 100 },
      { id: 'blommor', label: 'Blommor', ic: '🌼', price: 100 },
      { id: 'schack', label: 'Schackrutor', ic: '♟️', price: 100 },
      { id: 'dinos', label: 'Dinosaurier', ic: '🦕', price: 100 },
      { id: 'tassar', label: 'Tassar', ic: '🐾', price: 100 },
      { id: 'fiskar', label: 'Fiskar', ic: '🐟', price: 100 }
    ],
    print: [
      { id: 'ingen', label: 'Inget', ic: '➖' },
      { id: 'hjarta', label: 'Hjärta', ic: '❤️' },
      { id: 'stjarna', label: 'Stjärna', ic: '⭐' },
      { id: 'blixt', label: 'Blixt', ic: '⚡' },
      { id: 'regnbage', label: 'Regnbåge', ic: '🌈' },
      { id: 'smiley', label: 'Smiley', ic: '😊' },
      { id: 'blomma', label: 'Blomma', ic: '🌸' },
      { id: 'raket', label: 'Raket', ic: '🚀' },
      { id: 'planet', label: 'Planet', ic: '🪐' },
      { id: 'katt', label: 'Katt', ic: '🐱', price: 100 },
      { id: 'hund', label: 'Hund', ic: '🐶', price: 100 },
      { id: 'enhorning', label: 'Enhörning', ic: '🦄', price: 100 },
      { id: 'dino', label: 'Dino', ic: '🦖', price: 100 },
      { id: 'panda', label: 'Panda', ic: '🐼', price: 100 },
      { id: 'rav', label: 'Räv', ic: '🦊', price: 100 },
      { id: 'uggla', label: 'Uggla', ic: '🦉', price: 100 },
      { id: 'haj', label: 'Haj', ic: '🦈', price: 100 },
      { id: 'fjaril', label: 'Fjäril', ic: '🦋', price: 100 },
      { id: 'kanin', label: 'Kanin', ic: '🐰', price: 100 }
    ],
    bottom: [
      { id: 'byxor', label: 'Byxor', ic: '👖' },
      { id: 'jeans', label: 'Jeans', ic: '🧵' },
      { id: 'shorts', label: 'Shorts', ic: '🩳' },
      { id: 'kjol', label: 'Kjol', ic: '💃' },
      { id: 'cargo', label: 'Cargo', ic: '🎒', price: 100 },
      { id: 'leggings', label: 'Leggings', ic: '🧘', price: 100 },
      { id: 'mjukis', label: 'Mjukisbyxor', ic: '🛋️', price: 100 },
      { id: 'snickarbyxor', label: 'Snickarbyxor', ic: '👷', price: 100 },
      { id: 'rutiga', label: 'Rutiga byxor', ic: '🏁', price: 100 },
      { id: 'tutu', label: 'Tutu', ic: '🩰', price: 100 },
      { id: 'veckkjol', label: 'Veckkjol', ic: '🎐', price: 100 },
      { id: 'jeansshorts', label: 'Jeansshorts', ic: '✂️', price: 100 },
      { id: 'kostym', label: 'Kostymbyxor', ic: '🕴️', price: 100 },
      { id: 'guldbyxor', label: 'Guldglöd-byxor', ic: '✨', soon: 'guld' },
      { id: 'rosakjol', label: 'Rosa glöd-tutu', ic: '💖', soon: 'rosa' }
    ],
    shoeStyle: [
      { id: 'sneakers', label: 'Sneakers', ic: '👟' },
      { id: 'stovlar', label: 'Stövlar', ic: '👢' },
      { id: 'glitter', label: 'Glitter', ic: '✨' },
      { id: 'tofflor', label: 'Tofflor', ic: '🧸', price: 100 },
      { id: 'sandaler', label: 'Sandaler', ic: '🩴', price: 100 },
      { id: 'ballerina', label: 'Ballerina', ic: '🩰', price: 100 },
      { id: 'gummistovlar', label: 'Gummistövlar', ic: '☔', price: 100 },
      { id: 'kangor', label: 'Kängor', ic: '🥾', price: 100 },
      { id: 'fotbollsskor', label: 'Fotbollsskor', ic: '⚽', price: 100 },
      { id: 'rullskridskor', label: 'Rullskridskor', ic: '🛼', price: 100 },
      { id: 'foppa', label: 'Foppatofflor', ic: '🐊', price: 100 },
      { id: 'vinterkangor', label: 'Vinterkängor', ic: '⛄', price: 100 },
      { id: 'guldskor', label: 'Guldglöd-skor', ic: '✨', soon: 'guld' },
      { id: 'rosaskor', label: 'Rosa glöd-skor', ic: '💖', soon: 'rosa' }
    ],
    hat: [
      { id: 'ingen', label: 'Ingen', ic: '➖' },
      { id: 'keps', label: 'Keps', ic: '🧢' },
      { id: 'mossa', label: 'Mössa', ic: '❄️' },
      { id: 'krona', label: 'Krona', ic: '👑' },
      { id: 'rosett', label: 'Rosett', ic: '🎀' },
      { id: 'horlurar', label: 'Hörlurar', ic: '🎧' },
      { id: 'cowboy', label: 'Cowboyhatt', ic: '🤠', price: 100 },
      { id: 'trollkarl', label: 'Trollkarlshatt', ic: '🧙', price: 100 },
      { id: 'kattoron', label: 'Kattöron', ic: '🐱', price: 100 },
      { id: 'kaninoron', label: 'Kaninöron', ic: '🐰', price: 100 },
      { id: 'enhorning', label: 'Enhörning', ic: '🦄', price: 100 },
      { id: 'partyhatt', label: 'Partyhatt', ic: '🥳', price: 100 },
      { id: 'blomkrans', label: 'Blomkrans', ic: '🌸', price: 100 },
      { id: 'propeller', label: 'Propellerkeps', ic: '🚁', price: 100 },
      { id: 'hjalm', label: 'Rymdhjälm', ic: '🧑‍🚀', price: 100 },
      { id: 'tiara', label: 'Tiara', ic: '💎', price: 100 },
      { id: 'guldkrona', label: 'Guldglöd-krona', ic: '👑', soon: 'guld' },
      { id: 'rosatiara', label: 'Rosa glöd-tiara', ic: '💖', soon: 'rosa' }
    ],
    outfit: [
      { id: 'egen', label: 'Egen', ic: '✏️' },
      { id: 'skaterFemaleA', label: 'Skater-tjej', ic: '🛹' },
      { id: 'skaterMaleA', label: 'Skater-kille', ic: '🛼' },
      { id: 'cyborgFemaleA', label: 'Cyborg', ic: '🤖' },
      { id: 'criminalMaleA', label: 'Mustasch-Max', ic: '🥸' }
    ],
    cloth: ['#ff5ccf', '#3ee8ff', '#8dff5a', '#ffd84a', '#ff7a3d', '#8a5cff', '#e23b4e', '#2f6db5', '#ffffff', '#2a2f45']
  };
  const COMMON = { mouth: 'glad', extra: 'kinder', pattern: 'enfargad', topColor2: '#ffffff', printColor: '#ffffff', shoeStyle: 'sneakers', hat: 'ingen', hatColor: '#e23b4e', outfit: 'egen' };
  const DEFAULT_LOOK = {
    tjej: { ...COMMON, skin: '#f6b694', hair: 'lang', hairColor: '#a8733f', eyes: '#2f6db5', top: 'tshirt', topColor: '#ff5ccf', print: 'hjarta', bottom: 'kjol', bottomColor: '#8a5cff', shoes: '#ffffff' },
    kille: { ...COMMON, skin: '#f6b694', hair: 'kort', hairColor: '#6a4026', eyes: '#5b3a1e', top: 'hoodie', topColor: '#3ee8ff', print: 'blixt', printColor: '#ffd84a', bottom: 'jeans', bottomColor: '#2f6db5', shoes: '#e23b4e' }
  };
  const TABS = [
    { id: 'kropp', ic: '🧍', label: 'Kropp', focus: 'body' },
    { id: 'har', ic: '💇', label: 'Hår', focus: 'head' },
    { id: 'ansikte', ic: '😊', label: 'Ansikte', focus: 'eyes' },
    { id: 'troja', ic: '👕', label: 'Tröja', focus: 'top' },
    { id: 'byxor', ic: '👖', label: 'Byxor', focus: 'bottom' },
    { id: 'skor', ic: '👟', label: 'Skor', focus: 'shoes' },
    { id: 'hatt', ic: '🧢', label: 'Hatt', focus: 'hat' },
    { id: 'drakt', ic: '🦸', label: 'Dräkter', focus: 'body' },
    { id: 'prylar', ic: '🎒', label: 'Prylar', focus: 'body' }
  ];
  // Prylar som man tar med in i Guldmyntsjakten (tangent 1–4 där)
  const GEAR_PRICE = 1000;
  const GEAR = [
    { id: 'spade', ic: '🪏', label: 'Spade', key: 1, tip: 'Gräv efter skatter i Guldmyntsjakten.' },
    { id: 'yxa', ic: '🪓', label: 'Yxa', key: 2, tip: 'En stark yxa att ha i handen.' },
    { id: 'fjader', ic: '🪶', label: 'Fjäder', key: 3, tip: 'Du hoppar dubbelt så högt!' },
    { id: 'inlines', ic: '🛼', label: 'Inlines', key: 4, tip: 'Du springer dubbelt så snabbt!' },
    { id: 'spo', ic: '🎣', label: 'Fiskespö', key: 5, price: 500, tip: 'Ta med fiskespöt till sjöarna!' }
  ];

  /* ---------- Ljud ---------- */
  let ac;
  function tone(freq, dur = .15, type = 'sine', vol = .08, when = 0) {
    if (!data.settings.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime + when;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
    } catch (e) {}
  }
  const notes = [523, 659, 784, 1047];
  const chime = () => { tone(784, .12, 'sine', .07); tone(1047, .18, 'sine', .06, .08); };
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .08, i * .1));
  const pop = () => tone(660 + Math.random() * 200, .1, 'sine', .06);

  const soundBtn = $('sound');
  const paintSound = () => soundBtn.textContent = data.settings.sound ? '🔊' : '🔇';
  paintSound();
  soundBtn.onclick = () => { Save.update(d => d.settings.sound = !d.settings.sound); paintSound(); chime(); };

  /* ---------- Titel ---------- */
  const colors = ['#ff5ccf', '#3ee8ff', '#8dff5a', '#ffd84a'];
  'MULTISKOLAN'.split('').forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.color = colors[i % colors.length];
    s.style.animationDelay = (i * 0.12) + 's';
    $('title').appendChild(s);
  });

  /* ---------- Stjärnfält ---------- */
  const cv = $('stars'), ctx = cv.getContext('2d');
  let W, H, speed = 1, targetSpeed = 1;
  const stars = [];
  function resize() { W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio; }
  addEventListener('resize', resize); resize();
  const starColors = ['#ffffff', '#ffffff', '#ffd84a', '#3ee8ff', '#ff5ccf'];
  for (let i = 0; i < 220; i++) stars.push({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .5,
    v: Math.random() * .00025 + .00008, t: Math.random() * Math.PI * 2,
    c: starColors[Math.floor(Math.random() * starColors.length)]
  });
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x -= s.v * speed; s.t += .04;
      if (s.x < 0) { s.x = 1; s.y = Math.random(); }
      const a = .55 + Math.sin(s.t) * .45;
      ctx.globalAlpha = a; ctx.fillStyle = s.c;
      const r = s.r * devicePixelRatio;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, r, 0, Math.PI * 2); ctx.fill();
      if (speed > 3) { ctx.globalAlpha = a * .5; ctx.fillRect(s.x * W, s.y * H - r / 2, s.v * speed * W * 6, r); }
    }
    ctx.globalAlpha = 1;
    speed += (targetSpeed - speed) * .06;
    requestAnimationFrame(draw);
  })();

  /* ---------- Gnistor ---------- */
  function sparks(x, y, n = 10) {
    const sym = ['⭐', '✨', '💫', '🌟'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'spark'; s.textContent = sym[i % sym.length];
      s.style.left = x + 'px'; s.style.top = y + 'px';
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  }

  /* =========================================================
     MENY
     ========================================================= */
  const robot = $('robot'), bubble = $('bubble');
  const cur = () => Save.active();
  const defaultSay = () => cur() ? `Hej ${cur().name}! Vad vill du lära dig idag?` : 'Hej! Vad vill du lära dig idag?';
  const gen = n => /[sxz]$/i.test(n) ? n : n + 's';   // Hampus gubbe, Elsas gubbe
  const say = t => bubble.textContent = t;
  function happy(el = robot) { el.classList.remove('happy'); void el.getBoundingClientRect(); el.classList.add('happy'); }
  robot.addEventListener('click', () => {
    const n = cur() ? cur().name : '';
    const lines = ['Pip pip! Jag heter Bip!', 'Tryck på ett kort så kör vi!', `Du är jätteduktig${n ? ', ' + n : ''}!`, 'Rymden är full av bokstäver!'];
    say(lines[Math.floor(Math.random() * lines.length)]); happy(); fanfare();
  });
  // Admin: dubbelklicka på Bip → skriv "admingold" → välj hur mycket guld
  robot.addEventListener('dblclick', () => {
    const p = cur();
    if (!p) return;
    setTimeout(() => {
      const code = prompt('🔧 Admin-kod:');
      if (!code || code.trim().toLowerCase() !== 'admingold') { if (code) toast('❌ Fel kod'); return; }
      const amount = parseInt(prompt(`Hur många guldmynt ska ${p.name} få?`, '1000'), 10);
      if (!amount || amount < 0) return;
      Save.addCoins(p.id, amount);
      updateCoins();
      say(`Pling! ${p.name} fick ${amount} guldmynt! 🪙`); happy(); fanfare();
    }, 50);
  });

  const cards = [...document.querySelectorAll('.card')];
  const overlay = $('overlay'), panel = $('panel');
  let sel = -1;
  function select(i, sound = true) {
    sel = (i + cards.length) % cards.length;
    cards.forEach((c, j) => c.classList.toggle('sel', j === sel));
    say(cards[sel].dataset.say);
    if (sound) tone(notes[sel], .18, 'sine', .07);
  }
  cards.forEach((c, i) => {
    c.addEventListener('mouseenter', () => select(i));
    c.addEventListener('focus', () => select(i, false));
    c.addEventListener('mouseleave', () => { c.classList.remove('sel'); say(defaultSay()); });
    c.addEventListener('click', e => {
      const r = c.getBoundingClientRect();
      sparks(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
      launch(i);
    });
  });
  function launch(i) {
    const c = cards[i];
    $('panelTitle').textContent = c.dataset.name;
    panel.style.setProperty('--c', getComputedStyle(c).getPropertyValue('--c'));
    fanfare(); happy();
    targetSpeed = 25;
    if (c.dataset.href) { setTimeout(() => { location.href = c.dataset.href; }, 650); return; }
    setTimeout(() => overlay.classList.add('show'), 300);
  }
  function closeOverlay() { overlay.classList.remove('show'); targetSpeed = 1; chime(); say(defaultSay()); }
  $('back').onclick = closeOverlay;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

  /* ---------- Min gubbe i menyn ---------- */
  let meStage = null, meKey = '';
  const EMOTE_SAY = {
    vinka: n => `${n} vinkar hej! 👋`, dansa: n => `Snygga moves, ${n}! 💃`, flexa: n => 'Vilka muskler! 💪',
    snurra: () => 'Wiii! 🌀', heja: n => `Heja ${n}! 🎉`, buga: () => 'Tack, tack! 🙇', hoppa: () => 'Hopp! 🦘', spring: () => 'Brrrm! 🏃'
  };
  async function showMe() {
    const p = cur();
    if (!p) return;
    $('meName').textContent = p.name;
    const mod = await preload3D();
    if (!mod) return;
    if (!meStage) meStage = mod.createStage($('meCanvas'), {
      mini: true,
      onEmote: n => {
        if (sel >= 0 || !EMOTE_SAY[n] || Math.random() < 0.5 || overlay.classList.contains('show')) return;
        say(EMOTE_SAY[n](cur() ? cur().name : ''));
        clearTimeout(showMe.tm);
        showMe.tm = setTimeout(() => { if (sel < 0) say(defaultSay()); }, 3000);
      }
    });
    const look = { ...DEFAULT_LOOK[p.gender] || DEFAULT_LOOK.tjej, ...p.look };
    const key = JSON.stringify([p.id, p.gender, look]);
    if (key !== meKey) {
      meKey = key;
      try { await meStage.setLook(look, p.gender); } catch (e) { console.error(e); }
    }
    $('me').classList.add('show');
    document.body.classList.add('hasMe');
  }

  function showMenu() {
    document.body.classList.remove('onboarding');
    $('who').classList.remove('show');
    $('playerName').textContent = '👤 ' + cur().name;
    updateCoins();
    showMe();
    $('player').classList.add('show');
    say(defaultSay());
  }
  $('editAvatar').onclick = () => { chime(); openDesigner(cur().id); };
  $('switchPlayer').onclick = () => { chime(); openWho(); };

  /* ---------- Vem spelar? ---------- */
  const portraits = {};      // cache: id -> { key, url }
  function portraitFor(p, img) {
    const key = JSON.stringify([p.gender, p.look]);
    if (portraits[p.id] && portraits[p.id].key === key) { img.src = portraits[p.id].url; return; }
    preload3D().then(mod => {
      if (!mod || !mod.renderPortrait) return;
      mod.renderPortrait({ ...DEFAULT_LOOK[p.gender] || DEFAULT_LOOK.tjej, ...p.look }, p.gender, 256).then(url => {
        portraits[p.id] = { key, url };
        img.src = url;
      }).catch(e => console.error(e));
    });
  }
  function openWho() {
    const list = $('plist');
    list.innerHTML = '';
    const ps = Save.players();
    ps.forEach((p, i) => {
      const c = document.createElement('div');
      c.className = 'pcard' + (p.gender === 'tjej' ? ' girl' : '') + (p.id === data.activeId ? ' current' : '');
      c.style.animationDelay = (i * 0.07) + 's';
      c.setAttribute('role', 'button');
      c.innerHTML = `<div class="face"><img alt=""></div><b></b>
        <button class="mini edit" title="Ändra">✏️</button><button class="mini del" title="Ta bort">🗑️</button>`;
      c.querySelector('b').textContent = p.name;
      const img = c.querySelector('img');
      img.onerror = () => {};
      portraitFor(p, img);
      c.onclick = e => {
        sparks(e.clientX, e.clientY);
        fanfare();
        Save.setActive(p.id);
        showMenu();
        happy();
      };
      c.querySelector('.edit').onclick = e => { e.stopPropagation(); chime(); Save.setActive(p.id); openDesigner(p.id); };
      c.querySelector('.del').onclick = e => {
        e.stopPropagation();
        askConfirm(`Ta bort ${gen(p.name)} gubbe?`, 'Allt som är sparat för den gubben försvinner.', () => {
          Save.removePlayer(p.id);
          delete portraits[p.id];
          if (!Save.players().length) startNew(true); else openWho();
        });
      };
      list.appendChild(c);
    });
    if (ps.length < 12) {
      const add = document.createElement('button');
      add.className = 'pcard add';
      add.style.animationDelay = (ps.length * 0.07) + 's';
      add.innerHTML = '<div class="face">+</div><b>Ny gubbe</b>';
      add.onclick = e => { sparks(e.clientX, e.clientY); fanfare(); startNew(false); };
      list.appendChild(add);
    }
    $('whoClose').style.display = cur() ? '' : 'none';
    $('who').classList.add('show');
  }
  $('whoClose').onclick = () => { chime(); if (cur()) showMenu(); };

  let confirmFn = null;
  function askConfirm(title, text, fn) {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    confirmFn = fn;
    $('confirm').classList.add('show');
  }
  $('confirmNo').onclick = () => { $('confirm').classList.remove('show'); confirmFn = null; chime(); };
  $('confirmYes').onclick = () => { $('confirm').classList.remove('show'); const f = confirmFn; confirmFn = null; tone(300, .25, 'triangle', .07); f && f(); };

  /* =========================================================
     SKAPA DIN GUBBE
     ========================================================= */
  // Bip-robot i guidens steg
  document.querySelectorAll('.botslot').forEach(slot => {
    const r = robot.cloneNode(true);
    r.removeAttribute('id');
    r.addEventListener('click', () => { happy(r); fanfare(); });
    slot.replaceWith(r);
  });

  const steps = ['welcome', 'gender', 'name', 'design'];
  function goStep(name) {
    steps.forEach(s => $('step-' + s).classList.toggle('active', s === name));
    const i = steps.indexOf(name);
    [...$('dots').children].forEach((d, j) => d.classList.toggle('on', j <= i));
    $('dots').style.display = name === 'design' ? 'none' : 'flex';
    document.body.classList.toggle('designing', name === 'design');
  }

  const draft = { gender: null, name: '', look: null, editingId: null, trial: {} };

  // Ny gubbe: första gången visas välkomsten, annars börjar vi på tjej/kille
  function startNew(first) {
    draft.editingId = null;
    draft.name = '';
    nameInput.value = '';
    $('btnName').disabled = true;
    $('who').classList.remove('show');
    document.body.classList.add('onboarding');
    $('btnCancelNew').style.display = Save.players().length ? '' : 'none';
    goStep(first ? 'welcome' : 'gender');
    preload3D();
  }
  $('btnCancelNew').onclick = () => { chime(); document.body.classList.remove('onboarding'); openWho(); };

  $('btnStart').onclick = e => { sparks(e.clientX, e.clientY); fanfare(); goStep('gender'); preload3D(); };
  document.querySelectorAll('.gcard').forEach(b => b.onclick = e => {
    sparks(e.clientX, e.clientY);
    tone(b.dataset.gender === 'tjej' ? 784 : 523, .2, 'sine', .08);
    draft.gender = b.dataset.gender;
    draft.look = { ...DEFAULT_LOOK[draft.gender] };
    goStep('name');
    setTimeout(() => $('nameInput').focus(), 300);
  });
  $('btnBackGender').onclick = () => { chime(); goStep('gender'); };

  const nameInput = $('nameInput');
  nameInput.addEventListener('input', () => {
    $('btnName').disabled = !nameInput.value.trim();
    if (nameInput.value) pop();
  });
  const submitName = () => {
    const v = nameInput.value.trim();
    if (!v) return;
    draft.name = v.charAt(0).toUpperCase() + v.slice(1);
    fanfare();
    openDesigner(null);
  };
  $('btnName').onclick = submitName;
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  /* ---------- 3D ---------- */
  let stage = null, stagePromise = null;
  function preload3D() {
    if (!stagePromise) stagePromise = import('./avatar.js').then(m => { m.preload().catch(e => console.error(e)); return m; }).catch(err => { console.error(err); return null; });
    return stagePromise;
  }
  async function ensureStage() {
    if (stage) return stage;
    const mod = await preload3D();
    if (!mod) {
      $('loader').innerHTML = '<div>😕 3D-gubben kunde inte laddas.<br>Kolla internet och ladda om sidan.</div>';
      return null;
    }
    stage = mod.createStage($('avatarCanvas'));
    return stage;
  }
  function refresh(bounce = true) {
    if (!stage) return;
    stage.setLook(draft.look, draft.gender).then(() => { if (bounce) stage.bounce(); }).catch(e => console.error(e));
  }

  /* ---------- Designerns flikar ---------- */
  let tab = 'kropp';
  let gearShown = null;
  function renderTabs() {
    $('tabs').innerHTML = '';
    TABS.forEach(t => {
      const b = document.createElement('button');
      b.className = 'tab' + (t.id === tab ? ' on' : '');
      b.innerHTML = `<span>${t.ic}</span><small>${t.label}</small>`;
      b.onclick = () => {
        tab = t.id; tone(700, .08, 'sine', .05);
        if (tab !== 'prylar' && gearShown) { gearShown = null; stage && stage.showGear && stage.showGear(null); }
        renderTabs(); renderOpts(); stage && stage.focus(t.focus);
      };
      $('tabs').appendChild(b);
    });
  }
  /* ---------- Låsta saker (guldmynt) ---------- */
  const PRICE = 100;
  const owner = () => draft.editingId ? Save.get(draft.editingId) : null;
  const findItem = (key, id) => (OPT[key] || []).find(o => o.id === id);
  function isOwned(key, o) {
    if (!o || o.soon) return !o;
    if (!o.price) return true;
    const p = owner();
    return !!(p && p.unlocked.includes(key + ':' + o.id));
  }
  const myCoins = () => { const p = owner(); return p ? p.coins : 0; };
  function updateCoins() {
    $('coins').textContent = '🪙 ' + myCoins();
    const c = cur();
    $('playerCoins').textContent = '🪙 ' + (c ? c.coins : 0);
  }

  let shopItem = null;
  function openShop(key, o) {
    const gear = key === 'gear', PRICE = gear ? (o.price || GEAR_PRICE) : 100;
    shopItem = { key, o, price: PRICE };
    const soon = !!o.soon;
    $('shop').className = 'shop show' + (soon ? ' soon ' + o.soon : '');
    $('shopIc').textContent = o.ic;
    $('shopTitle').textContent = o.label;
    if (soon) {
      $('shopText').textContent = 'Den här exklusiva saken glöder! Den kommer snart.';
      $('shopPrice').textContent = '✨ Kommer snart';
    } else {
      const have = myCoins();
      $('shopText').textContent = (gear ? o.tip + ' Tryck ' + o.key + ' i Guldmyntsjakten för att ta på/av. ' : '') + (draft.editingId
        ? (have >= PRICE ? `Du har ${have} guldmynt.` : `Du har ${have} guldmynt. Hitta fler guldmynt i spelen!`)
        : 'Skapa klart din gubbe först, sedan kan du samla guldmynt i spelen!');
      $('shopPrice').textContent = `🔒 ${PRICE} 🪙`;
      $('shopBuy').disabled = !draft.editingId || have < PRICE;
    }
    $('shopBuy').style.display = soon ? 'none' : '';
    $('shopTry').style.display = soon || gear ? 'none' : '';
    tone(soon ? 988 : 660, .15, 'sine', .06);
  }
  const closeShop = () => { $('shop').className = 'shop'; shopItem = null; };
  $('shopClose').onclick = () => { chime(); closeShop(); };
  $('shop').addEventListener('click', e => { if (e.target === $('shop')) closeShop(); });
  $('shopTry').onclick = () => {
    if (!shopItem) return;
    const { key, o } = shopItem;
    if (!(key in draft.trial)) draft.trial[key] = draft.look[key];
    closeShop();
    setLook(key, o.id, true);
  };
  $('shopBuy').onclick = e => {
    if (!shopItem || !draft.editingId) return;
    const { key, o, price } = shopItem;
    if (Save.buy(draft.editingId, key + ':' + o.id, price)) {
      sparks(e.clientX, e.clientY, 14);
      fanfare();
      closeShop();
      updateCoins();
      if (key === 'gear') { toast(`🎉 ${o.label} är din! Tryck ${o.key} i Guldmyntsjakten.`); renderOpts(); return; }
      delete draft.trial[key];
      setLook(key, o.id);
    }
  };

  function setLook(key, val, trying = false) {
    if (!trying && isOwned(key, findItem(key, val))) delete draft.trial[key];
    draft.look[key] = val;
    if (key !== 'outfit' && key !== 'hat' && key !== 'hatColor') draft.look.outfit = 'egen';
    pop(); refresh(); renderOpts();
  }
  function note(text) { const n = document.createElement('div'); n.className = 'note'; n.textContent = text; return n; }
  function h4(text) { const h = document.createElement('h4'); h.textContent = text; return h; }
  function styleGrid(list, key) {
    const g = document.createElement('div');
    g.className = 'styles';
    list.forEach(o => {
      const b = document.createElement('button');
      const owned = isOwned(key, o);
      b.className = 'style' + (draft.look[key] === o.id ? ' on' : '') + (o.soon ? ' soon ' + o.soon : !owned ? ' locked' : '');
      b.innerHTML = `<span class="ic">${o.ic}</span>${o.label}` +
        (o.soon ? '<span class="tag soonTag">Kommer snart</span>' : !owned ? `<span class="tag">🔒 100 🪙</span>` : '');
      b.onclick = () => { if (!owned) openShop(key, o); else setLook(key, o.id); };
      g.appendChild(b);
    });
    return g;
  }
  function swatches(list, key) {
    const g = document.createElement('div');
    g.className = 'swatches';
    list.forEach(c => {
      const b = document.createElement('button');
      b.className = 'sw' + (draft.look[key] === c ? ' on' : '');
      b.style.background = c;
      b.setAttribute('aria-label', c);
      b.onclick = () => { setLook(key, c); };
      g.appendChild(b);
    });
    return g;
  }
  function renderOpts() {
    const o = $('opts');
    o.innerHTML = '';
    const L = draft.look;
    const preset = L.outfit && L.outfit !== 'egen';
    if (preset && !['drakt', 'hatt'].includes(tab)) o.append(note('🦸 Du har en färdig dräkt på dig. Väljer du något här byter du till din egen design.'));
    if (tab === 'kropp') {
      o.append(h4('Tjej eller kille'));
      const g = styleGrid([{ id: 'tjej', label: 'Tjej', ic: '👧' }, { id: 'kille', label: 'Kille', ic: '👦' }], '__gender');
      g.querySelectorAll('.style').forEach((b, i) => {
        const gg = i === 0 ? 'tjej' : 'kille';
        b.classList.toggle('on', draft.gender === gg);
        b.onclick = () => { draft.gender = gg; pop(); refresh(); renderOpts(); };
      });
      o.append(g, h4('Hudfärg'), swatches(OPT.skin, 'skin'));
    } else if (tab === 'har') {
      o.append(h4('Frisyr'), styleGrid(OPT.hair, 'hair'), h4('Hårfärg'), swatches(OPT.hairColor, 'hairColor'));
    } else if (tab === 'ansikte') {
      o.append(h4('Ögonfärg'), swatches(OPT.eyes, 'eyes'), h4('Mun'), styleGrid(OPT.mouth, 'mouth'), h4('Extra'), styleGrid(OPT.extra, 'extra'));
    } else if (tab === 'troja') {
      o.append(h4('Tröja'), styleGrid(OPT.top, 'top'), h4('Färg'), swatches(OPT.cloth, 'topColor'),
        h4('Mönster'), styleGrid(OPT.pattern, 'pattern'));
      if ((L.pattern && L.pattern !== 'enfargad') || L.top === 'jacka') o.append(h4(L.top === 'jacka' ? 'Färg på tröjan under / mönstret' : 'Mönsterfärg'), swatches(OPT.cloth, 'topColor2'));
      o.append(h4('Tryck'), styleGrid(OPT.print, 'print'));
      if (L.print && L.print !== 'ingen' && !['regnbage', 'smiley', 'raket'].includes(L.print)) o.append(h4('Tryckfärg'), swatches(OPT.cloth, 'printColor'));
    } else if (tab === 'byxor') {
      if (L.top === 'klanning') o.append(h4('Byxor'), note('👗 Klänningen täcker benen. Välj en annan tröja om du vill byta byxor.'));
      else o.append(h4('Byxor'), styleGrid(OPT.bottom, 'bottom'), h4('Färg'), swatches(OPT.cloth, 'bottomColor'));
    } else if (tab === 'skor') {
      o.append(h4('Skor'), styleGrid(OPT.shoeStyle, 'shoeStyle'), h4('Färg'), swatches(OPT.cloth, 'shoes'));
    } else if (tab === 'hatt') {
      o.append(h4('Huvudbonad'), styleGrid(OPT.hat, 'hat'));
      if (L.hat && !['ingen', 'krona'].includes(L.hat)) o.append(h4('Färg'), swatches(OPT.cloth, 'hatColor'));
    } else if (tab === 'drakt') {
      o.append(h4('Färdiga dräkter'), note('Välj "Egen" för att designa själv. Hattar går att ha till alla dräkter.'), styleGrid(OPT.outfit, 'outfit'));
    } else if (tab === 'prylar') {
      o.append(h4('Prylar till Guldmyntsjakten'), note(`Prylarna kostar ${GEAR_PRICE} 🪙 (fiskespöt 500 🪙). När du har köpt den trycker du på siffran i Guldmyntsjakten för att ta på den – tryck igen för att ta av.`));
      const g = document.createElement('div');
      g.className = 'styles';
      const p = owner();
      GEAR.forEach(it => {
        const owned = !!(p && p.unlocked.includes('gear:' + it.id));
        const b = document.createElement('button');
        b.className = 'style' + (gearShown === it.id ? ' on' : '') + (owned ? '' : ' locked');
        b.innerHTML = `<span class="ic">${it.ic}</span>${it.label}` +
          (owned ? `<span class="tag ownTag">✅ Tangent ${it.key}</span>` : `<span class="tag">🔒 ${it.price || GEAR_PRICE} 🪙</span>`);
        b.onclick = () => {
          gearShown = gearShown === it.id ? null : it.id;     // visa prylen på gubben
          stage && stage.showGear && stage.showGear(gearShown);
          pop(); renderOpts();
          if (!owned) openShop('gear', it);
        };
        g.appendChild(b);
      });
      o.append(g);
      const sel = GEAR.find(x => x.id === gearShown);
      if (sel) o.append(note(`${sel.ic} ${sel.label}: ${sel.tip}`));
    }
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const pickOwned = key => pick(OPT[key].filter(o => isOwned(key, o)));
  $('btnRandom').onclick = e => {
    sparks(e.clientX, e.clientY, 6);
    Object.assign(draft.look, {
      skin: pick(OPT.skin), hair: pickOwned('hair').id, hairColor: pick(OPT.hairColor), eyes: pick(OPT.eyes),
      mouth: pickOwned('mouth').id, extra: pickOwned('extra').id,
      top: pickOwned('top').id, topColor: pick(OPT.cloth), topColor2: pick(OPT.cloth),
      pattern: Math.random() < 0.5 ? 'enfargad' : pickOwned('pattern').id,
      print: Math.random() < 0.3 ? 'ingen' : pickOwned('print').id, printColor: pick(OPT.cloth),
      bottom: pickOwned('bottom').id, bottomColor: pick(OPT.cloth),
      shoeStyle: pickOwned('shoeStyle').id, shoes: pick(OPT.cloth),
      hat: Math.random() < 0.5 ? 'ingen' : pickOwned('hat').id, hatColor: pick(OPT.cloth),
      outfit: 'egen'
    });
    draft.trial = {};
    fanfare(); refresh(); renderOpts();
  };
  $('btnDone').onclick = async e => {
    sparks(e.clientX, e.clientY, 14);
    let reverted = 0;
    for (const key of Object.keys(draft.trial)) {
      const it = findItem(key, draft.look[key]);
      if (it && !isOwned(key, it)) { draft.look[key] = draft.trial[key]; reverted++; }
    }
    draft.trial = {};
    if (reverted) {
      toast('🔒 Saker du provade togs av. Lås upp dem med guldmynt!');
      if (stage) await stage.setLook(draft.look, draft.gender);
    }
    if (draft.editingId) {
      Save.updatePlayer(draft.editingId, p => { p.gender = draft.gender; p.look = { ...draft.look }; });
      Save.setActive(draft.editingId);
    } else {
      Save.addPlayer({ name: draft.name, gender: draft.gender, look: { ...draft.look } });
    }
    fanfare();
    $('cheer').textContent = `Snyggt, ${draft.name}! 🎉`;
    $('cheer').classList.add('show');
    if (stage) { stage.focus('body'); stage.wave(2.2); }
    setTimeout(() => {
      $('cheer').classList.remove('show');
      showMenu();
    }, 2400);
  };

  $('btnRun').onclick = () => {
    if (!stage) return;
    const running = stage.state === 'run';
    stage.play(running ? 'idle' : 'run');
    $('btnRun').textContent = running ? '🏃 Spring!' : '🧍 Stå still';
    tone(running ? 523 : 784, .12, 'sine', .06);
  };
  $('btnJump').onclick = () => { if (stage) { stage.bounce(); tone(880, .12, 'sine', .06); } };

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toast.tm);
    toast.tm = setTimeout(() => t.classList.remove('show'), 3800);
  }

  async function openDesigner(editId) {
    const editing = !!editId;
    draft.editingId = editId || null;
    draft.trial = {};
    const ep = editing ? Save.get(editId) : null;
    if (ep) {
      draft.name = ep.name;
      draft.gender = ep.gender;
      draft.look = { ...DEFAULT_LOOK[draft.gender], ...ep.look };
    }
    $('who').classList.remove('show');
    document.body.classList.add('onboarding');
    $('hello').textContent = editing ? `Ändra din gubbe, ${draft.name}!` : `Designa din gubbe, ${draft.name}!`;
    tab = 'kropp';
    updateCoins();
    renderTabs();
    renderOpts();
    goStep('design');
    const s = await ensureStage();
    $('btnRun').textContent = '🏃 Spring!';
    if (s) {
      try {
        await s.setLook(draft.look, draft.gender);
        $('loader').classList.add('hide');
      } catch (e) {
        console.error(e);
        $('loader').innerHTML = '<div>😕 Gubben kunde inte laddas.<br>Ladda om sidan och försök igen.</div>';
      }
      s.focus('body');
    }
  }

  // För föräldrar/test: Multiskolan.addCoins(500) i webbläsarens konsol
  window.Multiskolan = {
    addCoins(n = 100) {
      const p = cur();
      if (!p) return 'Ingen spelare vald';
      Save.addCoins(p.id, n);
      updateCoins();
      if (document.body.classList.contains('onboarding')) renderOpts();
      return Save.get(p.id).coins;
    },
    emote(name) { return meStage ? meStage.emote(name) : 0; },
    get _stages() { return { me: meStage, designer: stage }; }
  };

  /* ---------- Start ---------- */
  const ps = Save.players();
  if (!ps.length) {
    startNew(true);
  } else if (ps.length === 1) {
    if (!cur()) Save.setActive(ps[0].id);
    showMenu();
    preload3D();          // så att "Ändra" går snabbt
  } else {
    // Flera gubbar: fortsätt med den som spelade senast (byt uppe till vänster).
    // Bara om ingen är vald frågar vi vem som spelar.
    if (cur()) { showMenu(); preload3D(); }
    else openWho();
  }

  /* ---------- Tangentbord ---------- */
  addEventListener('keydown', e => {
    if (document.body.classList.contains('onboarding') || $('who').classList.contains('show') || $('confirm').classList.contains('show')) return;
    if (overlay.classList.contains('show')) {
      if (['Escape', 'Enter', ' ', 'Backspace'].includes(e.key)) { e.preventDefault(); closeOverlay(); }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'd') select(sel + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'a') select(sel < 0 ? 0 : sel - 1);
    else if ((e.key === 'Enter' || e.key === ' ') && sel >= 0) { e.preventDefault(); launch(sel); }
  });
})();
