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
      { id: 'flint', label: 'Flint', ic: '🥚' }
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
      { id: 'glasogon', label: 'Glasögon', ic: '👓' }
    ],
    top: [
      { id: 'tshirt', label: 'T-shirt', ic: '👕' },
      { id: 'langarm', label: 'Långärmad', ic: '👚' },
      { id: 'hoodie', label: 'Hoodie', ic: '🏂' },
      { id: 'jacka', label: 'Jacka', ic: '🧥' },
      { id: 'linne', label: 'Linne', ic: '🎽' },
      { id: 'klanning', label: 'Klänning', ic: '👗' }
    ],
    pattern: [
      { id: 'enfargad', label: 'Enfärgad', ic: '⬜' },
      { id: 'randig', label: 'Randig', ic: '🦓' },
      { id: 'prickig', label: 'Prickig', ic: '🔵' },
      { id: 'rutig', label: 'Rutig', ic: '🏁' },
      { id: 'stjarnor', label: 'Stjärnor', ic: '⭐' },
      { id: 'hjartan', label: 'Hjärtan', ic: '💗' }
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
      { id: 'planet', label: 'Planet', ic: '🪐' }
    ],
    bottom: [
      { id: 'byxor', label: 'Byxor', ic: '👖' },
      { id: 'jeans', label: 'Jeans', ic: '🧵' },
      { id: 'shorts', label: 'Shorts', ic: '🩳' },
      { id: 'kjol', label: 'Kjol', ic: '💃' }
    ],
    shoeStyle: [
      { id: 'sneakers', label: 'Sneakers', ic: '👟' },
      { id: 'stovlar', label: 'Stövlar', ic: '🥾' },
      { id: 'glitter', label: 'Glitter', ic: '✨' }
    ],
    hat: [
      { id: 'ingen', label: 'Ingen', ic: '➖' },
      { id: 'keps', label: 'Keps', ic: '🧢' },
      { id: 'mossa', label: 'Mössa', ic: '❄️' },
      { id: 'krona', label: 'Krona', ic: '👑' },
      { id: 'rosett', label: 'Rosett', ic: '🎀' },
      { id: 'horlurar', label: 'Hörlurar', ic: '🎧' }
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
    { id: 'drakt', ic: '🦸', label: 'Dräkter', focus: 'body' }
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
  const notes = [523, 659, 784];
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
    setTimeout(() => overlay.classList.add('show'), 300);
  }
  function closeOverlay() { overlay.classList.remove('show'); targetSpeed = 1; chime(); say(defaultSay()); }
  $('back').onclick = closeOverlay;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

  function showMenu() {
    document.body.classList.remove('onboarding');
    $('who').classList.remove('show');
    $('playerName').textContent = '👤 ' + cur().name;
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
  }

  const draft = { gender: null, name: '', look: null, editingId: null };

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
  function renderTabs() {
    $('tabs').innerHTML = '';
    TABS.forEach(t => {
      const b = document.createElement('button');
      b.className = 'tab' + (t.id === tab ? ' on' : '');
      b.innerHTML = `<span>${t.ic}</span><small>${t.label}</small>`;
      b.onclick = () => { tab = t.id; tone(700, .08, 'sine', .05); renderTabs(); renderOpts(); stage && stage.focus(t.focus); };
      $('tabs').appendChild(b);
    });
  }
  function setLook(key, val) {
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
      b.className = 'style' + (draft.look[key] === o.id ? ' on' : '');
      b.innerHTML = `<span class="ic">${o.ic}</span>${o.label}`;
      b.onclick = () => { setLook(key, o.id); };
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
    }
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  $('btnRandom').onclick = e => {
    sparks(e.clientX, e.clientY, 6);
    Object.assign(draft.look, {
      skin: pick(OPT.skin), hair: pick(OPT.hair).id, hairColor: pick(OPT.hairColor), eyes: pick(OPT.eyes),
      mouth: pick(OPT.mouth).id, extra: pick(OPT.extra).id,
      top: pick(OPT.top).id, topColor: pick(OPT.cloth), topColor2: pick(OPT.cloth),
      pattern: Math.random() < 0.5 ? 'enfargad' : pick(OPT.pattern).id,
      print: Math.random() < 0.3 ? 'ingen' : pick(OPT.print).id, printColor: pick(OPT.cloth),
      bottom: pick(OPT.bottom).id, bottomColor: pick(OPT.cloth),
      shoeStyle: pick(OPT.shoeStyle).id, shoes: pick(OPT.cloth),
      hat: Math.random() < 0.5 ? 'ingen' : pick(OPT.hat).id, hatColor: pick(OPT.cloth),
      outfit: 'egen'
    });
    fanfare(); refresh(); renderOpts();
  };
  $('btnDone').onclick = e => {
    sparks(e.clientX, e.clientY, 14);
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

  async function openDesigner(editId) {
    const editing = !!editId;
    draft.editingId = editId || null;
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

  /* ---------- Start ---------- */
  const ps = Save.players();
  if (!ps.length) {
    startNew(true);
  } else if (ps.length === 1) {
    if (!cur()) Save.setActive(ps[0].id);
    showMenu();
    preload3D();          // så att "Ändra" går snabbt
  } else {
    // Flera gubbar: fråga vem som spelar
    if (cur()) showMenu();
    openWho();
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
